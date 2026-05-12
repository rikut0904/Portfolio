package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed sql/004_calendar_preferences_label.sql
var calendarPreferencesLabelMigrationSQL string

func RunCalendarPreferencesLabel(ctx context.Context, db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("migration db is nil")
	}

	sql := strings.TrimSpace(calendarPreferencesLabelMigrationSQL)
	if sql == "" {
		return fmt.Errorf("calendar preferences label migration is empty")
	}

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("run calendar preferences label migration: %w", err)
	}
	return nil
}
