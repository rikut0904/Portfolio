package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	domain "portfolio-backend/internal/domain/product"
)

type ProductRepository struct {
	store *Store
}

func NewProductRepository(store *Store) *ProductRepository {
	return &ProductRepository{store: store}
}

func (r *ProductRepository) List(ctx context.Context) ([]domain.Product, error) {
	rows, err := r.store.Pool.Query(ctx, `
		SELECT
			p.id,
			p.title,
			p.description,
			p.image,
			p.link,
			COALESCE(to_jsonb(p)->>'githubUrl', to_jsonb(p)->>'github_url', to_jsonb(p)->>'githuburl', '') AS github_url,
			p.category,
			COALESCE(to_jsonb(p)->'technologies', '[]'::jsonb) AS technologies,
			p.status,
			COALESCE(to_jsonb(p)->>'deployStatus', to_jsonb(p)->>'deploy_status', to_jsonb(p)->>'deploystatus', '') AS deploy_status,
			COALESCE(NULLIF(COALESCE(to_jsonb(p)->>'createdYear', to_jsonb(p)->>'created_year', to_jsonb(p)->>'createdyear', ''), '')::bigint, 0) AS created_year,
			COALESCE(NULLIF(COALESCE(to_jsonb(p)->>'createdMonth', to_jsonb(p)->>'created_month', to_jsonb(p)->>'createdmonth', ''), '')::bigint, 0) AS created_month,
			COALESCE(to_jsonb(p)->>'createdAt', to_jsonb(p)->>'created_at', to_jsonb(p)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(p)->>'updatedAt', to_jsonb(p)->>'updated_at', to_jsonb(p)->>'updatedat', '') AS updated_at
		FROM "products" p
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]domain.Product, 0)
	for rows.Next() {
		var p domain.Product
		var techRaw []byte
		var description, image, link, githubURL, category, status, deploy sql.NullString
		var createdAt, updatedAt sql.NullString
		var createdYear, createdMonth sql.NullInt64
		if err := rows.Scan(&p.ID, &p.Title, &description, &image, &link, &githubURL, &category, &techRaw, &status, &deploy, &createdYear, &createdMonth, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		p.Description = nullString(description)
		p.Image = nullString(image)
		p.Link = nullString(link)
		p.GithubURL = nullString(githubURL)
		p.Category = nullString(category)
		p.Status = normalizeVisibilityStatus(nullString(status))
		p.Deploy = normalizeDeployStatus(nullString(deploy))
		if createdAt.Valid {
			p.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			p.UpdatedAt = updatedAt.String
		}
		if createdYear.Valid {
			p.CreatedYear = int(createdYear.Int64)
		}
		if createdMonth.Valid {
			p.CreatedMon = int(createdMonth.Int64)
		}
		p.Techs = parseStringArrayJSON(techRaw)
		products = append(products, p)
	}
	return products, rows.Err()
}

func (r *ProductRepository) Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Product, error) {
	var id string
	err := r.store.Pool.QueryRow(ctx, `
		INSERT INTO "products" (id, title, description, image, link, "githubUrl", category, technologies, status, "deployStatus", "createdYear", "createdMonth", "createdAt", "updatedAt")
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,NOW()) RETURNING id
	`, fmt.Sprintf("product_%d", now.UnixNano()), input.Title, input.Description, input.Image, input.Link, input.GithubURL, input.Category, mustJSON(input.Techs), input.Status, input.Deploy, input.CreatedYear, input.CreatedMon, now.UTC().Format(time.RFC3339)).Scan(&id)
	if err != nil {
		return domain.Product{}, err
	}
	return domain.Product{
		ID:          id,
		Title:       input.Title,
		Description: input.Description,
		Image:       input.Image,
		Link:        input.Link,
		GithubURL:   input.GithubURL,
		Category:    input.Category,
		Techs:       input.Techs,
		Status:      input.Status,
		Deploy:      input.Deploy,
		CreatedYear: input.CreatedYear,
		CreatedMon:  input.CreatedMon,
		CreatedAt:   now.UTC().Format(time.RFC3339),
	}, nil
}

func (r *ProductRepository) Update(ctx context.Context, id string, input domain.Payload, _ time.Time) error {
	cmd, err := r.store.Pool.Exec(ctx, `
		UPDATE "products" SET title=$1, description=$2, image=$3, link=$4, "githubUrl"=$5, category=$6,
		technologies=$7::jsonb, status=$8, "deployStatus"=$9, "createdYear"=$10, "createdMonth"=$11, "updatedAt"=NOW()
		WHERE id=$12
	`, input.Title, input.Description, input.Image, input.Link, input.GithubURL, input.Category, mustJSON(input.Techs), input.Status, input.Deploy, input.CreatedYear, input.CreatedMon, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *ProductRepository) Delete(ctx context.Context, id string) error {
	cmd, err := r.store.Pool.Exec(ctx, `DELETE FROM "products" WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func nullString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

func normalizeVisibilityStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "public", "published", "open", "active", "visible", "公開":
		return "公開"
	case "private", "draft", "hidden", "inactive", "非公開":
		return "非公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeDeployStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "deployed", "live", "production", "公開中":
		return "公開中"
	case "undeployed", "not_deployed", "draft", "staging", "未公開":
		return "未公開"
	default:
		return strings.TrimSpace(v)
	}
}

func parseStringArrayJSON(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err != nil {
		return []string{}
	}
	return arr
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{}`
	}
	if string(b) == "null" {
		return `{}`
	}
	return string(b)
}
