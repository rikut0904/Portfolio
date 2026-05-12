package httpapi

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	domain "portfolio-backend/internal/domain/product"
	"portfolio-backend/internal/infrastructure/auth"
	productusecase "portfolio-backend/internal/usecase/product"
)

func nullToString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

type productPayload = domain.Payload

func (h *Handler) getProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	out, err := h.products.List(r.Context(), productusecase.ListInput{
		Category:     q.Get("category"),
		Status:       q.Get("status"),
		DeployStatus: q.Get("deployStatus"),
		CreatedYear:  parseIntDefault(q.Get("createdYear"), 0),
		CreatedMonth: parseIntDefault(q.Get("createdMonth"), 0),
		Technologies: splitCSV(q.Get("technologies")),
		SortBy:       q.Get("sortBy"),
		Page:         parseIntDefault(q.Get("page"), 1),
		Limit:        parseIntDefault(q.Get("limit"), 100),
	})
	if err != nil {
		log.Printf("getProducts usecase error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch products"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"products":   out.Products,
		"pagination": out.Pagination,
	})
}

func (h *Handler) createProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	product, err := h.products.Create(r.Context(), body)
	if errors.Is(err, productusecase.ErrInvalidProduct) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create product"})
		return
	}

	h.logAdmin(r.Context(), "create", "product", product.ID, "info", user, map[string]any{"title": product.Title, "status": product.Status, "deployStatus": product.Deploy})
	writeJSON(w, http.StatusCreated, map[string]any{"product": product})
}

func (h *Handler) updateProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	err := h.products.Update(r.Context(), id, body)
	if errors.Is(err, productusecase.ErrInvalidProduct) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	if errors.Is(err, productusecase.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update product"})
		return
	}
	h.logAdmin(r.Context(), "update", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	err := h.products.Delete(r.Context(), id)
	if errors.Is(err, productusecase.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete product"})
		return
	}
	h.logAdmin(r.Context(), "delete", "product", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// sections
