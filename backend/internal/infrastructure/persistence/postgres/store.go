package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Store struct {
	DB *gorm.DB
}

func New(ctx context.Context, databaseURL string, skipMigration bool) (*Store, error) {
	// Silence slow query logs by increasing threshold to 2s and setting level to Warn
	newLogger := logger.New(
		log.Default(),
		logger.Config{
			SlowThreshold:             2 * time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}

	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxLifetime(45 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	if !skipMigration {
		log.Println("Starting database migration and cleanup...")

		// Basic data cleanup (idempotent and safe for every startup)
		err := db.Transaction(func(tx *gorm.DB) error {
			// Ensure extensions
			tx.Exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

			m := tx.Migrator()

			// Minimal idempotent cleanup to ensure non-null constraints
			if m.HasTable("products") {
				tx.Exec(`UPDATE products SET 
					link = COALESCE(link, ''), 
					image = COALESCE(image, ''),
					"githubUrl" = COALESCE("githubUrl", ''),
					category = COALESCE(category, ''),
					status = COALESCE(status, '公開'),
					"deployStatus" = COALESCE("deployStatus", '未公開'),
					"createdYear" = COALESCE("createdYear", 0),
					"createdMonth" = COALESCE("createdMonth", 0)
					WHERE link IS NULL OR image IS NULL OR "githubUrl" IS NULL OR category IS NULL`)
			}

			if m.HasTable("activities") {
				tx.Exec(`UPDATE activities SET 
					description = COALESCE(description, ''),
					link = COALESCE(link, ''),
					image = COALESCE(image, ''),
					status = COALESCE(status, '非公開'),
					"order" = COALESCE("order", 0)
					WHERE description IS NULL OR link IS NULL OR image IS NULL`)
			}

			if m.HasTable("sections") {
				tx.Exec(`UPDATE sections SET 
					data = COALESCE(data, '{}'),
					type_name = COALESCE(type_name, ''),
					items = COALESCE(items, '[]'),
					histories = COALESCE(histories, '[]')
					WHERE data IS NULL OR type_name IS NULL OR items IS NULL OR histories IS NULL`)
			}

			if m.HasTable("technologies") {
				tx.Exec(`UPDATE technologies SET category = '' WHERE category IS NULL`)
			}

			if m.HasTable("adminLogs") {
				if m.HasColumn("adminLogs", "level") {
					tx.Exec(`UPDATE "adminLogs" SET level = 'info' WHERE level IS NULL`)
				}
			}

			return nil
		})
		if err != nil {
			log.Printf("Warning: minimal data cleanup failed: %v", err)
		}

		// Run AutoMigration (Safe: only adds columns/tables)
		if err := db.AutoMigrate(GetModels()...); err != nil {
			return nil, fmt.Errorf("auto migrate: %w", err)
		}

		log.Println("Database migration and cleanup completed successfully.")
	} else {
		log.Println("Database migration skipped by configuration.")
	}

	return &Store{DB: db}, nil
}

func (s *Store) CleanupOldAdminLogs(ctx context.Context) error {
	if s == nil || s.DB == nil {
		return nil
	}
	result := s.DB.WithContext(ctx).Where("\"createdAt\" < ?", time.Now().AddDate(0, -2, 0)).Delete(&AdminLogModel{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		log.Printf("Cleaned up %d old admin logs", result.RowsAffected)
	}
	return nil
}

func (s *Store) Close() {
	if s != nil && s.DB != nil {
		sqlDB, err := s.DB.DB()
		if err == nil {
			sqlDB.Close()
		}
	}
}

func nullString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}
