package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/006_calendar_event_publication_content.sql
var calendarEventPublicationContentSQL string

func RunCalendarEventPublicationContent(ctx context.Context, pool *pgxpool.Pool) error {
	sqlText := strings.TrimSpace(calendarEventPublicationContentSQL)
	if sqlText == "" {
		return fmt.Errorf("calendar event publication content migration is empty")
	}
	if _, err := pool.Exec(ctx, sqlText); err != nil {
		return fmt.Errorf("run calendar event publication content migration: %w", err)
	}
	return nil
}
