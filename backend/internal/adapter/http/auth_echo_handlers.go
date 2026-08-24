package httpapi

import (
	"context"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"

	"github.com/labstack/echo/v4"
)

func (h *BaseHandler) getAppModeEcho(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{"appMode": h.appMode})
}

func (h *BaseHandler) loginEcho(c echo.Context) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"` // compatibility with the previous login form
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
	}
	username := strings.TrimSpace(body.Username)
	if username == "" {
		username = strings.TrimSpace(body.Email)
	}
	password := strings.TrimSpace(body.Password)
	if username == "" || password == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "username and password are required"})
	}
	claims, err := h.verifier.VerifyCredentials(username, password)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": "Invalid username or password"})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *BaseHandler) meEcho(c echo.Context, user *auth.Claims) error {
	return c.JSON(http.StatusOK, map[string]any{
		"user": map[string]any{
			"uid":   user.UID,
			"email": user.Email,
		},
	})
}

func (h *BaseHandler) meEchoFromContext(c echo.Context) error {
	claims, _ := c.Get(adminClaimsContextKey).(*auth.Claims)
	if claims == nil {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": http.StatusText(http.StatusUnauthorized)})
	}
	return h.meEcho(c, claims)
}

func (h *BaseHandler) withAdminEcho(next func(echo.Context, *auth.Claims) error) echo.HandlerFunc {
	return func(c echo.Context) error {
		claims, err := h.verifier.VerifyRequest(c.Request())
		if err != nil {
			status := http.StatusUnauthorized
			if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
				status = http.StatusForbidden
			}
			return c.JSON(status, map[string]any{"error": http.StatusText(status)})
		}
		return next(c, claims)
	}
}

func (h *BaseHandler) handleHealthEcho(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
	defer cancel()
	if h.healthChecker == nil || h.healthChecker.Ping(ctx) != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]any{"ok": false})
	}
	return c.JSON(http.StatusOK, map[string]any{"ok": true})
}
