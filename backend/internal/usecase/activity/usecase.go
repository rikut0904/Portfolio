package activity

import (
	"context"
	"portfolio-backend/internal/domain/activity"
)

type Repository interface {
	List(ctx context.Context) ([]activity.Activity, error)
	GetByID(ctx context.Context, id string) (activity.Activity, error)
	Create(ctx context.Context, input activity.ActivityPayload) (activity.Activity, error)
	Update(ctx context.Context, id string, input activity.ActivityPayload) error
	Patch(ctx context.Context, id string, updates map[string]any) error
	Delete(ctx context.Context, id string) error

	ListCategories(ctx context.Context) ([]activity.Category, error)
	CreateCategory(ctx context.Context, input activity.ActivityCategoryPayload) (activity.Category, error)
	PatchCategory(ctx context.Context, id string, updates map[string]any) error
	DeleteCategory(ctx context.Context, id string) error
}

type Usecase interface {
	List(ctx context.Context) ([]activity.Activity, error)
	GetByID(ctx context.Context, id string) (activity.Activity, error)
	Create(ctx context.Context, input activity.ActivityPayload) (activity.Activity, error)
	Update(ctx context.Context, id string, input activity.ActivityPayload) error
	Patch(ctx context.Context, id string, updates map[string]any) error
	Delete(ctx context.Context, id string) error

	ListCategories(ctx context.Context) ([]activity.Category, error)
	CreateCategory(ctx context.Context, input activity.ActivityCategoryPayload) (activity.Category, error)
	PatchCategory(ctx context.Context, id string, updates map[string]any) error
	DeleteCategory(ctx context.Context, id string) error
}

type interactor struct {
	repo Repository
}

func New(repo Repository) Usecase {
	return &interactor{repo: repo}
}

func (u *interactor) List(ctx context.Context) ([]activity.Activity, error) {
	return u.repo.List(ctx)
}

func (u *interactor) GetByID(ctx context.Context, id string) (activity.Activity, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *interactor) Create(ctx context.Context, input activity.ActivityPayload) (activity.Activity, error) {
	return u.repo.Create(ctx, input)
}

func (u *interactor) Update(ctx context.Context, id string, input activity.ActivityPayload) error {
	return u.repo.Update(ctx, id, input)
}

func (u *interactor) Patch(ctx context.Context, id string, updates map[string]any) error {
	return u.repo.Patch(ctx, id, updates)
}

func (u *interactor) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}

func (u *interactor) ListCategories(ctx context.Context) ([]activity.Category, error) {
	return u.repo.ListCategories(ctx)
}

func (u *interactor) CreateCategory(ctx context.Context, input activity.ActivityCategoryPayload) (activity.Category, error) {
	return u.repo.CreateCategory(ctx, input)
}

func (u *interactor) PatchCategory(ctx context.Context, id string, updates map[string]any) error {
	return u.repo.PatchCategory(ctx, id, updates)
}

func (u *interactor) DeleteCategory(ctx context.Context, id string) error {
	return u.repo.DeleteCategory(ctx, id)
}
