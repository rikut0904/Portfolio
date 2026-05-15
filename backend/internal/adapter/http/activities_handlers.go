package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"

	"gorm.io/gorm"
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

func (h *ActivityHandler) getActivities(w http.ResponseWriter, r *http.Request) error {
	var models []postgres.ActivityModel
	err := h.store.DB.WithContext(r.Context()).Order("\"order\" DESC").Find(&models).Error
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch activities", err)
	}
	list := make([]activity, 0, len(models))
	for _, m := range models {
		a := activity{
			ID:          m.ID,
			Title:       m.Title,
			Description: m.Description,
			Category:    m.Category,
			Link:        m.Link,
			Image:       m.Image,
			Status:      normalizeVisibilityStatus(m.Status),
			Order:       m.Order,
			CreatedAt:   toISO(m.CreatedAt),
			UpdatedAt:   toISO(m.UpdatedAt),
			CreatedYear: m.CreatedAt.Year(),
			CreatedMon:  int(m.CreatedAt.Month()),
			Techs:       []string{},
		}
		list = append(list, a)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"activities": list})
	return nil
}

func (h *ActivityHandler) getActivity(w http.ResponseWriter, r *http.Request) error {
	id := routeParam(r, "id")
	var m postgres.ActivityModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewAppError(http.StatusNotFound, "Activity not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch activity", err)
	}
	a := activity{
		ID:          m.ID,
		Title:       m.Title,
		Description: m.Description,
		Category:    m.Category,
		Link:        m.Link,
		Image:       m.Image,
		Status:      normalizeVisibilityStatus(m.Status),
		Order:       m.Order,
		CreatedAt:   toISO(m.CreatedAt),
		UpdatedAt:   toISO(m.UpdatedAt),
		CreatedYear: m.CreatedAt.Year(),
		CreatedMon:  int(m.CreatedAt.Month()),
		Techs:       []string{},
	}
	writeJSON(w, http.StatusOK, map[string]any{"activity": a})
	return nil
}

func (h *ActivityHandler) createActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body activity
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Category) == "" {
		return NewAppError(http.StatusBadRequest, "Title and category are required", nil)
	}
	if body.Order == 0 {
		var maxOrder int
		_ = h.store.DB.WithContext(r.Context()).Model(&postgres.ActivityModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
		body.Order = maxOrder + 1
	}
	if body.Status == "" {
		body.Status = "非公開"
	}
	id := fmt.Sprintf("activity_%d", time.Now().UnixNano())
	m := postgres.ActivityModel{
		ID:          id,
		Title:       body.Title,
		Description: body.Description,
		Category:    body.Category,
		Link:        body.Link,
		Image:       body.Image,
		Status:      body.Status,
		Order:       body.Order,
	}
	if err := h.store.DB.WithContext(r.Context()).Create(&m).Error; err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create activity", err)
	}
	h.logAdmin(r.Context(), "create", "activity", id, "info", user, map[string]any{"title": body.Title, "category": body.Category, "status": body.Status})
	body.ID = m.ID
	body.CreatedAt = toISO(m.CreatedAt)
	body.UpdatedAt = toISO(m.UpdatedAt)
	body.CreatedYear = m.CreatedAt.Year()
	body.CreatedMon = int(m.CreatedAt.Month())
	body.Techs = []string{}
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Activity created successfully", "activity": body})
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
	if len(patch) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return nil
	}
	if !partial {
		if _, ok := patch["title"]; !ok {
			return NewAppError(http.StatusBadRequest, "title is required", nil)
		}
	}

	updates := make(map[string]any)
	for k, v := range patch {
		switch k {
		case "title", "description", "category", "link", "image", "status", "order":
			updates[k] = v
		}
	}
	if len(updates) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return nil
	}
	result := h.store.DB.WithContext(r.Context()).Model(&postgres.ActivityModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update activity", result.Error)
	}
	if result.RowsAffected == 0 {
		return NewAppError(http.StatusNotFound, "Activity not found", nil)
	}
	h.logAdmin(r.Context(), "update", "activity", id, "info", user, func() any {
		if partial {
			return map[string]any{"updates": patch}
		}
		return map[string]any{}
	}())
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
	return nil
}

