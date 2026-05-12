package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	domain "portfolio-backend/internal/domain/technology"
)

type TechnologyRepository struct {
	store *Store
}

func NewTechnologyRepository(store *Store) *TechnologyRepository {
	return &TechnologyRepository{store: store}
}

func (r *TechnologyRepository) List(ctx context.Context) ([]domain.Technology, error) {
	rows, err := r.store.Pool.Query(ctx, `
		SELECT
			t.id,
			t.name,
			t.category,
			COALESCE(to_jsonb(t)->>'createdAt', to_jsonb(t)->>'created_at', to_jsonb(t)->>'createdat', '') AS created_at
		FROM "technologies" t
		ORDER BY t.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]domain.Technology, 0)
	for rows.Next() {
		var t domain.Technology
		var id, name, category, createdAt sql.NullString
		if err := rows.Scan(&id, &name, &category, &createdAt); err != nil {
			return nil, err
		}
		t.ID = nullString(id)
		t.Name = nullString(name)
		t.Category = nullString(category)
		if createdAt.Valid {
			t.CreatedAt = createdAt.String
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *TechnologyRepository) Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Technology, error) {
	var exists bool
	if err := r.store.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM technologies WHERE LOWER(name)=LOWER($1))`, input.Name).Scan(&exists); err != nil {
		return domain.Technology{}, err
	}
	if exists {
		return domain.Technology{}, domain.ErrDuplicate
	}

	var id string
	err := r.store.Pool.QueryRow(ctx, `INSERT INTO "technologies" (id, name, category, "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) RETURNING id`, fmt.Sprintf("tech_%d", now.UnixNano()), input.Name, input.Category).Scan(&id)
	if err != nil {
		return domain.Technology{}, err
	}
	return domain.Technology{
		ID:        id,
		Name:      input.Name,
		Category:  input.Category,
		CreatedAt: now.UTC().Format(time.RFC3339),
	}, nil
}

func (r *TechnologyRepository) Update(ctx context.Context, id string, input domain.Payload) error {
	var dup bool
	if err := r.store.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM "technologies" WHERE LOWER(name)=LOWER($1) AND id<>$2)`, input.Name, id).Scan(&dup); err != nil {
		return err
	}
	if dup {
		return domain.ErrDuplicate
	}

	cmd, err := r.store.Pool.Exec(ctx, `UPDATE "technologies" SET name=$1, category=$2, "updatedAt"=NOW() WHERE id=$3`, input.Name, input.Category, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *TechnologyRepository) Delete(ctx context.Context, id string) error {
	cmd, err := r.store.Pool.Exec(ctx, `DELETE FROM "technologies" WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return sql.ErrNoRows
	}
	return nil
}
