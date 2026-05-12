package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
)

type adminLogModel struct {
	ID        string          `gorm:"column:id;primaryKey"`
	Action    string          `gorm:"column:action"`
	Entity    string          `gorm:"column:entity"`
	EntityID  string          `gorm:"column:entityId"`
	UserID    string          `gorm:"column:userId"`
	UserEmail string          `gorm:"column:userEmail"`
	Level     string          `gorm:"column:level"`
	Details   json.RawMessage `gorm:"column:details;type:jsonb"`
	CreatedAt time.Time       `gorm:"column:createdAt"`
}

func (adminLogModel) TableName() string {
	return "adminLogs"
}

func (h *Handler) createAuthLog(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	action := normalize(body["action"])
	if action != "login" && action != "logout" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid action"})
		return
	}
	h.logAdmin(r.Context(), action, "auth", "", "info", user, map[string]any{"userAgent": r.Header.Get("User-Agent")})
	writeJSON(w, http.StatusCreated, map[string]any{"success": true})
}

type cursor struct {
	CreatedAt string `json:"createdAt"`
	ID        string `json:"id"`
}

func encodeCursor(c cursor) string {
	b, _ := json.Marshal(c)
	return base64.StdEncoding.EncodeToString(b)
}

func decodeCursor(v string) (cursor, bool) {
	b, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		return cursor{}, false
	}
	var c cursor
	if err := json.Unmarshal(b, &c); err != nil {
		return cursor{}, false
	}
	if c.CreatedAt == "" || c.ID == "" {
		return cursor{}, false
	}
	return c, true
}

func (h *Handler) getAdminLogs(w http.ResponseWriter, r *http.Request, _ *auth.Claims) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 10)
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	cursorParam := strings.TrimSpace(r.URL.Query().Get("cursor"))

	query := h.store.DB.WithContext(r.Context())
	if cursorParam != "" {
		if c, ok := decodeCursor(cursorParam); ok {
			query = query.Where(`("createdAt", id) < (?, ?)`, c.CreatedAt, c.ID)
		}
	}

	var models []adminLogModel
	if err := query.Order(`"createdAt" DESC, id DESC`).Limit(limit).Find(&models).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin logs"})
		return
	}

	logs := make([]map[string]any, 0, len(models))
	var lastCreatedAt time.Time
	var lastID string
	for _, m := range models {
		log := map[string]any{
			"id":        m.ID,
			"action":    m.Action,
			"level":     m.Level,
			"createdAt": toISO(m.CreatedAt),
		}
		if m.Entity != "" {
			log["entity"] = m.Entity
		}
		if m.EntityID != "" {
			log["entityId"] = m.EntityID
		}
		if m.UserID != "" {
			log["userId"] = m.UserID
		}
		if m.UserEmail != "" {
			log["userEmail"] = m.UserEmail
		}
		if len(m.Details) > 0 && string(m.Details) != "{}" {
			log["details"] = m.Details
		}
		logs = append(logs, log)
		lastCreatedAt, lastID = m.CreatedAt, m.ID
	}

	nextCursor := any(nil)
	if len(logs) == limit {
		nextCursor = encodeCursor(cursor{CreatedAt: toISO(lastCreatedAt), ID: lastID})
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs, "nextCursor": nextCursor})
}

func parseIntDefault(v string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil {
		return fallback
	}
	return n
}

func splitCSV(v string) []string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func hasAny(arr, wanted []string) bool {
	if len(arr) == 0 || len(wanted) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(arr))
	for _, v := range arr {
		set[v] = struct{}{}
	}
	for _, w := range wanted {
		if _, ok := set[w]; ok {
			return true
		}
	}
	return false
}

func parseStringArrayJSON(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err != nil {
		return []string{}
	}
	return arr
}
