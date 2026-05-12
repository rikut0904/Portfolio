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

type activityModel struct {
	ID          string    `gorm:"column:id;primaryKey"`
	Title       string    `gorm:"column:title"`
	Description string    `gorm:"column:description"`
	Category    string    `gorm:"column:category"`
	Link        string    `gorm:"column:link"`
	Image       string    `gorm:"column:image"`
	Status      string    `gorm:"column:status"`
	Order       int       `gorm:"column:order"`
	CreatedAt   time.Time `gorm:"column:createdAt;autoCreateTime"`
	UpdatedAt   time.Time `gorm:"column:updatedAt;autoUpdateTime"`
}

func (activityModel) TableName() string {
	return "activities"
}

func (h *Handler) getActivities(w http.ResponseWriter, r *http.Request) {
	var models []activityModel
	err := h.store.DB.WithContext(r.Context()).Order("\"order\" DESC").Find(&models).Error
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activities"})
		return
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
}

func (h *Handler) getActivity(w http.ResponseWriter, r *http.Request) {
	id := routeParam(r, "id")
	var m activityModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activity"})
		return
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
	if body.Order == 0 {
		var maxOrder int
		_ = h.store.DB.WithContext(r.Context()).Model(&activityModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
		body.Order = maxOrder + 1
	}
	if body.Status == "" {
		body.Status = "非公開"
	}
	id := fmt.Sprintf("activity_%d", time.Now().UnixNano())
	m := activityModel{
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
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create activity"})
		return
	}
	h.logAdmin(r.Context(), "create", "activity", id, "info", user, map[string]any{"title": body.Title, "category": body.Category, "status": body.Status})
	body.ID = m.ID
	body.CreatedAt = toISO(m.CreatedAt)
	body.UpdatedAt = toISO(m.UpdatedAt)
	body.CreatedYear = m.CreatedAt.Year()
	body.CreatedMon = int(m.CreatedAt.Month())
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

	updates := make(map[string]any)
	for k, v := range patch {
		switch k {
		case "title", "description", "category", "link", "image", "status", "order":
			updates[k] = v
		}
	}
	if len(updates) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return
	}
	result := h.store.DB.WithContext(r.Context()).Model(&activityModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update activity"})
		return
	}
	if result.RowsAffected == 0 {
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
	result := h.store.DB.WithContext(r.Context()).Where("id = ?", id).Delete(&activityModel{})
	if result.Error != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete activity"})
		return
	}
	if result.RowsAffected == 0 {
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

type activityCategoryModel struct {
	ID        string    `gorm:"column:id;primaryKey"`
	Name      string    `gorm:"column:name"`
	Order     int       `gorm:"column:order"`
	CreatedAt time.Time `gorm:"column:createdAt;autoCreateTime"`
}

func (activityCategoryModel) TableName() string {
	return "activityCategories"
}

func (h *Handler) resolveActivityCategoryTable(ctx context.Context) (string, error) {
	m := h.store.DB.WithContext(ctx).Migrator()
	if m.HasTable("activityCategories") {
		return "\"activityCategories\"", nil
	}
	if m.HasTable("activity_categories") {
		return "activity_categories", nil
	}
	if m.HasTable("activitycategories") {
		return "activitycategories", nil
	}
	return "", errors.New("activity categories table not found")
}

func (h *Handler) getActivityCategories(w http.ResponseWriter, r *http.Request) {
	tableName, err := h.resolveActivityCategoryTable(r.Context())
	if err != nil {
		log.Printf("getActivityCategories resolve table error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
	}

	var models []activityCategoryModel
	err = h.store.DB.WithContext(r.Context()).Table(tableName).Order("\"order\" ASC").Find(&models).Error
	if err != nil {
		log.Printf("getActivityCategories query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
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
		var maxOrder int
		_ = h.store.DB.WithContext(r.Context()).Model(&activityCategoryModel{}).Select("MAX(\"order\")").Scan(&maxOrder)
		orderNo = maxOrder + 1
	}
	m := activityCategoryModel{
		ID:    fmt.Sprintf("activity_category_%d", time.Now().UnixNano()),
		Name:  body.Name,
		Order: orderNo,
	}
	if err := h.store.DB.WithContext(r.Context()).Create(&m).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create category"})
		return
	}
	h.logAdmin(r.Context(), "create", "activityCategory", m.ID, "info", user, map[string]any{"name": m.Name, "order": m.Order})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Category created successfully", "category": map[string]any{"id": m.ID, "name": m.Name, "order": m.Order, "createdAt": toISO(m.CreatedAt)}})
}

func (h *Handler) deleteActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := routeParam(r, "id")
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var m activityCategoryModel
		if err := tx.First(&m, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&m).Error; err != nil {
			return err
		}
		if err := tx.Model(&activityModel{}).Where("category = ?", m.Name).Delete(&activityModel{}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
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

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var old activityCategoryModel
		if err := tx.First(&old, "id = ?", id).Error; err != nil {
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
			if err := tx.Model(&activityModel{}).Where("category = ?", old.Name).Update("category", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
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
