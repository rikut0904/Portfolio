package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"portfolio-backend/internal/auth"

	"github.com/labstack/echo/v4"
)

func (h *Handler) getAppModeEcho(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{"appMode": h.appMode})
}

func (h *Handler) loginEcho(c echo.Context) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
	}
	email := strings.TrimSpace(body.Email)
	password := strings.TrimSpace(body.Password)
	if email == "" || password == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "email and password are required"})
	}
	if h.firebaseWebAPIKey == "" {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
	}

	respBody, status, err := postJSON(
		c.Request().Context(),
		fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		map[string]any{"email": email, "password": password, "returnSecureToken": true},
	)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]any{"error": "Failed to login"})
	}
	if status >= 400 {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
	}

	idToken, _ := respBody["idToken"].(string)
	refreshToken, _ := respBody["refreshToken"].(string)
	expiresIn, _ := respBody["expiresIn"].(string)
	if idToken == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
	}
	claims, err := h.verifier.VerifyToken(c.Request().Context(), idToken)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"error": "Unauthorized"})
	}

	return c.JSON(http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *Handler) refreshTokenEcho(c echo.Context) error {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
	}
	token := strings.TrimSpace(body.RefreshToken)
	if token == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"error": "refreshToken is required"})
	}
	if h.firebaseWebAPIKey == "" {
		return c.JSON(http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", token)
	respBody, status, err := postForm(
		c.Request().Context(),
		fmt.Sprintf("https://securetoken.googleapis.com/v1/token?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		form.Encode(),
	)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]any{"error": "Failed to refresh token"})
	}
	if status >= 400 {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
	}
	idToken, _ := respBody["id_token"].(string)
	refreshToken, _ := respBody["refresh_token"].(string)
	expiresIn, _ := respBody["expires_in"].(string)
	if idToken == "" {
		return c.JSON(http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
	}
	claims, err := h.verifier.VerifyToken(c.Request().Context(), idToken)
	if err != nil {
		return c.JSON(http.StatusForbidden, map[string]any{"error": "Unauthorized"})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *Handler) meEcho(c echo.Context, user *auth.Claims) error {
	return c.JSON(http.StatusOK, map[string]any{
		"user": map[string]any{
			"uid":   user.UID,
			"email": user.Email,
		},
	})
}

func (h *Handler) withAdminEcho(next func(echo.Context, *auth.Claims) error) echo.HandlerFunc {
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

func (h *Handler) handleHealthEcho(c echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
	defer cancel()
	if err := h.store.Pool.Ping(ctx); err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]any{"ok": false})
	}
	return c.JSON(http.StatusOK, map[string]any{"ok": true})
}