func (h *ActivityHandler) deleteActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	result := h.store.DB.WithContext(r.Context()).Where("id = ?", id).Delete(&postgres.ActivityModel{})
	if result.Error != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to delete activity", result.Error)
	}
	if result.RowsAffected == 0 {
		return NewAppError(http.StatusNotFound, "Activity not found", nil)
	}
	h.logAdmin(r.Context(), "delete", "activity", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity deleted successfully"})
	return nil
}

type activityCategory struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	CreatedAt string `json:"createdAt"`
}

func (h *ActivityHandler) getActivityCategories(w http.ResponseWriter, r *http.Request) error {
	var models []postgres.ActivityCategoryModel
	err := h.store.DB.WithContext(r.Context()).Model(&postgres.ActivityCategoryModel{}).Order("\"order\" ASC").Find(&models).Error
	if err != nil {
		log.Printf("getActivityCategories query error: %v", err)
		return NewAppError(http.StatusInternalServerError, "Failed to fetch categories", err)
	}
	list := make([]activityCategory, 0, len(models))
	for _, m := range models {
		list = append(list, activityCategory{
			ID:        m.ID,
			Name:      m.Name,
			Order:     m.Order,
			CreatedAt: toISO(m.CreatedAt),
		})
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"categories": list})
	return nil
}

func (h *ActivityHandler) createActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body struct {
		Name  string `json:"name"`
		Order *int   `json:"order"`
	}
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if strings.TrimSpace(body.Name) == "" {
		return NewAppError(http.StatusBadRequest, "Category name is required", nil)
	}
	orderNo := 0
	if body.Order != nil {
		orderNo = *body.Order
	} else {
		var maxOrder int
		_ = h.store.DB.WithContext(r.Context()).Model(&postgres.ActivityCategoryModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
		orderNo = maxOrder + 1
	}
	m := postgres.ActivityCategoryModel{
		ID:    fmt.Sprintf("activity_category_%d", time.Now().UnixNano()),
		Name:  body.Name,
		Order: orderNo,
	}
	if err := h.store.DB.WithContext(r.Context()).Create(&m).Error; err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create category", err)
	}
	h.logAdmin(r.Context(), "create", "activityCategory", m.ID, "info", user, map[string]any{"name": m.Name, "order": m.Order})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Category created successfully", "category": map[string]any{"id": m.ID, "name": m.Name, "order": m.Order, "createdAt": toISO(m.CreatedAt)}})
	return nil
}

func (h *ActivityHandler) deleteActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var m postgres.ActivityCategoryModel
		if err := tx.First(&m, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&m).Error; err != nil {
			return err
		}
		if err := tx.Model(&postgres.ActivityModel{}).Where("category = ?", m.Name).Delete(&postgres.ActivityModel{}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
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

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var old postgres.ActivityCategoryModel
		if err := tx.Model(&postgres.ActivityCategoryModel{}).First(&old, "id = ?", id).Error; err != nil {
			return err
		}

		updates := make(map[string]any)
		for k, v := range patch {
			if k == "name" || k == "order" {
				updates[k] = v
			}
		}

		if len(updates) > 0 {
			if err := tx.Model(&old).Updates(updates).Error; err != nil {
				return err
			}
		}

		if newName, ok := updates["name"].(string); ok && strings.TrimSpace(newName) != "" && newName != old.Name {
			if err := tx.Model(&postgres.ActivityModel{}).Where("category = ?", old.Name).Update("category", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewAppError(http.StatusNotFound, "Category not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to update category", err)
	}

	h.logAdmin(r.Context(), "update", "activityCategory", id, "info", user, map[string]any{"updates": patch})
	if _, ok := patch["name"]; ok {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities updated successfully"})
		return nil
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category updated successfully"})
	return nil
}
