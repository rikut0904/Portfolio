package httpapi

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
)

func (h *BaseHandler) getAppMode(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"appMode": h.appMode,
	})
}

// auth endpoints

func (h *BaseHandler) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	email := strings.TrimSpace(body.Email)
	password := strings.TrimSpace(body.Password)
	if email == "" || password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "email and password are required"})
		return
	}

	if h.firebaseWebAPIKey == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
		return
	}

	respBody, status, err := postJSON(
		r.Context(),
		fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		map[string]any{
			"email":             email,
			"password":          password,
			"returnSecureToken": true,
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to login"})
		return
	}
	if status >= 400 {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
		return
	}

	idToken, _ := respBody["idToken"].(string)
	refreshToken, _ := respBody["refreshToken"].(string)
	expiresIn, _ := respBody["expiresIn"].(string)
	if idToken == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
		return
	}
	claims, err := h.verifier.VerifyToken(r.Context(), idToken)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"error": "Unauthorized"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *BaseHandler) refreshToken(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	token := strings.TrimSpace(body.RefreshToken)
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "refreshToken is required"})
		return
	}

	if h.firebaseWebAPIKey == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
		return
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", token)
	respBody, status, err := postForm(
		r.Context(),
		fmt.Sprintf("https://securetoken.googleapis.com/v1/token?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		form.Encode(),
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to refresh token"})
		return
	}
	if status >= 400 {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
		return
	}
	idToken, _ := respBody["id_token"].(string)
	refreshToken, _ := respBody["refresh_token"].(string)
	expiresIn, _ := respBody["expires_in"].(string)
	if idToken == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
		return
	}
	claims, err := h.verifier.VerifyToken(r.Context(), idToken)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"error": "Unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *BaseHandler) me(w http.ResponseWriter, _ *http.Request, user *auth.Claims) {
	writeJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"uid":   user.UID,
			"email": user.Email,
		},
	})
}

func (h *BaseHandler) withAdmin(next func(http.ResponseWriter, *http.Request, *auth.Claims)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := h.verifier.VerifyRequest(r)
		if err != nil {
			status := http.StatusUnauthorized
			if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
				status = http.StatusForbidden
			}
			writeJSON(w, status, map[string]any{"error": http.StatusText(status)})
			return
		}
		next(w, r, claims)
	}
}

func (h *BaseHandler) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	sqlDB, err := h.store.DB.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
