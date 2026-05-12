package postgres

import (
	"context"
	"fmt"
	"time"

	domain "portfolio-backend/internal/domain/technology"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

type TechnologyRepository struct {
	store *Store
}

func NewTechnologyRepository(store *Store) *TechnologyRepository {
	return &TechnologyRepository{store: store}
}

type technologyModel struct {
	ID        string    `gorm:"primaryKey;column:id"`
	Name      string    `gorm:"column:name"`
	Category  string    `gorm:"column:category"`
	CreatedAt time.Time `gorm:"column:createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt"`
}

func (technologyModel) TableName() string {
	return "technologies"
}

func (r *TechnologyRepository) List(ctx context.Context) ([]domain.Technology, error) {
	var models []technologyModel
	if err := r.store.DB.WithContext(ctx).Order("name ASC").Find(&models).Error; err != nil {
		return nil, err
	}

	list := make([]domain.Technology, 0, len(models))
	for _, m := range models {
		list = append(list, domain.Technology{
			ID:        m.ID,
			Name:      m.Name,
			Category:  m.Category,
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
		})
	}
	return list, nil
}

func (r *TechnologyRepository) Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Technology, error) {
	var count int64
	if err := r.store.DB.WithContext(ctx).Model(&technologyModel{}).Where("LOWER(name) = LOWER(?)", input.Name).Count(&count).Error; err != nil {
		return domain.Technology{}, err
	}
	if count > 0 {
		return domain.Technology{}, domain.ErrDuplicate
	}

	model := technologyModel{
		ID:        fmt.Sprintf("tech_%d", now.UnixNano()),
		Name:      input.Name,
		Category:  input.Category,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := r.store.DB.WithContext(ctx).Create(&model).Error; err != nil {
		return domain.Technology{}, err
	}

	return domain.Technology{
		ID:        model.ID,
		Name:      model.Name,
		Category:  model.Category,
		CreatedAt: model.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (r *TechnologyRepository) Update(ctx context.Context, id string, input domain.Payload) error {
	var count int64
	if err := r.store.DB.WithContext(ctx).Model(&technologyModel{}).Where("LOWER(name) = LOWER(?) AND id <> ?", input.Name, id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return domain.ErrDuplicate
	}

	result := r.store.DB.WithContext(ctx).Model(&technologyModel{}).Where("id = ?", id).Updates(map[string]any{
		"name":      input.Name,
		"category":  input.Category,
		"updatedAt": time.Now(),
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return technologyusecase.ErrNotFound
	}
	return nil
}

func (r *TechnologyRepository) Delete(ctx context.Context, id string) error {
	result := r.store.DB.WithContext(ctx).Delete(&technologyModel{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return technologyusecase.ErrNotFound
	}
	return nil
}
