package httpapi

import (
	"net/http"
	"strings"

	"portfolio-backend/internal/domain/activity"
	"portfolio-backend/internal/infrastructure/auth"
)

func (h *ActivityHandler) getActivities(w http.ResponseWriter, r *http.Request) error {
	list, err := h.usecase.List(r.Context())
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch activities", err)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"activities": list})
	return nil
}
func (h *ActivityHandler) getActivity(w http.ResponseWriter, r *http.Request) error {
	item, err := h.usecase.GetByID(r.Context(), routeParam(r, "id"))
	if err != nil {
		if err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Activity not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch activity", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": item})
	return nil
}

func (h *ActivityHandler) createActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var input activity.ActivityPayload
	if err := decodeBody(r, &input); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Category) == "" {
		return NewAppError(http.StatusBadRequest, "Title and category are required", nil)
	}
	created, err := h.usecase.Create(r.Context(), input)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create activity", err)
	}
	h.logAdmin(r.Context(), "create", "activity", created.ID, "info", user, map[string]any{"title": created.Title, "category": created.Category, "status": created.Status})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Activity created successfully", "activity": created})
	return nil
}
func (h *ActivityHandler) updateActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	return h.upsertActivityByID(w, r, user, false)
}
func (h *ActivityHandler) patchActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	return h.upsertActivityByID(w, r, user, true)
}
func (h *ActivityHandler) upsertActivityByID(w http.ResponseWriter, r *http.Request, user *auth.Claims, partial bool) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if !partial {
		if _, ok := patch["title"]; !ok {
			return NewAppError(http.StatusBadRequest, "title is required", nil)
		}
	}
	if len(patch) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return nil
	}
	updates := map[string]any{}
	for key, value := range patch {
		switch key {
		case "title", "description", "category", "link", "image", "status", "order":
			updates[key] = value
		}
	}
	if len(updates) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return nil
	}
	if err := h.usecase.Patch(r.Context(), id, updates); err != nil {
		if err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Activity not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to update activity", err)
	}
	h.logAdmin(r.Context(), "update", "activity", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
	return nil
}
func (h *ActivityHandler) deleteActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	if err := h.usecase.Delete(r.Context(), id); err != nil {
		if err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Activity not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to delete activity", err)
	}
	h.logAdmin(r.Context(), "delete", "activity", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity deleted successfully"})
	return nil
}

func (h *ActivityHandler) getActivityCategories(w http.ResponseWriter, r *http.Request) error {
	list, err := h.usecase.ListCategories(r.Context())
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch categories", err)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"categories": list})
	return nil
}
func (h *ActivityHandler) createActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var input activity.ActivityCategoryPayload
	if err := decodeBody(r, &input); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if strings.TrimSpace(input.Name) == "" {
		return NewAppError(http.StatusBadRequest, "Category name is required", nil)
	}
	created, err := h.usecase.CreateCategory(r.Context(), input)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create category", err)
	}
	h.logAdmin(r.Context(), "create", "activityCategory", created.ID, "info", user, map[string]any{"name": created.Name, "order": created.Order})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Category created successfully", "category": created})
	return nil
}
func (h *ActivityHandler) deleteActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	if err := h.usecase.DeleteCategory(r.Context(), id); err != nil {
		if err.Error() == "record not found" || err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Category not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to delete category", err)
	}
	h.logAdmin(r.Context(), "delete", "activityCategory", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities deleted successfully"})
	return nil
}
func (h *ActivityHandler) patchActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if err := h.usecase.PatchCategory(r.Context(), id, patch); err != nil {
		if err.Error() == "record not found" || err.Error() == "not found" {
			return NewAppError(http.StatusNotFound, "Category not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to update category", err)
	}
	h.logAdmin(r.Context(), "update", "activityCategory", id, "info", user, map[string]any{"updates": patch})
	message := "Category updated successfully"
	if _, ok := patch["name"]; ok {
		message = "Category and related activities updated successfully"
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": message})
	return nil
}
