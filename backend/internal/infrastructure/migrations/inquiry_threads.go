package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed sql/002_inquiry_threads.sql
var inquiryThreadsMigrationSQL string

func RunInquiryThreads(ctx context.Context, db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("migration db is nil")
	}

	sql := strings.TrimSpace(inquiryThreadsMigrationSQL)
	if sql == "" {
		return fmt.Errorf("inquiry thread migration is empty")
	}

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("run inquiry thread migration: %w", err)
	}
	return nil
}
