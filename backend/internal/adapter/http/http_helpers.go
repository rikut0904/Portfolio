package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
)

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

func writeCacheHeader(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30")
}

func toISO(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func (h *Handler) logAdmin(ctx context.Context, action, entity, entityID, level string, user *auth.Claims, details any) {
	if level == "" {
		level = "info"
	}
	if details == nil {
		details = map[string]any{}
	}
	_, _ = h.store.Pool.Exec(ctx, `
		INSERT INTO "adminLogs" (id, action, entity, "entityId", "userId", "userEmail", level, details, "createdAt")
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb, NOW())
	`, fmt.Sprintf("log_%d", time.Now().UnixNano()), action, nullable(entity), nullable(entityID), nullable(user.UID), nullable(user.Email), level, mustJSON(details))
	_, _ = h.store.Pool.Exec(ctx, `DELETE FROM "adminLogs" WHERE "createdAt" < NOW() - INTERVAL '2 months'`)
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

// products
