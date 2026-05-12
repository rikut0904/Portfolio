package migrations

import (
	"context"
	_ "embed"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed sql/002_inquiry_threads.sql
var inquiryThreadsMigrationSQL string

func RunInquiryThreads(ctx context.Context, pool *pgxpool.Pool) error {
	if pool == nil {
		return fmt.Errorf("migration pool is nil")
	}

	sql := strings.TrimSpace(inquiryThreadsMigrationSQL)
	if sql == "" {
		return fmt.Errorf("inquiry thread migration is empty")
	}

	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("run inquiry thread migration: %w", err)
	}
	return nil
}
