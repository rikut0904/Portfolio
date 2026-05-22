package v2

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"portfolio-backend/internal/domain"
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

	_ = h.store.DB.WithContext(ctx).Create(&logEntry)
}

// ToISO formats a time to RFC3339 string.
func ToISO(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

// MapError converts a domain error to a Huma error.
// This allows usecases to be independent of HTTP status codes.
func MapError(err error) error {
	if err == nil {
		return nil
	}

	// Check for wrapped DomainError
	var domainErr *domain.DomainError
	code := err
	message := err.Error()

	if errors.As(err, &domainErr) {
		code = domainErr.Code
		message = domainErr.Message
		if message == "" {
			message = code.Error()
		}
	}

	switch {
	case errors.Is(code, domain.ErrNotFound):
		return huma.Error404NotFound(message, err)
	case errors.Is(code, domain.ErrAlreadyExists):
		return huma.Error409Conflict(message, err)
	case errors.Is(code, domain.ErrInvalidInput):
		return huma.Error400BadRequest(message, err)
	case errors.Is(code, domain.ErrUnauthorized):
		return huma.Error401Unauthorized(message, err)
	case errors.Is(code, domain.ErrForbidden):
		return huma.Error403Forbidden(message, err)
	case errors.Is(code, domain.ErrServiceUnavailable):
		return huma.Error503ServiceUnavailable(message, err)
	case errors.Is(code, domain.ErrNotImplemented):
		return huma.Error501NotImplemented(message, err)
	default:
		return huma.Error500InternalServerError("An unexpected error occurred", err)
	}
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
