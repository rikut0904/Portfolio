package main

import (
	"context"
	"log"
	"time"

	"portfolio-backend/internal/infrastructure/config"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	"portfolio-backend/internal/infrastructure/persistence/postgres/migrations"
)

func main() {
	log.Println("Starting manual database migration...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	store, err := postgres.New(ctx, cfg.DatabaseURL, false)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	if err := migrations.RunOneTimeRefactoring(store.DB); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Manual migration completed successfully.")
}
