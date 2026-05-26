package v2

import (
	"context"
	"errors"
	"portfolio-backend/internal/domain/adminlog"
)

type AdminLogRepository struct {
	*Repository
}

func NewAdminLogRepository(base *Repository) *AdminLogRepository {
	return &AdminLogRepository{base}
}

func (r *AdminLogRepository) List(ctx context.Context, input adminlog.ListInput) (adminlog.ListOutput, error) {
	return adminlog.ListOutput{}, errors.New("not implemented")
}

func (r *AdminLogRepository) Create(ctx context.Context, action string, entity string, entityID string, level string, userID string, userEmail string, details any) error {
	return errors.New("not implemented")
}
