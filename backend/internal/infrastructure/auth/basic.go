package auth

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"
)

// Claims is the authenticated administrator identity used by the HTTP layer.
type Claims struct {
	UID   string
	Email string
}

// Verifier validates the single administrator account configured for this service.
// Basic authentication must only be used over HTTPS outside local development.
type Verifier struct {
	username string
	password string
	email    string
}

func NewVerifier(username, password, email string) (*Verifier, error) {
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)
	if username == "" || password == "" {
		return nil, errors.New("BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD are required")
	}
	if strings.Contains(username, ":") {
		return nil, errors.New("BASIC_AUTH_USERNAME must not contain ':'")
	}
	if email = strings.TrimSpace(email); email == "" {
		email = username
	}
	return &Verifier{username: username, password: password, email: email}, nil
}

func (v *Verifier) VerifyCredentials(username, password string) (*Claims, error) {
	if v == nil || subtle.ConstantTimeCompare([]byte(username), []byte(v.username)) != 1 || subtle.ConstantTimeCompare([]byte(password), []byte(v.password)) != 1 {
		return nil, errors.New("invalid credentials")
	}
	return &Claims{UID: v.username, Email: v.email}, nil
}

func (v *Verifier) VerifyRequest(r *http.Request) (*Claims, error) {
	username, password, ok := r.BasicAuth()
	if !ok {
		return nil, errors.New("missing basic authentication")
	}
	return v.VerifyCredentials(username, password)
}
