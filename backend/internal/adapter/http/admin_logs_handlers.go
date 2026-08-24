package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"portfolio-backend/internal/domain/adminlog"
	"portfolio-backend/internal/infrastructure/auth"
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

func (h *AdminLogHandler) getAdminLogs(w http.ResponseWriter, r *http.Request, _ *auth.Claims) error {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 10)
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	result, err := h.usecase.List(r.Context(), adminlog.ListInput{Limit: limit, Cursor: strings.TrimSpace(r.URL.Query().Get("cursor"))})
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch admin logs", err)
	}

	logs := make([]map[string]any, 0, len(result.Logs))
	for _, m := range result.Logs {
		log := map[string]any{
			"id": m.ID, "action": m.Action, "level": m.Level, "createdAt": m.CreatedAt,
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
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs, "nextCursor": result.NextCursor})
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
