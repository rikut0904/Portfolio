package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type Claims struct {
	UID   string
	Email string
}

type Verifier struct {
	client      *auth.Client
	adminEmails map[string]struct{}
	adminUIDs   map[string]struct{}
}

func NewVerifier(ctx context.Context, serviceAccountJSON string, projectID string, adminEmails map[string]struct{}, adminUIDs map[string]struct{}) (*Verifier, error) {
	if strings.TrimSpace(serviceAccountJSON) == "" {
		return nil, errors.New("FIREBASE_SERVICE_ACCOUNT_KEY is required")
	}

	opt, err := firebaseOptionFromRawJSON(serviceAccountJSON)
	if err != nil {
		return nil, fmt.Errorf("firebase credentials: %w", err)
	}

	cfg := &firebase.Config{}
	if strings.TrimSpace(projectID) != "" {
		cfg.ProjectID = strings.TrimSpace(projectID)
	}

	app, err := firebase.NewApp(ctx, cfg, opt)
	if err != nil {
		return nil, fmt.Errorf("init firebase app: %w", err)
	}
	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("init firebase auth client: %w", err)
	}

	return &Verifier{client: client, adminEmails: adminEmails, adminUIDs: adminUIDs}, nil
}

func firebaseOptionFromRawJSON(raw string) (option.ClientOption, error) {
	var js map[string]any
	if err := json.Unmarshal([]byte(raw), &js); err != nil {
		return nil, err
	}
	if pk, ok := js["private_key"].(string); ok {
		js["private_key"] = strings.ReplaceAll(pk, `\\n`, "\n")
	}
	buf, err := json.Marshal(js)
	if err != nil {
		return nil, err
	}
	return option.WithCredentialsJSON(buf), nil
}

func (v *Verifier) VerifyRequest(r *http.Request) (*Claims, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(header, "Bearer ") {
		return nil, errors.New("missing bearer token")
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == "" {
		return nil, errors.New("missing bearer token")
	}
	return v.VerifyToken(r.Context(), token)
}

func (v *Verifier) VerifyToken(ctx context.Context, token string) (*Claims, error) {
	decoded, err := v.client.VerifyIDToken(ctx, token)
	if err != nil {
		return nil, err
	}
	claims := &Claims{UID: decoded.UID}
	if email, ok := decoded.Claims["email"].(string); ok {
		claims.Email = email
	}

	if len(v.adminUIDs) > 0 || len(v.adminEmails) > 0 {
		if _, ok := v.adminUIDs[strings.ToLower(claims.UID)]; ok {
			return claims, nil
		}
		if _, ok := v.adminEmails[strings.ToLower(claims.Email)]; ok {
			return claims, nil
		}
		return nil, errors.New("forbidden")
	}

	return claims, nil
}
