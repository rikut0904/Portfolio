package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"portfolio-backend/internal/api"
	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/config"
	"portfolio-backend/internal/mail"
	"portfolio-backend/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db error: %v", err)
	}
	defer st.Close()

	verifier, err := auth.NewVerifier(ctx, cfg.FirebaseCredentials, cfg.FirebaseProjectID, cfg.AdminEmails, cfg.AdminUIDs)
	if err != nil {
		log.Fatalf("auth error: %v", err)
	}

	mailer, err := mail.New(ctx, mail.Config{
		From:             cfg.MailFrom,
		Region:           cfg.AWSRegion,
		AccessKeyID:      cfg.AWSAccessKeyID,
		SecretAccessKey:  cfg.AWSSecretAccessKey,
		ConfigurationSet: cfg.SESConfigurationSet,
		RetryMax:         cfg.MailRetryMax,
		RetryInterval:    time.Duration(cfg.MailRetryIntervalMS) * time.Millisecond,
	})
	if err != nil {
		log.Fatalf("mail error: %v", err)
	}

	handler := api.NewHandler(
		st,
		verifier,
		mailer,
		cfg.FirebaseWebAPIKey,
		cfg.MailTo,
		cfg.AppMode,
		cfg.GitHubToken,
		cfg.GitHubOwner,
		cfg.GitHubRepo,
		cfg.GitHubBranch,
	)
	router := api.NewRouter(cfg, handler)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
}
