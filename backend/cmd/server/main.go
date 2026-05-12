package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	httpapi "portfolio-backend/internal/adapter/http"
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/config"
	"portfolio-backend/internal/infrastructure/discord"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/mail"
	"portfolio-backend/internal/infrastructure/migrations"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
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
	if err := migrations.RunCalendarPreferences(ctx, st.Pool); err != nil {
		log.Fatalf("migration error: %v", err)
	}
	if err := migrations.RunCalendarPreferencesLabel(ctx, st.Pool); err != nil {
		log.Fatalf("migration error: %v", err)
	}
	if err := migrations.RunCalendarEventPublications(ctx, st.Pool); err != nil {
		log.Fatalf("migration error: %v", err)
	}
	if err := migrations.RunCalendarEventPublicationContent(ctx, st.Pool); err != nil {
		log.Fatalf("migration error: %v", err)
	}
	if cfg.RunInquiryThreadMigration {
		if err := migrations.RunInquiryThreads(ctx, st.Pool); err != nil {
			log.Fatalf("migration error: %v", err)
		}
		log.Printf("applied inquiry thread migration")
	}

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
	discordClient := discord.New(cfg.DiscordWebhookURLs)
	calendarClient, err := gcalendar.New(ctx, gcalendar.Config{
		CalendarIDs:     cfg.GoogleCalendarIDs,
		Timezone:        cfg.GoogleCalendarTimezone,
		CredentialsJSON: cfg.GoogleCalendarCredentials,
	})
	if err != nil {
		log.Fatalf("google calendar error: %v", err)
	}
	log.Printf(
		"discord webhook config: raw=%d valid=%d enabled=%t",
		len(cfg.DiscordWebhookURLs),
		discord.CountValidWebhookURLs(cfg.DiscordWebhookURLs),
		discordClient != nil && discordClient.Count() > 0,
	)
	log.Printf(
		"google calendar config: enabled=%t calendars=%d timezone=%q",
		calendarClient != nil && calendarClient.Enabled(),
		len(cfg.GoogleCalendarIDs),
		cfg.GoogleCalendarTimezone,
	)

	handler := httpapi.NewHandler(
		st,
		verifier,
		mailer,
		discordClient,
		cfg.FirebaseWebAPIKey,
		cfg.AppBaseURL,
		cfg.MailTo,
		cfg.AppMode,
		cfg.GitHubToken,
		cfg.GitHubOwner,
		cfg.GitHubRepo,
		cfg.GitHubBranch,
		calendarClient,
	)
	router := httpapi.NewRouter(cfg, handler)

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
