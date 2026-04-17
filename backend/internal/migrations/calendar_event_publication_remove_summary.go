package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/007_calendar_event_publication_remove_summary.sql
var calendarEventPublicationRemoveSummarySQL string

func RunCalendarEventPublicationRemoveSummary(ctx context.Context, pool *pgxpool.Pool) error {
	sqlText := strings.TrimSpace(calendarEventPublicationRemoveSummarySQL)
	if sqlText == "" {
		return fmt.Errorf("calendar event publication remove summary migration is empty")
	}
	if _, err := pool.Exec(ctx, sqlText); err != nil {
		return fmt.Errorf("run calendar event publication remove summary migration: %w", err)
	}
	return nil
}
