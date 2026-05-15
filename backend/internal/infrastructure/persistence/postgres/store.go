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
			m := tx.Migrator()

			// 1. Rename Tables BACK to PascalCase if snake_case exists
			tableRenames := map[string]string{
				"activity_categories": "activityCategories",
				"admin_logs":          "adminLogs",
				"section_meta":        "sectionMeta",
			}
			for snakeName, pascalName := range tableRenames {
				if m.HasTable(snakeName) {
					shouldRename := !m.HasTable(pascalName)
					if !shouldRename {
						// If PascalCase table exists, check if it's empty
						var count int64
						tx.Table(pascalName).Count(&count)
						if count == 0 {
							log.Printf("PascalCase table %s is empty, dropping and renaming %s back to it", pascalName, snakeName)
							m.DropTable(pascalName)
							shouldRename = true
						} else {
							// Both exist and Pascal has data, just drop the snake one
							log.Printf("Dropping snake_case table %s", snakeName)
							m.DropTable(snakeName)
						}
					}
					if shouldRename {
						log.Printf("Renaming table %s back to %s", snakeName, pascalName)
						if err := m.RenameTable(snakeName, pascalName); err != nil {
							log.Printf("Warning: failed to rename table %s: %v", snakeName, err)
						}
					}
				}
			}

			// 2. Rename Columns BACK to PascalCase
			columnRenames := map[string]map[string]string{
				"products": {
					"github_url":    "githubUrl",
					"deploy_status": "deployStatus",
					"created_year":  "createdYear",
					"created_month": "createdMonth",
					"created_at":    "createdAt",
					"updated_at":    "updatedAt",
				},
				"activities": {
					"order_no":   "order",
					"created_at": "createdAt",
					"updated_at": "updatedAt",
				},
				"activityCategories": {
					"order_no":   "order",
					"created_at": "createdAt",
				},
				"technologies": {
					"created_at": "createdAt",
					"updated_at": "updatedAt",
				},
				"adminLogs": {
					"entity_id":  "entityId",
					"user_id":    "userId",
					"user_email": "userEmail",
					"created_at": "createdAt",
				},
				"sectionMeta": {
					"display_name": "displayName",
					"order_no":     "order",
				},
				"sections": {
					"data_profile_image": "data_profileImage",
				},
			}

			for table, renames := range columnRenames {
				if m.HasTable(table) {
					for snakeCol, pascalCol := range renames {
						if m.HasColumn(table, snakeCol) {
							if !m.HasColumn(table, pascalCol) {
								log.Printf("Renaming column %s.%s back to %s", table, snakeCol, pascalCol)
								if err := m.RenameColumn(table, snakeCol, pascalCol); err != nil {
									log.Printf("Warning: failed to rename column %s.%s: %v", table, snakeCol, err)
								}
							} else {
								// Both exist, handle cleanup if needed (usually just drop snake if empty)
								// For safety, we'll just leave it and let AutoMigrate handle it or manually fix if data exists
							}
						}
					}
				}
			}

			// Ensure extension for UUID generation if needed
			tx.Exec(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

			if m.HasTable("products") {
				// Clean up invalid image paths
				tx.Exec(`UPDATE products SET image = '' WHERE image = '/img/product/' OR image IS NULL`)

				tx.Exec(`UPDATE products SET 
					link = COALESCE(link, ''),
					image = COALESCE(image, ''),
					"githubUrl" = COALESCE("githubUrl", ''),
					category = COALESCE(category, ''),
					status = COALESCE(status, '公開'),
					"deployStatus" = COALESCE("deployStatus", '未公開'),
					"createdYear" = COALESCE("createdYear", 0),
					"createdMonth" = COALESCE("createdMonth", 0)
					WHERE link IS NULL OR image IS NULL OR "githubUrl" IS NULL OR category IS NULL 
					OR status IS NULL OR "deployStatus" IS NULL OR "createdYear" IS NULL OR "createdMonth" IS NULL`)
			}

			if m.HasTable("activities") {
				tx.Exec(`UPDATE activities SET 
					description = COALESCE(description, ''),
					link = COALESCE(link, ''),
					image = COALESCE(image, ''),
					status = COALESCE(status, '非公開'),
					"order" = COALESCE("order", 0)
					WHERE description IS NULL OR link IS NULL OR image IS NULL OR status IS NULL OR "order" IS NULL`)
			}

			if m.HasTable("inquiries") {
				tx.Exec(`UPDATE inquiries SET 
					category = COALESCE(category, ''),
					contact_name = COALESCE(contact_name, ''),
					status = COALESCE(status, 'pending')
					WHERE category IS NULL OR contact_name IS NULL OR status IS NULL`)

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

			if m.HasTable("adminLogs") {
				if m.HasColumn("adminLogs", "level") {
					tx.Exec(`UPDATE "adminLogs" SET level = 'info' WHERE level IS NULL`)
				}
			}

			if m.HasTable("sections") {
				// a. Migrate profile data to 'data' column if old columns still exist
				if m.HasColumn("sections", "data_name") {
					log.Println("Consolidating profile data and dropping old columns...")
					tx.Exec(`UPDATE sections SET 
						data = data || jsonb_build_object(
							'name', CASE WHEN "data_name" <> '' THEN "data_name" ELSE COALESCE(data->>'name', '') END,
							'hometown', CASE WHEN "data_hometown" <> '' THEN "data_hometown" ELSE COALESCE(data->>'hometown', '') END,
							'hobbies', CASE WHEN "data_hobbies" <> '' THEN "data_hobbies" ELSE COALESCE(data->>'hobbies', '') END,
							'profileImage', CASE WHEN "data_profileImage" <> '' THEN "data_profileImage" ELSE COALESCE(data->>'profileImage', '') END,
							'university', CASE WHEN "data_university" <> '' THEN "data_university" ELSE COALESCE(data->>'university', '') END
						)
						WHERE type_name IN ('profile', 'single') OR "data_name" <> ''`)

					// Drop old columns
					cols := []string{"data_name", "data_hometown", "data_hobbies", "data_profileImage", "data_university"}
					for _, c := range cols {
						m.DropColumn("sections", c)
					}
				}

				// b. Enforce Data Integrity: Clear mismatched columns based on type
				// Profile/Single -> Clear items, histories, and unify university/affiliation
				tx.Exec(`UPDATE sections SET 
					data = (data - 'university') || jsonb_build_object(
						'affiliation', COALESCE(NULLIF(data->>'affiliation', ''), data->>'university', '')
					),
					items = '[]', 
					histories = '[]' 
					WHERE id = 'profile'`)
				tx.Exec(`UPDATE sections SET items = '[]', histories = '[]' WHERE type_name IN ('profile', 'single') AND id <> 'profile'`)
				// List/Categorized -> Clear data, histories
				tx.Exec(`UPDATE sections SET data = '{}', histories = '[]' WHERE type_name IN ('list', 'categorized')`)
				// History -> Clear data, items (Ensuring school history is already moved)
				tx.Exec(`UPDATE sections SET 
					histories = CASE WHEN (histories = '[]' OR histories IS NULL) AND (items <> '[]' AND items IS NOT NULL) THEN items ELSE histories END,
					data = '{}'
					WHERE type_name = 'history' OR id LIKE '%History'`)
				tx.Exec(`UPDATE sections SET items = '[]' WHERE type_name = 'history' OR id LIKE '%History'`)

				// c. Ensure all columns have defaults
				tx.Exec(`UPDATE sections SET 
					data = COALESCE(data, '{}'),
					type_name = COALESCE(type_name, ''),
					items = COALESCE(items, '[]'),
					histories = COALESCE(histories, '[]')
					WHERE data IS NULL OR type_name IS NULL OR items IS NULL OR histories IS NULL`)
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
