package v2

import (
	"context"
	"errors"
	"portfolio-backend/internal/domain/inquiry"
)

type InquiryRepository struct {
	*Repository
}

func NewInquiryRepository(base *Repository) *InquiryRepository {
	return &InquiryRepository{base}
}

func (r *InquiryRepository) List(ctx context.Context) ([]inquiry.Inquiry, error) {
	return nil, errors.New("not implemented")
}

func (r *InquiryRepository) GetByID(ctx context.Context, id string) (inquiry.Inquiry, []inquiry.Reply, error) {
	return inquiry.Inquiry{}, nil, errors.New("not implemented")
}

func (r *InquiryRepository) GetByThreadID(ctx context.Context, threadID string) (inquiry.Inquiry, []inquiry.Reply, error) {
	return inquiry.Inquiry{}, nil, errors.New("not implemented")
}

func (r *InquiryRepository) Create(ctx context.Context, input inquiry.InquiryPayload) (inquiry.Inquiry, error) {
	return inquiry.Inquiry{}, errors.New("not implemented")
}

func (r *InquiryRepository) AddReply(ctx context.Context, inquiryID string, senderType string, senderName string, senderEmail string, message string) (inquiry.Reply, error) {
	return inquiry.Reply{}, errors.New("not implemented")
}

func (r *InquiryRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	return errors.New("not implemented")
}
