package postgres

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
	"portfolio-backend/internal/domain/activity"
)

type ActivityRepository struct{ store *Store }

func NewActivityRepository(store *Store) *ActivityRepository {
	return &ActivityRepository{store: store}
}

func (r *ActivityRepository) List(ctx context.Context) ([]activity.Activity, error) {
	var rows []ActivityModel
	if err := r.store.DB.WithContext(ctx).Order(`"order" DESC`).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]activity.Activity, 0, len(rows))
	for _, row := range rows {
		result = append(result, activityFromModel(row))
	}
	return result, nil
}

func (r *ActivityRepository) GetByID(ctx context.Context, id string) (activity.Activity, error) {
	var row ActivityModel
	if err := r.store.DB.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if err.Error() == "record not found" {
			return activity.Activity{}, errors.New("not found")
		}
		return activity.Activity{}, err
	}
	return activityFromModel(row), nil
}

func (r *ActivityRepository) Create(ctx context.Context, input activity.ActivityPayload) (activity.Activity, error) {
	order := input.Order
	if order == 0 {
		_ = r.store.DB.WithContext(ctx).Model(&ActivityModel{}).Select(`MAX("order")`).Scan(&order)
		order++
	}
	row := ActivityModel{ID: newUUID(), Title: input.Title, Description: input.Description, Category: input.Category, Link: input.Link, Image: input.Image, Status: input.Status, Order: order}
	if row.Status == "" {
		row.Status = "非公開"
	}
	if err := r.store.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return activity.Activity{}, err
	}
	return activityFromModel(row), nil
}

func (r *ActivityRepository) Update(ctx context.Context, id string, input activity.ActivityPayload) error {
	return r.update(ctx, id, map[string]any{"title": input.Title, "description": input.Description, "category": input.Category, "link": input.Link, "image": input.Image, "status": input.Status, "order": input.Order})
}
func (r *ActivityRepository) Patch(ctx context.Context, id string, updates map[string]any) error {
	return r.update(ctx, id, updates)
}
func (r *ActivityRepository) update(ctx context.Context, id string, updates map[string]any) error {
	result := r.store.DB.WithContext(ctx).Model(&ActivityModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("not found")
	}
	return nil
}
func (r *ActivityRepository) Delete(ctx context.Context, id string) error {
	result := r.store.DB.WithContext(ctx).Where("id = ?", id).Delete(&ActivityModel{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("not found")
	}
	return nil
}

func (r *ActivityRepository) ListCategories(ctx context.Context) ([]activity.Category, error) {
	var rows []ActivityCategoryModel
	if err := r.store.DB.WithContext(ctx).Order(`"order" ASC`).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]activity.Category, 0, len(rows))
	for _, row := range rows {
		result = append(result, categoryFromModel(row))
	}
	return result, nil
}
func (r *ActivityRepository) CreateCategory(ctx context.Context, input activity.ActivityCategoryPayload) (activity.Category, error) {
	order := 0
	if input.Order != nil {
		order = *input.Order
	} else {
		_ = r.store.DB.WithContext(ctx).Model(&ActivityCategoryModel{}).Select(`MAX("order")`).Scan(&order)
		order++
	}
	row := ActivityCategoryModel{ID: newUUID(), Name: input.Name, Order: order}
	if err := r.store.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return activity.Category{}, err
	}
	return categoryFromModel(row), nil
}
func (r *ActivityRepository) PatchCategory(ctx context.Context, id string, updates map[string]any) error {
	return r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row ActivityCategoryModel
		if err := tx.First(&row, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Model(&row).Updates(updates).Error; err != nil {
			return err
		}
		if name, ok := updates["name"].(string); ok && strings.TrimSpace(name) != "" {
			return tx.Model(&ActivityModel{}).Where("category = ?", row.Name).Update("category", name).Error
		}
		return nil
	})
}
func (r *ActivityRepository) DeleteCategory(ctx context.Context, id string) error {
	return r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row ActivityCategoryModel
		if err := tx.First(&row, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&row).Error; err != nil {
			return err
		}
		return tx.Model(&ActivityModel{}).Where("category = ?", row.Name).Delete(&ActivityModel{}).Error
	})
}

func activityFromModel(row ActivityModel) activity.Activity {
	return activity.Activity{ID: row.ID, Title: row.Title, Description: row.Description, Category: row.Category, Link: row.Link, Image: row.Image, Status: row.Status, Order: row.Order, CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339), UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339), CreatedYear: row.CreatedAt.Year(), CreatedMon: int(row.CreatedAt.Month())}
}
func categoryFromModel(row ActivityCategoryModel) activity.Category {
	return activity.Category{ID: row.ID, Name: row.Name, Order: row.Order, CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339)}
}
