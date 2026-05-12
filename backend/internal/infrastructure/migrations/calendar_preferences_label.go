package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/004_calendar_preferences_label.sql
var calendarPreferencesLabelMigrationSQL string

func RunCalendarPreferencesLabel(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return fmt.Errorf("migration pool is nil")
	}

	sql := strings.TrimSpace(calendarPreferencesLabelMigrationSQL)
	if sql == "" {
		return fmt.Errorf("calendar preferences label migration is empty")
	}

	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("run calendar preferences label migration: %w", err)
	}
	return nil
}
