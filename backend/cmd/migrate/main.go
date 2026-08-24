package main

import (
	"context"
	"log"
	"time"

	"portfolio-backend/internal/infrastructure/config"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
)

func main() {
	log.Println("Starting GORM database migration...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// AutoMigrate may wait for PostgreSQL locks on an existing production schema.
	// Keep this timeout separate from the API server's request timeouts.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	store, err := postgres.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	if err := store.Migrate(ctx); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("GORM database migration completed successfully.")
}
