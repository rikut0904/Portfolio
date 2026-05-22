package v2

import (
	"context"
	"encoding/json"
	"log"
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humaecho"
	"github.com/google/uuid"
)

// GetClaims extracts admin claims from the Huma/Echo context.
func GetClaims(ctx context.Context) *auth.Claims {
	if humaCtx, ok := ctx.(huma.Context); ok {
		echoCtx := humaecho.Unwrap(humaCtx)
		if claims, ok := echoCtx.Get("adminClaims").(*auth.Claims); ok {
			return claims
		}
	}
	return nil
}

// LogAdminActivity records an administrative action in the database.
func (h *Handler) LogAdminActivity(ctx context.Context, action, entity, entityID, level string, user *auth.Claims, details any) {
	if user == nil {
		log.Printf("Warning: LogAdminActivity called without user context for action=%s entity=%s", action, entity)
		return
	}

	if level == "" {
		level = "info"
	}

	b, _ := json.Marshal(details)
	if len(b) == 0 || string(b) == "null" {
		b = []byte("{}")
	}

	logEntry := postgres.AdminLogModel{
		ID:        uuid.New().String(),
		Action:    action,
		Entity:    ptr(entity),
		EntityID:  ptr(entityID),
		UserID:    ptr(user.UID),
		UserEmail: ptr(user.Email),
		Level:     level,
		Details:   b,
	}

	// Note: Directly using store for logging is common in adapters
	_ = h.store.DB.WithContext(ctx).Create(&logEntry)
}

// ToISO formats a time to RFC3339 string.
func ToISO(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func ptr(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

// Common output types for v2 handlers
type SuccessStatusOutput struct {
	Body struct {
		Success bool `json:"success" doc:"Whether the operation was successful"`
	}
}

type MessageOutput struct {
	Body struct {
		Message string `json:"message" doc:"Status message"`
	}
}
