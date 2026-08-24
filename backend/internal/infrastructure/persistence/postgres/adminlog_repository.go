package postgres

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"strings"

	"portfolio-backend/internal/domain/adminlog"
)

type AdminLogRepository struct{ store *Store }

func NewAdminLogRepository(store *Store) *AdminLogRepository {
	return &AdminLogRepository{store: store}
}

type adminLogCursor struct {
	CreatedAt string `json:"createdAt"`
	ID        string `json:"id"`
}

func (r *AdminLogRepository) List(ctx context.Context, input adminlog.ListInput) (adminlog.ListOutput, error) {
	limit := input.Limit
	if limit < 1 {
		limit = 10
	}
	query := r.store.DB.WithContext(ctx)
	if raw := strings.TrimSpace(input.Cursor); raw != "" {
		if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil {
			var cursor adminLogCursor
			if json.Unmarshal(decoded, &cursor) == nil && cursor.CreatedAt != "" && cursor.ID != "" {
				query = query.Where(`("createdAt", id) < (?, ?)`, cursor.CreatedAt, cursor.ID)
			}
		}
	}
	var models []AdminLogModel
	if err := query.Order(`"createdAt" DESC, id DESC`).Limit(limit).Find(&models).Error; err != nil {
		return adminlog.ListOutput{}, err
	}
	logs := make([]adminlog.AdminLog, 0, len(models))
	for _, model := range models {
		logs = append(logs, adminlog.AdminLog{ID: model.ID, Action: model.Action, Entity: model.Entity, EntityID: model.EntityID, UserID: model.UserID, UserEmail: model.UserEmail, Level: model.Level, Details: model.Details, CreatedAt: model.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00")})
	}
	var nextCursor any
	if len(models) == limit {
		cursor := adminLogCursor{CreatedAt: models[len(models)-1].CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00"), ID: models[len(models)-1].ID}
		encoded, _ := json.Marshal(cursor)
		nextCursor = base64.StdEncoding.EncodeToString(encoded)
	}
	return adminlog.ListOutput{Logs: logs, NextCursor: nextCursor}, nil
}

func (r *AdminLogRepository) Create(ctx context.Context, action, entity, entityID, level, userID, userEmail string, details any) error {
	encoded, err := json.Marshal(details)
	if err != nil || len(encoded) == 0 || string(encoded) == "null" {
		encoded = []byte("{}")
	}
	model := AdminLogModel{ID: newUUID(), Action: action, Entity: nullableString(entity), EntityID: nullableString(entityID), UserID: nullableString(userID), UserEmail: nullableString(userEmail), Level: level, Details: encoded}
	return r.store.DB.WithContext(ctx).Create(&model).Error
}
