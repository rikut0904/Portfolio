package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Store struct {
	DB *gorm.DB
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
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

	// Run AutoMigration
	if err := db.AutoMigrate(GetModels()...); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
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
