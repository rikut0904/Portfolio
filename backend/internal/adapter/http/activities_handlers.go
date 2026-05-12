package httpapi

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/auth"

	"github.com/jackc/pgx/v5"
)

type activity struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Link        string   `json:"link"`
	Image       string   `json:"image"`
	Status      string   `json:"status"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
	Order       int      `json:"order"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

func (h *Handler) getActivities(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			a.id,
			a.title,
			a.description,
			a.category,
			a.link,
			a.image,
			a.status,
			COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(a)->>'created_at', to_jsonb(a)->>'createdAt', to_jsonb(a)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(a)->>'updated_at', to_jsonb(a)->>'updatedAt', to_jsonb(a)->>'updatedat', '') AS updated_at
		FROM "activities" a
		ORDER BY COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activities"})
		return
	}
	defer rows.Close()
	list := make([]activity, 0)
	for rows.Next() {
		var a activity
		var description, category, link, image, status sql.NullString
		var ct, ut sql.NullString
		if err := rows.Scan(&a.ID, &a.Title, &description, &category, &link, &image, &status, &a.Order, &ct, &ut); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activities"})
			return
		}
		a.Description = nullToString(description)
		a.Category = nullToString(category)
		a.Link = nullToString(link)
		a.Image = nullToString(image)
		if ct.Valid {
			a.CreatedAt = ct.String
		}
		if ut.Valid {
			a.UpdatedAt = ut.String
		}
		parsedCreatedAt, err := time.Parse(time.RFC3339, a.CreatedAt)
		if err == nil {
			a.CreatedYear = parsedCreatedAt.Year()
			a.CreatedMon = int(parsedCreatedAt.Month())
		}
		a.Status = normalizeVisibilityStatus(nullToString(status))
		a.Techs = []string{}
		list = append(list, a)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"activities": list})
}

func (h *Handler) getActivity(w http.ResponseWriter, r *http.Request) {
	id := routeParam(r, "id")
	var a activity
	var description, category, link, image, status sql.NullString
	var ct, ut sql.NullString
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT
			a.id,
			a.title,
			a.description,
			a.category,
			a.link,
			a.image,
			a.status,
			COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(a)->>'created_at', to_jsonb(a)->>'createdAt', to_jsonb(a)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(a)->>'updated_at', to_jsonb(a)->>'updatedAt', to_jsonb(a)->>'updatedat', '') AS updated_at
		FROM "activities" a
		WHERE a.id=$1
	`, id).Scan(&a.ID, &a.Title, &description, &category, &link, &image, &status, &a.Order, &ct, &ut)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activity"})
		return
	}
	a.Description = nullToString(description)
	a.Category = nullToString(category)
	a.Link = nullToString(link)
	a.Image = nullToString(image)
	if ct.Valid {
		a.CreatedAt = ct.String
	}
	if ut.Valid {
		a.UpdatedAt = ut.String
	}
	parsedCreatedAt, err := time.Parse(time.RFC3339, a.CreatedAt)
	if err == nil {
		a.CreatedYear = parsedCreatedAt.Year()
		a.CreatedMon = int(parsedCreatedAt.Month())
	}
	a.Status = normalizeVisibilityStatus(nullToString(status))
	a.Techs = []string{}
	writeJSON(w, http.StatusOK, map[string]any{"activity": a})
}

func (h *Handler) createActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body activity
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Category) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and category are required"})
		return
	}
	now := time.Now().UTC()
	if body.Order == 0 {
		_ = h.store.Pool.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "activities"`).Scan(&body.Order)
	}
	if body.Status == "" {
		body.Status = "非公開"
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "activities" (id, title, description, category, link, image, status, "order", created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING id
	`, fmt.Sprintf("activity_%d", now.UnixNano()), body.Title, body.Description, body.Category, body.Link, body.Image, body.Status, body.Order).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create activity"})
		return
	}
	h.logAdmin(r.Context(), "create", "activity", id, "info", user, map[string]any{"title": body.Title, "category": body.Category, "status": body.Status})
	body.ID = id
	body.CreatedAt = toISO(now)
	body.UpdatedAt = toISO(now)
	body.CreatedYear = now.Year()
	body.CreatedMon = int(now.Month())
	body.Techs = []string{}
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Activity created successfully", "activity": body})
}

func (h *Handler) updateActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	h.upsertActivityByID(w, r, user, false)
}

func (h *Handler) patchActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	h.upsertActivityByID(w, r, user, true)
}

func (h *Handler) upsertActivityByID(w http.ResponseWriter, r *http.Request, user *auth.Claims, partial bool) {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if len(patch) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return
	}
	if !partial {
		if _, ok := patch["title"]; !ok {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "title is required"})
			return
		}
	}

	mapping := map[string]string{
		"title":       "title",
		"description": "description",
		"category":    "category",
		"link":        "link",
		"image":       "image",
		"status":      "status",
		"order":       `"order"`,
	}
	clauses := make([]string, 0)
	args := make([]any, 0)
	idx := 1
	for k, v := range patch {
		col, ok := mapping[k]
		if !ok {
			continue
		}
		clauses = append(clauses, fmt.Sprintf("%s=$%d", col, idx))
		args = append(args, v)
		idx++
	}
	clauses = append(clauses, "updated_at=NOW()")
	if len(clauses) == 1 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return
	}
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE "activities" SET %s WHERE id=$%d`, strings.Join(clauses, ","), idx)
	cmd, err := h.store.Pool.Exec(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update activity"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "activity", id, "info", user, func() any {
		if partial {
			return map[string]any{"updates": patch}
		}
		return map[string]any{}
	}())
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
}

