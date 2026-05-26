package v2

import (
	"context"
	"errors"
	"portfolio-backend/internal/domain/activity"
)

type ActivityRepository struct {
	*Repository
}

func NewActivityRepository(base *Repository) *ActivityRepository {
	return &ActivityRepository{base}
}

func (r *ActivityRepository) List(ctx context.Context) ([]activity.Activity, error) {
	return nil, errors.New("not implemented")
}

func (r *ActivityRepository) GetByID(ctx context.Context, id string) (activity.Activity, error) {
	return activity.Activity{}, errors.New("not implemented")
}

func (r *ActivityRepository) Create(ctx context.Context, input activity.ActivityPayload) (activity.Activity, error) {
	return activity.Activity{}, errors.New("not implemented")
}

func (r *ActivityRepository) Update(ctx context.Context, id string, input activity.ActivityPayload) error {
	return errors.New("not implemented")
}

func (r *ActivityRepository) Patch(ctx context.Context, id string, updates map[string]any) error {
	return errors.New("not implemented")
}

func (r *ActivityRepository) Delete(ctx context.Context, id string) error {
	return errors.New("not implemented")
}

func (r *ActivityRepository) ListCategories(ctx context.Context) ([]activity.Category, error) {
	return nil, errors.New("not implemented")
}

func (r *ActivityRepository) CreateCategory(ctx context.Context, input activity.ActivityCategoryPayload) (activity.Category, error) {
	return activity.Category{}, errors.New("not implemented")
}

func (r *ActivityRepository) PatchCategory(ctx context.Context, id string, updates map[string]any) error {
	return errors.New("not implemented")
}

func (r *ActivityRepository) DeleteCategory(ctx context.Context, id string) error {
	return errors.New("not implemented")
}
