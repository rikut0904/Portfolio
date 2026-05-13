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

		// Data cleanup for existing tables before AutoMigrate
		// Use a transaction for safety and speed
		err := db.Transaction(func(tx *gorm.DB) error {
			// Ensure extension for UUID generation if needed
			tx.Exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

			m := tx.Migrator()

			if m.HasTable("products") {
				// We use raw SQL to update all at once for better performance
				tx.Exec(`UPDATE products SET 
					link = COALESCE(link, ''),
					image = COALESCE(image, ''),
					github_url = COALESCE(github_url, ''),
					category = COALESCE(category, ''),
					status = COALESCE(status, '公開'),
					deploy_status = COALESCE(deploy_status, '未公開'),
					created_year = COALESCE(created_year, 0),
					created_month = COALESCE(created_month, 0)
					WHERE link IS NULL OR image IS NULL OR github_url IS NULL OR category IS NULL 
					OR status IS NULL OR deploy_status IS NULL OR created_year IS NULL OR created_month IS NULL`)
			}

			if m.HasTable("activities") {
				tx.Exec(`UPDATE activities SET 
					description = COALESCE(description, ''),
					link = COALESCE(link, ''),
					image = COALESCE(image, ''),
					status = COALESCE(status, '非公開')
					WHERE description IS NULL OR link IS NULL OR image IS NULL OR status IS NULL`)
			}

			if m.HasTable("inquiries") {
				tx.Exec(`UPDATE inquiries SET 
					category = COALESCE(category, ''),
					contact_name = COALESCE(contact_name, ''),
					status = COALESCE(status, 'pending')
					WHERE category IS NULL OR contact_name IS NULL OR status IS NULL`)

				// Special case for thread_id
				if m.HasColumn("inquiries", "thread_id") {
					tx.Exec(`UPDATE inquiries SET thread_id = gen_random_uuid() 
						WHERE thread_id IS NULL OR thread_id = ''`)
				}
			}

			if m.HasTable("inquiry_replies") {
				tx.Exec(`UPDATE inquiry_replies SET 
					sender_name = COALESCE(sender_name, ''),
					sender_email = COALESCE(sender_email, '')
					WHERE sender_name IS NULL OR sender_email IS NULL`)
			}

			if m.HasTable("admin_logs") {
				if m.HasColumn("admin_logs", "level") {
					tx.Exec(`UPDATE admin_logs SET level = 'info' WHERE level IS NULL`)
				}
			}

			if m.HasTable("sections") {
				tx.Exec(`UPDATE sections SET 
					data = COALESCE(data, '{}'),
					type_name = COALESCE(type_name, ''),
					data_name = COALESCE(data_name, ''),
					data_hometown = COALESCE(data_hometown, ''),
					data_hobbies = COALESCE(data_hobbies, ''),
					data_profile_image = COALESCE(data_profile_image, ''),
					data_university = COALESCE(data_university, ''),
					items = COALESCE(items, '[]'),
					histories = COALESCE(histories, '[]')
					WHERE data IS NULL OR type_name IS NULL OR data_name IS NULL 
					OR data_hometown IS NULL OR data_hobbies IS NULL OR data_profile_image IS NULL 
					OR data_university IS NULL OR items IS NULL OR histories IS NULL`)
			}

			if m.HasTable("technologies") {
				if m.HasColumn("technologies", "category") {
					tx.Exec(`UPDATE technologies SET category = '' WHERE category IS NULL`)
				}
			}

			if m.HasTable("calendar_preferences") {
				if m.HasColumn("calendar_preferences", "label") {
					tx.Exec(`UPDATE calendar_preferences SET label = '' WHERE label IS NULL`)
				}
			}

			if m.HasTable("calendar_event_publications") {
				if m.HasColumn("calendar_event_publications", "public_description") {
					tx.Exec(`UPDATE calendar_event_publications SET public_description = '' WHERE public_description IS NULL`)
				}
			}

			return nil
		})
		if err != nil {
			log.Printf("Warning: data cleanup failed: %v", err)
		}

		// Run AutoMigration
		if err := db.AutoMigrate(GetModels()...); err != nil {
			return nil, fmt.Errorf("auto migrate: %w", err)
		}

		log.Println("Database migration and cleanup completed successfully.")
	} else {
		log.Println("Database migration skipped by configuration.")
	}


	return &Store{DB: db}, nil
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
