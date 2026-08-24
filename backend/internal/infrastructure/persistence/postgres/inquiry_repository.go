package postgres

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"portfolio-backend/internal/domain/inquiry"
)

type InquiryRepository struct{ store *Store }

func NewInquiryRepository(store *Store) *InquiryRepository { return &InquiryRepository{store: store} }

func (r *InquiryRepository) List(ctx context.Context) ([]inquiry.Inquiry, error) {
	var rows []InquiryModel
	if err := r.store.DB.WithContext(ctx).Order(`"createdAt" DESC`).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]inquiry.Inquiry, 0, len(rows))
	for _, row := range rows {
		result = append(result, inquiryFromModel(row))
	}
	return result, nil
}
func (r *InquiryRepository) GetByID(ctx context.Context, id string) (inquiry.Inquiry, []inquiry.Reply, error) {
	var row InquiryModel
	if err := r.store.DB.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return inquiry.Inquiry{}, nil, inquiry.ErrNotFound
		}
		return inquiry.Inquiry{}, nil, err
	}
	replies, err := r.replies(ctx, row.ID)
	return inquiryFromModel(row), replies, err
}
func (r *InquiryRepository) GetByThreadID(ctx context.Context, threadID string) (inquiry.Inquiry, []inquiry.Reply, error) {
	var row InquiryModel
	if err := r.store.DB.WithContext(ctx).First(&row, "thread_id = ?", threadID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return inquiry.Inquiry{}, nil, inquiry.ErrNotFound
		}
		return inquiry.Inquiry{}, nil, err
	}
	replies, err := r.replies(ctx, row.ID)
	return inquiryFromModel(row), replies, err
}
func (r *InquiryRepository) Create(ctx context.Context, input inquiry.InquiryPayload) (inquiry.Inquiry, error) {
	row := InquiryModel{ID: newUUID(), ThreadID: newUUID(), Category: input.Category, Subject: input.Subject, Message: input.Message, ContactName: input.ContactName, ContactEmail: input.ContactEmail, Status: "pending"}
	if err := r.store.DB.WithContext(ctx).Create(&row).Error; err != nil {
		return inquiry.Inquiry{}, err
	}
	return inquiryFromModel(row), nil
}
func (r *InquiryRepository) AddReply(ctx context.Context, inquiryID, senderType, senderName, senderEmail, message string) (inquiry.Reply, error) {
	var reply inquiry.Reply
	err := r.store.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row InquiryModel
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&row, "id = ?", inquiryID).Error; err != nil {
			return err
		}
		model := InquiryReplyModel{ID: newUUID(), InquiryID: row.ID, ThreadID: row.ThreadID, SenderType: senderType, SenderName: senderName, SenderEmail: senderEmail, Message: message}
		if err := tx.Create(&model).Error; err != nil {
			return err
		}
		nextStatus := row.Status
		if senderType == "user" && nextStatus == "resolved" {
			nextStatus = "pending"
		}
		if senderType == "admin" && nextStatus == "pending" {
			nextStatus = "in_progress"
		}
		if err := tx.Model(&row).Updates(map[string]any{"status": nextStatus, "updatedAt": time.Now()}).Error; err != nil {
			return err
		}
		reply = replyFromModel(model)
		return nil
	})
	return reply, err
}
func (r *InquiryRepository) UpdateStatus(ctx context.Context, id, status string) error {
	result := r.store.DB.WithContext(ctx).Model(&InquiryModel{}).Where("id = ?", id).Updates(map[string]any{"status": status, "updatedAt": time.Now()})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return inquiry.ErrNotFound
	}
	return nil
}
func (r *InquiryRepository) replies(ctx context.Context, id string) ([]inquiry.Reply, error) {
	var rows []InquiryReplyModel
	if err := r.store.DB.WithContext(ctx).Where("inquiry_id = ?", id).Order(`"createdAt" ASC, id ASC`).Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make([]inquiry.Reply, 0, len(rows))
	for _, row := range rows {
		result = append(result, replyFromModel(row))
	}
	return result, nil
}
func inquiryFromModel(row InquiryModel) inquiry.Inquiry {
	return inquiry.Inquiry{ID: row.ID, ThreadID: row.ThreadID, Category: row.Category, Subject: row.Subject, Message: row.Message, ContactName: row.ContactName, ContactEmail: row.ContactEmail, Status: row.Status, CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339), UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339)}
}
func replyFromModel(row InquiryReplyModel) inquiry.Reply {
	return inquiry.Reply{ID: row.ID, InquiryID: row.InquiryID, ThreadID: row.ThreadID, SenderType: row.SenderType, SenderName: row.SenderName, SenderEmail: row.SenderEmail, Message: row.Message, CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339)}
}
