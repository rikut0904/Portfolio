package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
)

type AppError struct {
	Status  int    `json:"-"`
	Message string `json:"error"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func NewAppError(status int, message string, err error) *AppError {
	return &AppError{
		Status:  status,
		Message: message,
		Err:     err,
	}
}

func decodeBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	b, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		return err
	}
	if len(strings.TrimSpace(string(b))) == 0 {
		return errors.New("empty body")
	}
	return json.Unmarshal(b, dst)
}

func postJSON(ctx context.Context, endpoint string, body any) (map[string]any, int, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(payload)))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, res.StatusCode, err
	}
	out := map[string]any{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &out)
	}
	return out, res.StatusCode, nil
}

func postForm(ctx context.Context, endpoint string, body string) (map[string]any, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, res.StatusCode, err
	}
	out := map[string]any{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &out)
	}
	return out, res.StatusCode, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func handleError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	var appErr *AppError
	if errors.As(err, &appErr) {
		if appErr.Status >= 500 {
			log.Printf("Internal Server Error: %v", appErr)
		}
		writeJSON(w, appErr.Status, appErr)
		return
	}

	log.Printf("Unhandled error: %v", err)
	writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Internal Server Error"})
}

func writeCacheHeader(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30")
}

func toISO(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func (h *BaseHandler) logAdmin(ctx context.Context, action, entity, entityID, level string, user *auth.Claims, details any) {
	if level == "" {
		level = "info"
	}

	b, _ := json.Marshal(details)
	if len(b) == 0 || string(b) == "null" {
		b = []byte("{}")
	}

	logEntry := postgres.AdminLogModel{
		ID:        fmt.Sprintf("log_%d", time.Now().UnixNano()),
		Action:    action,
		Entity:    ptr(entity),
		EntityID:  ptr(entityID),
		UserID:    ptr(user.UID),
		UserEmail: ptr(user.Email),
		Level:     level,
		Details:   b,
	}

	_ = h.store.DB.WithContext(ctx).Create(&logEntry)
	_ = h.store.DB.WithContext(ctx).Where("created_at < ?", time.Now().AddDate(0, -2, 0)).Delete(&postgres.AdminLogModel{})
}

func ptr(v string) *string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return &v
}

func nullable(v string) any {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{}`
	}
	if string(b) == "null" {
		return `{}`
	}
	return string(b)
}

func normalizeVisibilityStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "public", "published", "open", "active", "visible", "公開":
		return "公開"
	case "private", "draft", "hidden", "inactive", "非公開":
		return "非公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeDeployStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "deployed", "live", "production", "公開中":
		return "公開中"
	case "undeployed", "not_deployed", "draft", "staging", "未公開":
		return "未公開"
	default:
		return strings.TrimSpace(v)
	}
}
