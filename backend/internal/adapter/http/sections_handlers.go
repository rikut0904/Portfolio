package httpapi

import (
	"encoding/json"
	"net/http"

	"portfolio-backend/internal/domain/section"
	"portfolio-backend/internal/infrastructure/auth"
)

func (h *SectionHandler) getSections(w http.ResponseWriter, r *http.Request) error {
	sections, err := h.usecase.List(r.Context())
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch sections", err)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"sections": sections})
	return nil
}

func (h *SectionHandler) createSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body struct {
		ID          string          `json:"id"`
		DisplayName string          `json:"displayName"`
		Type        string          `json:"type"`
		Order       *int            `json:"order"`
		SortOrder   string          `json:"sortOrder"`
		Data        json.RawMessage `json:"data"`
	}
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if body.Data == nil {
		body.Data = json.RawMessage(`{}`)
	}
	created, err := h.usecase.Create(r.Context(), section.SectionPayload{ID: body.ID, DisplayName: body.DisplayName, TypeName: body.Type, Order: body.Order, Data: body.Data})
	if err != nil {
		if err.Error() == "conflict" {
			return NewAppError(http.StatusConflict, "Section with this ID already exists", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to create section", err)
	}
	h.logAdmin(r.Context(), "create", "section", body.ID, "info", user, map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": created.Meta.Order})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Section created successfully", "section": map[string]any{"id": created.ID, "meta": map[string]any{"displayName": created.Meta.DisplayName, "type": created.Meta.TypeName, "order": created.Meta.Order, "editable": created.Meta.Editable, "sortOrder": body.SortOrder}, "data": created.Data}})
	return nil
}

func (h *SectionHandler) updateSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if err := h.usecase.Update(r.Context(), id, patch); err != nil {
		if err.Error() == "record not found" || err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to update section", err)
	}
	h.logAdmin(r.Context(), "update", "section", id, "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
	return nil
}

func (h *SectionHandler) patchSectionMeta(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	updates := map[string]any{}
	for key, value := range patch {
		switch key {
		case "displayName":
			updates["displayName"] = value
		case "type":
			updates["typeName"] = value
		case "order":
			switch order := value.(type) {
			case float64:
				updates["order"] = int(order)
			case int:
				updates["order"] = order
			}
		case "editable":
			updates["editable"] = value
		}
	}
	if len(updates) > 0 {
		if err := h.usecase.UpdateMeta(r.Context(), id, updates); err != nil {
			return NewAppError(http.StatusInternalServerError, "Failed to update section meta", err)
		}
	}
	h.logAdmin(r.Context(), "update", "section", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
	return nil
}

func (h *SectionHandler) deleteSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	if err := h.usecase.Delete(r.Context(), id); err != nil {
		if err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to delete section", err)
	}
	h.logAdmin(r.Context(), "delete", "section", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Section deleted successfully"})
	return nil
}
