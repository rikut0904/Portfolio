package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                string
	AppMode             bool
	DatabaseURL         string
	ReadTimeout         time.Duration
	WriteTimeout        time.Duration
	AllowedOrigins      []string
	AllowCredentials    bool
	FirebaseProjectID   string
	FirebaseWebAPIKey   string
	FirebaseCredentials string
	MailFrom            string
	MailTo              []string
	MailRetryMax        int
	MailRetryIntervalMS int
	AWSRegion           string
	AWSAccessKeyID      string
	AWSSecretAccessKey  string
	SESConfigurationSet string
	GitHubToken         string
	GitHubOwner         string
	GitHubRepo          string
	GitHubBranch        string
	AdminEmails         map[string]struct{}
	AdminUIDs           map[string]struct{}
}

func Load() (Config, error) {
	cfg := Config{
		Port:                getEnv("PORT", "8080"),
		AppMode:             getEnvBool("APP_MODE", false),
		DatabaseURL:         strings.TrimSpace(os.Getenv("DATABASE_URL")),
		ReadTimeout:         time.Duration(getEnvInt("READ_TIMEOUT_SEC", 15)) * time.Second,
		WriteTimeout:        time.Duration(getEnvInt("WRITE_TIMEOUT_SEC", 15)) * time.Second,
		AllowedOrigins:      splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "*")),
		AllowCredentials:    getEnvBool("CORS_ALLOW_CREDENTIALS", false),
		FirebaseProjectID:   strings.TrimSpace(os.Getenv("FIREBASE_PROJECT_ID")),
		FirebaseWebAPIKey:   strings.TrimSpace(os.Getenv("FIREBASE_WEB_API_KEY")),
		FirebaseCredentials: strings.TrimSpace(os.Getenv("FIREBASE_SERVICE_ACCOUNT_KEY")),
		MailFrom:            strings.TrimSpace(os.Getenv("MAIL_FROM")),
		MailTo:              splitCSV(strings.TrimSpace(os.Getenv("MAIL_TO"))),
		MailRetryMax:        getEnvInt("MAIL_RETRY_MAX", 3),
		MailRetryIntervalMS: getEnvInt("MAIL_RETRY_INTERVAL_MS", 500),
		AWSRegion:           strings.TrimSpace(os.Getenv("AWS_REGION")),
		AWSAccessKeyID:      strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID")),
		AWSSecretAccessKey:  strings.TrimSpace(os.Getenv("AWS_SECRET_ACCESS_KEY")),
		SESConfigurationSet: strings.TrimSpace(os.Getenv("SES_CONFIGURATION_SET")),
		GitHubToken:         strings.TrimSpace(os.Getenv("GITHUB_TOKEN")),
		GitHubOwner:         strings.TrimSpace(os.Getenv("GITHUB_OWNER")),
		GitHubRepo:          strings.TrimSpace(os.Getenv("GITHUB_REPO")),
		GitHubBranch:        getEnv("GITHUB_BRANCH", "main"),
		AdminEmails:         toSet(splitCSV(strings.TrimSpace(os.Getenv("ADMIN_EMAILS")))),
		AdminUIDs:           toSet(splitCSV(strings.TrimSpace(os.Getenv("ADMIN_UIDS")))),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func splitCSV(v string) []string {
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		s := strings.TrimSpace(part)
		if s == "" {
			continue
		}
		out = append(out, s)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func toSet(values []string) map[string]struct{} {
	set := map[string]struct{}{}
	for _, v := range values {
		set[strings.ToLower(strings.TrimSpace(v))] = struct{}{}
	}
	return set
}
