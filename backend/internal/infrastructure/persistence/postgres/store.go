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

func (s *Store) Ping(ctx context.Context) error {
	db, err := s.DB.DB()
	if err != nil {
		return err
	}
	return db.PingContext(ctx)
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
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

	return &Store{DB: db}, nil
}

// Migrate applies the complete schema migration. It is intentionally separate
// from New so the API server never changes the database schema at startup.
func (s *Store) Migrate(ctx context.Context) error {
	if s == nil || s.DB == nil {
		return fmt.Errorf("database store is not initialized")
	}
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		migrator := tx.Migrator()
		tableRenames := map[string]string{
			"admin_logs":          "adminLogs",
			"activity_categories": "activityCategories",
		}
		for oldName, newName := range tableRenames {
			if migrator.HasTable(oldName) && !migrator.HasTable(newName) {
				log.Printf("Renaming table %s -> %s...", oldName, newName)
				if err := migrator.RenameTable(oldName, newName); err != nil {
					return fmt.Errorf("rename table %s to %s: %w", oldName, newName, err)
				}
			}
		}

		columnRenames := map[string]map[string]string{
			"products":           {"github_url": "githubUrl", "deploy_status": "deployStatus", "created_year": "createdYear", "created_month": "createdMonth", "created_at": "createdAt", "updated_at": "updatedAt"},
			"activities":         {"order_no": "order", "created_at": "createdAt", "updated_at": "updatedAt"},
			"activityCategories": {"order_no": "order", "created_at": "createdAt"},
			"technologies":       {"created_at": "createdAt", "updated_at": "updatedAt"},
			"inquiries":          {"created_at": "createdAt", "updated_at": "updatedAt"},
			"inquiry_replies":    {"created_at": "createdAt"},
			"sections":           {"type_name": "typeName"},
			"adminLogs":          {"entity_id": "entityId", "user_id": "userId", "user_email": "userEmail", "created_at": "createdAt"},
		}
		for table, renames := range columnRenames {
			if !migrator.HasTable(table) {
				continue
			}
			for oldName, newName := range renames {
				if migrator.HasColumn(table, oldName) && !migrator.HasColumn(table, newName) {
					if err := migrator.RenameColumn(table, oldName, newName); err != nil {
						return fmt.Errorf("rename column %s.%s to %s: %w", table, oldName, newName, err)
					}
				}
			}
		}

		if err := tx.AutoMigrate(GetModels()...); err != nil {
			return fmt.Errorf("auto migrate: %w", err)
		}

		if migrator.HasTable("sections") {
			if err := tx.Model(&SectionDataModel{}).Where(`"typeName" IS NULL OR "typeName" = ''`).Update("typeName", "list").Error; err != nil {
				return err
			}
			if err := syncLegacySectionMeta(tx, migrator); err != nil {
				return err
			}
			if err := initializeSectionOrder(tx); err != nil {
				return err
			}
		}
		return nil
	})
}

type legacySectionMetaModel struct {
	ID          string `gorm:"column:id"`
	DisplayName string `gorm:"column:displayName"`
	TypeName    string `gorm:"column:type_name"`
	Order       int    `gorm:"column:order"`
	Editable    bool   `gorm:"column:editable"`
}

func (legacySectionMetaModel) TableName() string { return "sectionMeta" }

func syncLegacySectionMeta(tx *gorm.DB, migrator gorm.Migrator) error {
	if !migrator.HasTable("sectionMeta") || !migrator.HasColumn("sectionMeta", "type_name") {
		return nil
	}
	var metas []legacySectionMetaModel
	if err := tx.Find(&metas).Error; err != nil {
		return err
	}
	for _, meta := range metas {
		updates := map[string]any{
			"displayName": meta.DisplayName,
			"typeName":    meta.TypeName,
			"order":       meta.Order,
			"editable":    meta.Editable,
		}
		if err := tx.Model(&SectionDataModel{}).Where("id = ?", meta.ID).Updates(updates).Error; err != nil {
			return err
		}
	}
	return nil
}

func initializeSectionOrder(tx *gorm.DB) error {
	var rows []SectionDataModel
	if err := tx.Order("id ASC").Find(&rows).Error; err != nil {
		return err
	}
	if len(rows) < 2 {
		return nil
	}
	allZero := true
	for _, row := range rows {
		if row.Order != 0 {
			allZero = false
			break
		}
	}
	if !allZero {
		return nil
	}

	preferredOrder := map[string]int{
		"profile":                0,
		"specializations":        1,
		"licenses":               2,
		"schoolHistory":          3,
		"communityHistory":       4,
		"eventJoinHistory":       5,
		"eventManagementHistory": 6,
		"travel":                 7,
	}
	used := make(map[int]bool, len(rows))
	next := 0
	for _, row := range rows {
		order, ok := preferredOrder[row.ID]
		if !ok || used[order] {
			for used[next] {
				next++
			}
			order = next
			next++
		}
		used[order] = true
		if err := tx.Model(&SectionDataModel{}).Where("id = ?", row.ID).Update("order", order).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) CleanupOldAdminLogs(ctx context.Context) error {
	if s == nil || s.DB == nil {
		return nil
	}
	result := s.DB.WithContext(ctx).Where(`"createdAt" < ?`, time.Now().AddDate(0, -2, 0)).Delete(&AdminLogModel{})
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
