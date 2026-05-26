package section

import (
	"context"
	"errors"
	"portfolio-backend/internal/domain/section"
)

var (
	ErrNotFound = errors.New("section not found")
)

type Repository interface {
	List(ctx context.Context) ([]section.Section, error)
	Create(ctx context.Context, input section.SectionPayload) (section.Section, error)
	Update(ctx context.Context, id string, data map[string]any) error
	UpdateMeta(ctx context.Context, id string, updates map[string]any) error
	Delete(ctx context.Context, id string) error
}

type Usecase interface {
	List(ctx context.Context) ([]section.Section, error)
	Create(ctx context.Context, input section.SectionPayload) (section.Section, error)
	Update(ctx context.Context, id string, data map[string]any) error
	UpdateMeta(ctx context.Context, id string, updates map[string]any) error
	Delete(ctx context.Context, id string) error
}

type interactor struct {
	repo Repository
}

func New(repo Repository) Usecase {
	return &interactor{repo: repo}
}

func (u *interactor) List(ctx context.Context) ([]section.Section, error) {
	return u.repo.List(ctx)
}

func (u *interactor) Create(ctx context.Context, input section.SectionPayload) (section.Section, error) {
	return u.repo.Create(ctx, input)
}

func (u *interactor) Update(ctx context.Context, id string, data map[string]any) error {
	return u.repo.Update(ctx, id, data)
}

func (u *interactor) UpdateMeta(ctx context.Context, id string, updates map[string]any) error {
	return u.repo.UpdateMeta(ctx, id, updates)
}

func (u *interactor) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}
