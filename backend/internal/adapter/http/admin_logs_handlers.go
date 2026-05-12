package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
)

func (h *AdminLogHandler) createAuthLog(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	action := normalize(body["action"])
	if action != "login" && action != "logout" {
		return NewAppError(http.StatusBadRequest, "Invalid action", nil)
	}
	h.logAdmin(r.Context(), action, "auth", "", "info", user, map[string]any{"userAgent": r.Header.Get("User-Agent")})
	writeJSON(w, http.StatusCreated, map[string]any{"success": true})
	return nil
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

func (h *AdminLogHandler) getAdminLogs(w http.ResponseWriter, r *http.Request, _ *auth.Claims) error {
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

	var models []postgres.AdminLogModel
	if err := query.Order(`"createdAt" DESC, id DESC`).Limit(limit).Find(&models).Error; err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch admin logs", err)
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
		if m.Entity != nil && *m.Entity != "" {
			log["entity"] = *m.Entity
		}
		if m.EntityID != nil && *m.EntityID != "" {
			log["entityId"] = *m.EntityID
		}
		if m.UserID != nil && *m.UserID != "" {
			log["userId"] = *m.UserID
		}
		if m.UserEmail != nil && *m.UserEmail != "" {
			log["userEmail"] = *m.UserEmail
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
	return nil
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
