package httpapi

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
)

type product struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Link        string   `json:"link"`
	GithubURL   string   `json:"githubUrl"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Status      string   `json:"status"`
	Deploy      string   `json:"deployStatus"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

func nullToString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

type productPayload struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Link        string   `json:"link"`
	GithubURL   string   `json:"githubUrl"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Status      string   `json:"status"`
	Deploy      string   `json:"deployStatus"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
}

func (h *Handler) getProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
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
		log.Printf("getProducts query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch products"})
		return
	}
	defer rows.Close()

	products := make([]product, 0)
	for rows.Next() {
		var p product
		var techRaw []byte
		var description, image, link, githubURL, category, status, deploy sql.NullString
		var createdAt sql.NullString
		var updatedAt sql.NullString
		var createdYear sql.NullInt64
		var createdMonth sql.NullInt64
		if err := rows.Scan(&p.ID, &p.Title, &description, &image, &link, &githubURL, &category, &techRaw, &status, &deploy, &createdYear, &createdMonth, &createdAt, &updatedAt); err != nil {
			log.Printf("getProducts scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch products"})
			return
		}
		p.Description = nullToString(description)
		p.Image = nullToString(image)
		p.Link = nullToString(link)
		p.GithubURL = nullToString(githubURL)
		p.Category = nullToString(category)
		p.Status = normalizeVisibilityStatus(nullToString(status))
		p.Deploy = normalizeDeployStatus(nullToString(deploy))
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

	q := r.URL.Query()
	category := strings.TrimSpace(q.Get("category"))
	status := strings.TrimSpace(q.Get("status"))
	deployStatus := strings.TrimSpace(q.Get("deployStatus"))
	createdYear := parseIntDefault(q.Get("createdYear"), 0)
	createdMonth := parseIntDefault(q.Get("createdMonth"), 0)
	techFilter := splitCSV(q.Get("technologies"))

	filtered := make([]product, 0, len(products))
	for _, p := range products {
		if category != "" && p.Category != category {
			continue
		}
		if status != "" && p.Status != status {
			continue
		}
		if deployStatus != "" && p.Deploy != deployStatus {
			continue
		}
		if createdYear > 0 && p.CreatedYear != createdYear {
			continue
		}
		if createdMonth > 0 && p.CreatedMon != createdMonth {
			continue
		}
		if len(techFilter) > 0 && !hasAny(p.Techs, techFilter) {
			continue
		}
		filtered = append(filtered, p)
	}

	sortBy := q.Get("sortBy")
	if sortBy == "" {
		sortBy = "createdYear-asc"
	}
	sort.Slice(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		switch sortBy {
		case "createdYear-asc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon < b.CreatedMon
			}
			return a.CreatedYear < b.CreatedYear
		case "createdYear-desc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon > b.CreatedMon
			}
			return a.CreatedYear > b.CreatedYear
		case "title-asc":
			return a.Title < b.Title
		case "title-desc":
			return a.Title > b.Title
		case "createdAt-asc":
			return a.CreatedAt < b.CreatedAt
		case "createdAt-desc":
			return a.CreatedAt > b.CreatedAt
		default:
			return false
		}
	})

	page := parseIntDefault(q.Get("page"), 1)
	limit := parseIntDefault(q.Get("limit"), 100)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 100
	}
	total := len(filtered)
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"products": filtered[start:end],
		"pagination": map[string]any{
			"page":  page,
			"limit": limit,
			"total": total,
			"totalPages": func() int {
				if total == 0 {
					return 0
				}
				return (total + limit - 1) / limit
			}(),
			"hasMore": end < total,
		},
	})
}

func (h *Handler) createProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	now := time.Now().UTC()
	if body.CreatedYear == 0 {
		body.CreatedYear = now.Year()
	}
	if body.CreatedMon == 0 {
		body.CreatedMon = int(now.Month())
	}
	if body.Status == "" {
		body.Status = "公開"
	}
	if body.Deploy == "" {
		body.Deploy = "未公開"
	}

	var id string
	nowISO := toISO(now)
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "products" (id, title, description, image, link, "githubUrl", category, technologies, status, "deployStatus", "createdYear", "createdMonth", "createdAt", "updatedAt")
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,NOW()) RETURNING id
	`, fmt.Sprintf("product_%d", now.UnixNano()), body.Title, body.Description, body.Image, body.Link, body.GithubURL, body.Category, mustJSON(body.Techs), body.Status, body.Deploy, body.CreatedYear, body.CreatedMon, nowISO).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create product"})
		return
	}

	h.logAdmin(r.Context(), "create", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusCreated, map[string]any{"product": map[string]any{"id": id, "title": body.Title, "description": body.Description, "image": body.Image, "link": body.Link, "githubUrl": body.GithubURL}})
}

func (h *Handler) updateProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	now := time.Now().UTC()
	if body.CreatedYear == 0 {
		body.CreatedYear = now.Year()
	}
	if body.CreatedMon == 0 {
		body.CreatedMon = int(now.Month())
	}
	if body.Status == "" {
		body.Status = "公開"
	}
	if body.Deploy == "" {
		body.Deploy = "未公開"
	}
	cmd, err := h.store.Pool.Exec(r.Context(), `
		UPDATE "products" SET title=$1, description=$2, image=$3, link=$4, "githubUrl"=$5, category=$6,
		technologies=$7::jsonb, status=$8, "deployStatus"=$9, "createdYear"=$10, "createdMonth"=$11, "updatedAt"=NOW()
		WHERE id=$12
	`, body.Title, body.Description, body.Image, body.Link, body.GithubURL, body.Category, mustJSON(body.Techs), body.Status, body.Deploy, body.CreatedYear, body.CreatedMon, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update product"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "products" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete product"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "product", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// sections
