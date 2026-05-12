package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed sql/005_calendar_event_publications.sql
var calendarEventPublicationsSQL string

func RunCalendarEventPublications(ctx context.Context, db *gorm.DB) error {
	sqlText := strings.TrimSpace(calendarEventPublicationsSQL)
	if sqlText == "" {
		return fmt.Errorf("calendar event publications migration is empty")
	}
	if err := db.Exec(sqlText).Error; err != nil {
		return fmt.Errorf("run calendar event publications migration: %w", err)
	}
	return nil
}
