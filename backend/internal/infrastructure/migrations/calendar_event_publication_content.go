package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

//go:embed sql/006_calendar_event_publication_content.sql
var calendarEventPublicationContentSQL string

func RunCalendarEventPublicationContent(ctx context.Context, db *gorm.DB) error {
	sqlText := strings.TrimSpace(calendarEventPublicationContentSQL)
	if sqlText == "" {
		return fmt.Errorf("calendar event publication content migration is empty")
	}
	if err := db.Exec(sqlText).Error; err != nil {
		return fmt.Errorf("run calendar event publication content migration: %w", err)
	}
	return nil
}
