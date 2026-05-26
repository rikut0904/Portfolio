package technology

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "portfolio-backend/internal/domain/technology"
)

var (
	ErrInvalidTechnology   = domain.ErrInvalid
	ErrDuplicateTechnology = domain.ErrDuplicate
	ErrNotFound            = errors.New("technology not found")
)

type Repository interface {
	List(ctx context.Context) ([]domain.Technology, error)
	Create(ctx context.Context, input domain.TechnologyPayload, now time.Time) (domain.Technology, error)
	Update(ctx context.Context, id string, input domain.TechnologyPayload) error
	Delete(ctx context.Context, id string) error
}

type Usecase interface {
	List(ctx context.Context) ([]domain.Technology, error)
	Create(ctx context.Context, input domain.TechnologyPayload) (domain.Technology, error)
	Update(ctx context.Context, id string, input domain.TechnologyPayload) error
	Delete(ctx context.Context, id string) error
}

type interactor struct {
	repo Repository
}

func New(repo Repository) Usecase {
	return &interactor{repo: repo}
}

func (u *interactor) List(ctx context.Context) ([]domain.Technology, error) {
	return u.repo.List(ctx)
}

func (u *interactor) Create(ctx context.Context, input domain.TechnologyPayload) (domain.Technology, error) {
	normalized, err := normalizePayload(input)
	if err != nil {
		return domain.Technology{}, err
	}
	return u.repo.Create(ctx, normalized, time.Now().UTC())
}

func (u *interactor) Update(ctx context.Context, id string, input domain.TechnologyPayload) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidTechnology
	}
	normalized, err := normalizePayload(input)
	if err != nil {
		return err
	}
	return u.repo.Update(ctx, id, normalized)
}

func (u *interactor) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidTechnology
	}
	return u.repo.Delete(ctx, id)
}

func normalizePayload(input domain.TechnologyPayload) (domain.TechnologyPayload, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Category = strings.TrimSpace(input.Category)
	if input.Name == "" {
		return domain.TechnologyPayload{}, ErrInvalidTechnology
	}
	return input, nil
}
