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

func (h *ProductHandler) getProducts(w http.ResponseWriter, r *http.Request) error {
	q := r.URL.Query()
	out, err := h.usecase.List(r.Context(), productusecase.ListInput{
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
		return NewAppError(http.StatusInternalServerError, "Failed to fetch products", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"products":   out.Products,
		"pagination": out.Pagination,
	})
	return nil
}

func (h *ProductHandler) createProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	product, err := h.usecase.Create(r.Context(), body)
	if errors.Is(err, productusecase.ErrInvalidProduct) {
		return NewAppError(http.StatusBadRequest, "Title and description are required", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create product", err)
	}

	h.logAdmin(r.Context(), "create", "product", product.ID, "info", user, map[string]any{"title": product.Title, "status": product.Status, "deployStatus": product.Deploy})
	writeJSON(w, http.StatusCreated, map[string]any{"product": product})
	return nil
}

func (h *ProductHandler) updateProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	err := h.usecase.Update(r.Context(), id, body)
	if errors.Is(err, productusecase.ErrInvalidProduct) {
		return NewAppError(http.StatusBadRequest, "Title and description are required", err)
	}
	if errors.Is(err, productusecase.ErrNotFound) {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update product", err)
	}
	h.logAdmin(r.Context(), "update", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}

func (h *ProductHandler) deleteProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	err := h.usecase.Delete(r.Context(), id)
	if errors.Is(err, productusecase.ErrNotFound) {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to delete product", err)
	}
	h.logAdmin(r.Context(), "delete", "product", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}
