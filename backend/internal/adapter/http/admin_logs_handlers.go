package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"portfolio-backend/internal/auth"
)

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

	base := `
		SELECT id, action, COALESCE(entity,''), COALESCE("entityId",''), COALESCE("userId",''), COALESCE("userEmail",''), level,
		COALESCE(details,'{}'::jsonb), "createdAt"
		FROM "adminLogs"
	`
	args := []any{}
	where := ""
	if cursorParam != "" {
		if c, ok := decodeCursor(cursorParam); ok {
			where = ` WHERE ("createdAt", id) < ($1::timestamptz, $2::text) `
			args = append(args, c.CreatedAt, c.ID)
		}
	}
	query := base + where + fmt.Sprintf(` ORDER BY "createdAt" DESC, id DESC LIMIT %d`, limit)
	rows, err := h.store.Pool.Query(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin logs"})
		return
	}
	defer rows.Close()

	logs := make([]map[string]any, 0)
	var lastCreatedAt time.Time
	var lastID string
	for rows.Next() {
		var id, action, entity, entityID, userID, userEmail, level string
		var details []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &action, &entity, &entityID, &userID, &userEmail, &level, &details, &createdAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin logs"})
			return
		}
		log := map[string]any{
			"id":        id,
			"action":    action,
			"level":     level,
			"createdAt": toISO(createdAt),
		}
		if entity != "" {
			log["entity"] = entity
		}
		if entityID != "" {
			log["entityId"] = entityID
		}
		if userID != "" {
			log["userId"] = userID
		}
		if userEmail != "" {
			log["userEmail"] = userEmail
		}
		if string(details) != "{}" {
			log["details"] = json.RawMessage(details)
		}
		logs = append(logs, log)
		lastCreatedAt, lastID = createdAt, id
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
