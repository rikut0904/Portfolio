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
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	activityusecase "portfolio-backend/internal/usecase/activity"
	adminlogusecase "portfolio-backend/internal/usecase/adminlog"
	inquiryusecase "portfolio-backend/internal/usecase/inquiry"
	productusecase "portfolio-backend/internal/usecase/product"
	sectionusecase "portfolio-backend/internal/usecase/section"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	st, err := postgres.New(ctx, cfg.DatabaseURL)
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

	productRepository := postgres.NewProductRepository(st)
	productUsecase := productusecase.New(productRepository)
	technologyRepository := postgres.NewTechnologyRepository(st)
	technologyUsecase := technologyusecase.New(technologyRepository)
	adminLogUsecase := adminlogusecase.New(postgres.NewAdminLogRepository(st))
	sectionUsecase := sectionusecase.New(postgres.NewSectionRepository(st))
	activityUsecase := activityusecase.New(postgres.NewActivityRepository(st))
	inquiryUsecase := inquiryusecase.New(postgres.NewInquiryRepository(st))
	calendarRepository := postgres.NewCalendarRepository(st)

	handler := httpapi.NewHandler(httpapi.HandlerConfig{
		HealthChecker:     st,
		Products:          productUsecase,
		AdminLogs:         adminLogUsecase,
		Activities:        activityUsecase,
		Inquiries:         inquiryUsecase,
		CalendarRepo:      calendarRepository,
		Sections:          sectionUsecase,
		Technologies:      technologyUsecase,
		Verifier:          verifier,
		Mailer:            mailer,
		Discord:           discordClient,
		FirebaseWebAPIKey: cfg.FirebaseWebAPIKey,
		AppBaseURL:        cfg.AppBaseURL,
		MailTo:            cfg.MailTo,
		AppMode:           cfg.AppMode,
		GitHubToken:       cfg.GitHubToken,
		GitHubOwner:       cfg.GitHubOwner,
		GitHubRepo:        cfg.GitHubRepo,
		GitHubBranch:      cfg.GitHubBranch,
		Calendar:          calendarClient,
	})
	router := httpapi.NewRouter(cfg, handler)

	// Start background maintenance tasks
	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				cleanupCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
				if err := st.CleanupOldAdminLogs(cleanupCtx); err != nil {
					log.Printf("background maintenance error: %v", err)
				}
				cancel()
			}
		}
	}()

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
