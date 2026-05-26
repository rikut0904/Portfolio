package adminlog

import (
	"context"
	"portfolio-backend/internal/domain/adminlog"
)

type Repository interface {
	List(ctx context.Context, input adminlog.ListInput) (adminlog.ListOutput, error)
	Create(ctx context.Context, action string, entity string, entityID string, level string, userID string, userEmail string, details any) error
}

type Usecase interface {
	List(ctx context.Context, input adminlog.ListInput) (adminlog.ListOutput, error)
	CreateLog(ctx context.Context, action string, entity string, entityID string, level string, userID string, userEmail string, details any) error
}

type interactor struct {
	repo Repository
}

func New(repo Repository) Usecase {
	return &interactor{repo: repo}
}

func (u *interactor) List(ctx context.Context, input adminlog.ListInput) (adminlog.ListOutput, error) {
	return u.repo.List(ctx, input)
}

func (u *interactor) CreateLog(ctx context.Context, action string, entity string, entityID string, level string, userID string, userEmail string, details any) error {
	return u.repo.Create(ctx, action, entity, entityID, level, userID, userEmail, details)
}
