package technology

import (
	"context"
	"strings"
	"time"

	domain "portfolio-backend/internal/domain/technology"
)

var (
	ErrInvalidTechnology   = domain.ErrInvalid
	ErrDuplicateTechnology = domain.ErrDuplicate
)

type Repository interface {
	List(ctx context.Context) ([]domain.Technology, error)
	Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Technology, error)
	Update(ctx context.Context, id string, input domain.Payload) error
	Delete(ctx context.Context, id string) error
}

type Usecase struct {
	repo Repository
}

func New(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

func (u *Usecase) List(ctx context.Context) ([]domain.Technology, error) {
	return u.repo.List(ctx)
}

func (u *Usecase) Create(ctx context.Context, input domain.Payload) (domain.Technology, error) {
	normalized, err := normalizePayload(input)
	if err != nil {
		return domain.Technology{}, err
	}
	return u.repo.Create(ctx, normalized, time.Now().UTC())
}

func (u *Usecase) Update(ctx context.Context, id string, input domain.Payload) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidTechnology
	}
	normalized, err := normalizePayload(input)
	if err != nil {
		return err
	}
	return u.repo.Update(ctx, id, normalized)
}

func (u *Usecase) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidTechnology
	}
	return u.repo.Delete(ctx, id)
}

func normalizePayload(input domain.Payload) (domain.Payload, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Category = strings.TrimSpace(input.Category)
	if input.Name == "" {
		return domain.Payload{}, ErrInvalidTechnology
	}
	return input, nil
}
