package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/003_calendar_preferences.sql
var calendarPreferencesMigrationSQL string

func RunCalendarPreferences(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return fmt.Errorf("migration pool is nil")
	}

	sql := strings.TrimSpace(calendarPreferencesMigrationSQL)
	if sql == "" {
		return fmt.Errorf("calendar preferences migration is empty")
	}

	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("run calendar preferences migration: %w", err)
	}
	return nil
}
