package httpapi

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
)

func (h *Handler) getTechnologies(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			t.id,
			t.name,
			t.category,
			COALESCE(to_jsonb(t)->>'createdAt', to_jsonb(t)->>'created_at', to_jsonb(t)->>'createdat', '') AS created_at
		FROM "technologies" t
		ORDER BY t.name ASC
	`)
	if err != nil {
		log.Printf("getTechnologies query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch technologies"})
		return
	}
	defer rows.Close()
	list := make([]map[string]any, 0)
	for rows.Next() {
		var id, name, category sql.NullString
		var ct sql.NullString
		if err := rows.Scan(&id, &name, &category, &ct); err != nil {
			log.Printf("getTechnologies scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch technologies"})
			return
		}
		createdAt := ""
		if ct.Valid {
			createdAt = ct.String
		}
		list = append(list, map[string]any{
			"id":        nullToString(id),
			"name":      nullToString(name),
			"category":  nullToString(category),
			"createdAt": createdAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"technologies": list})
}

func (h *Handler) createTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	var exists bool
	if err := h.store.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM technologies WHERE LOWER(name)=LOWER($1))`, name).Scan(&exists); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create technology"})
		return
	}
	if exists {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology already exists"})
		return
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `INSERT INTO "technologies" (id, name, category, "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) RETURNING id`, fmt.Sprintf("tech_%d", time.Now().UnixNano()), name, body.Category).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create technology"})
		return
	}
	h.logAdmin(r.Context(), "create", "technology", id, "info", user, map[string]any{"name": name, "category": body.Category})
	writeJSON(w, http.StatusCreated, map[string]any{"technology": map[string]any{"id": id, "name": name, "category": body.Category, "createdAt": toISO(time.Now())}})
}

func (h *Handler) updateTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	var dup bool
	if err := h.store.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM "technologies" WHERE LOWER(name)=LOWER($1) AND id<>$2)`, name, id).Scan(&dup); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update technology"})
		return
	}
	if dup {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology with this name already exists"})
		return
	}
	cmd, err := h.store.Pool.Exec(r.Context(), `UPDATE "technologies" SET name=$1, category=$2, "updatedAt"=NOW() WHERE id=$3`, name, body.Category, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update technology"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "technology", id, "info", user, map[string]any{"name": name, "category": body.Category})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "technologies" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete technology"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "technology", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// inquiries
