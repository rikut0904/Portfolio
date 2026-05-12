package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed sql/003_calendar_preferences.sql
var calendarPreferencesMigrationSQL string

func RunCalendarPreferences(ctx context.Context, db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("migration db is nil")
	}

	sql := strings.TrimSpace(calendarPreferencesMigrationSQL)
	if sql == "" {
		return fmt.Errorf("calendar preferences migration is empty")
	}

	if err := db.Exec(sql).Error; err != nil {
		return fmt.Errorf("run calendar preferences migration: %w", err)
	}
	return nil
}
