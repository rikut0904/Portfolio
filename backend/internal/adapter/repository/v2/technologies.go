package v2

import (
	"context"
	"portfolio-backend/internal/domain/technology"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	technologyusecase "portfolio-backend/internal/usecase/technology"
	"time"

	"github.com/google/uuid"
)

type TechnologyRepository struct {
	*Repository
}

func NewTechnologyRepository(base *Repository) *TechnologyRepository {
	return &TechnologyRepository{base}
}

func (r *TechnologyRepository) List(ctx context.Context) ([]technology.Technology, error) {
	var models []postgres.TechnologyModel
	if err := r.store.DB.WithContext(ctx).Order("name ASC").Find(&models).Error; err != nil {
		return nil, err
	}

	list := make([]technology.Technology, 0, len(models))
	for _, m := range models {
		list = append(list, technology.Technology{
			ID:        m.ID,
			Name:      m.Name,
			Category:  m.Category,
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
		})
	}
	return list, nil
}

func (r *TechnologyRepository) Create(ctx context.Context, input technology.TechnologyPayload, now time.Time) (technology.Technology, error) {
	model := postgres.TechnologyModel{
		ID:        uuid.New().String(),
		Name:      input.Name,
		Category:  input.Category,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := r.store.DB.WithContext(ctx).Create(&model).Error; err != nil {
		return technology.Technology{}, err
	}

	return technology.Technology{
		ID:        model.ID,
		Name:      model.Name,
		Category:  model.Category,
		CreatedAt: model.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (r *TechnologyRepository) Update(ctx context.Context, id string, input technology.TechnologyPayload) error {
	result := r.store.DB.WithContext(ctx).Model(&postgres.TechnologyModel{}).Where("id = ?", id).Updates(map[string]any{
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
	result := r.store.DB.WithContext(ctx).Delete(&postgres.TechnologyModel{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return technologyusecase.ErrNotFound
	}
	return nil
}
