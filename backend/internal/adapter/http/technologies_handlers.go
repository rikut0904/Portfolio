package httpapi

import (
	"errors"
	"log"
	"net/http"

	domain "portfolio-backend/internal/domain/technology"
	"portfolio-backend/internal/infrastructure/auth"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

func (h *Handler) getTechnologies(w http.ResponseWriter, r *http.Request) {
	list, err := h.technologies.List(r.Context())
	if err != nil {
		log.Printf("getTechnologies usecase error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch technologies"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"technologies": list})
}

func (h *Handler) createTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body domain.Payload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	technology, err := h.technologies.Create(r.Context(), body)
	if errors.Is(err, technologyusecase.ErrInvalidTechnology) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	if errors.Is(err, technologyusecase.ErrDuplicateTechnology) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology already exists"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create technology"})
		return
	}
	h.logAdmin(r.Context(), "create", "technology", technology.ID, "info", user, map[string]any{"name": technology.Name, "category": technology.Category})
	writeJSON(w, http.StatusCreated, map[string]any{"technology": technology})
}

func (h *Handler) updateTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	var body domain.Payload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	err := h.technologies.Update(r.Context(), id, body)
	if errors.Is(err, technologyusecase.ErrInvalidTechnology) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	if errors.Is(err, technologyusecase.ErrDuplicateTechnology) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology with this name already exists"})
		return
	}
	if errors.Is(err, technologyusecase.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update technology"})
		return
	}
	h.logAdmin(r.Context(), "update", "technology", id, "info", user, map[string]any{"name": body.Name, "category": body.Category})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	err := h.technologies.Delete(r.Context(), id)
	if errors.Is(err, technologyusecase.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete technology"})
		return
	}
	h.logAdmin(r.Context(), "delete", "technology", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// inquiries
