package httpapi

import (
	"errors"
	"log"
	"net/http"

	domain "portfolio-backend/internal/domain/technology"
	"portfolio-backend/internal/infrastructure/auth"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

func (h *TechnologyHandler) getTechnologies(w http.ResponseWriter, r *http.Request) error {
	list, err := h.usecase.List(r.Context())
	if err != nil {
		log.Printf("getTechnologies usecase error: %v", err)
		return NewAppError(http.StatusInternalServerError, "Failed to fetch technologies", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"technologies": list})
	return nil
}

func (h *TechnologyHandler) createTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body domain.TechnologyPayload
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	technology, err := h.usecase.Create(r.Context(), body)
	if errors.Is(err, technologyusecase.ErrInvalidTechnology) {
		return NewAppError(http.StatusBadRequest, "Technology name is required", err)
	}
	if errors.Is(err, technologyusecase.ErrDuplicateTechnology) {
		return NewAppError(http.StatusBadRequest, "Technology already exists", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create technology", err)
	}
	h.logAdmin(r.Context(), "create", "technology", technology.ID, "info", user, map[string]any{"name": technology.Name, "category": technology.Category})
	writeJSON(w, http.StatusCreated, map[string]any{"technology": technology})
	return nil
}

func (h *TechnologyHandler) updateTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var body domain.TechnologyPayload
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	err := h.usecase.Update(r.Context(), id, body)
	if errors.Is(err, technologyusecase.ErrInvalidTechnology) {
		return NewAppError(http.StatusBadRequest, "Technology name is required", err)
	}
	if errors.Is(err, technologyusecase.ErrDuplicateTechnology) {
		return NewAppError(http.StatusBadRequest, "Technology with this name already exists", err)
	}
	if errors.Is(err, technologyusecase.ErrNotFound) {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update technology", err)
	}
	h.logAdmin(r.Context(), "update", "technology", id, "info", user, map[string]any{"name": body.Name, "category": body.Category})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}

func (h *TechnologyHandler) deleteTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	err := h.usecase.Delete(r.Context(), id)
	if errors.Is(err, technologyusecase.ErrNotFound) {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to delete technology", err)
	}
	h.logAdmin(r.Context(), "delete", "technology", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}