func (h *Handler) deleteActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "activities" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete activity"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "activity", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity deleted successfully"})
}

type activityCategory struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	CreatedAt string `json:"createdAt"`
}

func (h *Handler) resolveActivityCategoryTable(ctx context.Context) (string, error) {
	var tableName string
	err := h.store.Pool.QueryRow(ctx, `
		SELECT CASE
			WHEN to_regclass('public."activityCategories"') IS NOT NULL THEN '"activityCategories"'
			WHEN to_regclass('public.activity_categories') IS NOT NULL THEN 'activity_categories'
			WHEN to_regclass('public.activitycategories') IS NOT NULL THEN 'activitycategories'
			ELSE ''
		END
	`).Scan(&tableName)
	if err != nil {
		return "", err
	}
	if tableName == "" {
		return "", errors.New("activity categories table not found")
	}
	return tableName, nil
}

func (h *Handler) getActivityCategories(w http.ResponseWriter, r *http.Request) {
	tableName, err := h.resolveActivityCategoryTable(r.Context())
	if err != nil {
		log.Printf("getActivityCategories resolve table error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
	}

	rows, err := h.store.Pool.Query(r.Context(), fmt.Sprintf(`
		SELECT
			ac.id,
			ac.name,
			COALESCE(NULLIF(to_jsonb(ac)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(ac)->>'createdAt', to_jsonb(ac)->>'created_at', to_jsonb(ac)->>'createdat', '') AS created_at
		FROM %s ac
		ORDER BY COALESCE(NULLIF(to_jsonb(ac)->>'order', '')::int, 0) ASC
	`, tableName))
	if err != nil {
		log.Printf("getActivityCategories query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
	}
	defer rows.Close()
	list := make([]activityCategory, 0)
	for rows.Next() {
		var c activityCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Order, &c.CreatedAt); err != nil {
			log.Printf("getActivityCategories scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
			return
		}
		list = append(list, c)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"categories": list})
}

func (h *Handler) createActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		Name  string `json:"name"`
		Order *int   `json:"order"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Category name is required"})
		return
	}
	orderNo := 0
	if body.Order != nil {
		orderNo = *body.Order
	} else {
		_ = h.store.Pool.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "activityCategories"`).Scan(&orderNo)
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "activityCategories" (id, name, "order", created_at) VALUES ($1,$2,$3,NOW()) RETURNING id
	`, fmt.Sprintf("activity_category_%d", time.Now().UnixNano()), body.Name, orderNo).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create category"})
		return
	}
	h.logAdmin(r.Context(), "create", "activityCategory", id, "info", user, map[string]any{"name": body.Name, "order": orderNo})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Category created successfully", "category": map[string]any{"id": id, "name": body.Name, "order": orderNo, "createdAt": toISO(time.Now())}})
}

func (h *Handler) deleteActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	defer tx.Rollback(r.Context())
	var name string
	if err := tx.QueryRow(r.Context(), `SELECT name FROM "activityCategories" WHERE id=$1`, id).Scan(&name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	_, err = tx.Exec(r.Context(), `DELETE FROM "activityCategories" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	_, err = tx.Exec(r.Context(), `DELETE FROM "activities" WHERE category=$1`, name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	h.logAdmin(r.Context(), "delete", "activityCategory", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities deleted successfully"})
}

func (h *Handler) patchActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}
	defer tx.Rollback(r.Context())

	var oldName string
	if err := tx.QueryRow(r.Context(), `SELECT name FROM "activityCategories" WHERE id=$1`, id).Scan(&oldName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}

	set := []string{}
	args := []any{}
	idx := 1
	for k, v := range patch {
		col := ""
		switch k {
		case "name":
			col = "name"
		case "order":
			col = `"order"`
		}
		if col == "" {
			continue
		}
		set = append(set, fmt.Sprintf("%s=$%d", col, idx))
		args = append(args, v)
		idx++
	}
	if len(set) > 0 {
		args = append(args, id)
		query := fmt.Sprintf(`UPDATE "activityCategories" SET %s WHERE id=$%d`, strings.Join(set, ","), idx)
		if _, err := tx.Exec(r.Context(), query, args...); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
			return
		}
	}

	if newNameAny, ok := patch["name"]; ok {
		if newName, ok := newNameAny.(string); ok && strings.TrimSpace(newName) != "" && newName != oldName {
			if _, err := tx.Exec(r.Context(), `UPDATE "activities" SET category=$1 WHERE category=$2`, newName, oldName); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
				return
			}
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}
	h.logAdmin(r.Context(), "update", "activityCategory", id, "info", user, map[string]any{"updates": patch})
	if _, ok := patch["name"]; ok {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities updated successfully"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category updated successfully"})
}

// technologies
