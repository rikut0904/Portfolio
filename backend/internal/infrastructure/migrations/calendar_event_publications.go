package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/005_calendar_event_publications.sql
var calendarEventPublicationsSQL string

func RunCalendarEventPublications(ctx context.Context, pool *pgxpool.Pool) error {
	sqlText := strings.TrimSpace(calendarEventPublicationsSQL)
	if sqlText == "" {
		return fmt.Errorf("calendar event publications migration is empty")
	}
	if _, err := pool.Exec(ctx, sqlText); err != nil {
		return fmt.Errorf("run calendar event publications migration: %w", err)
	}
	return nil
}
