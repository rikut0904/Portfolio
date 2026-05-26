package inquiry

import (
	"context"
	"portfolio-backend/internal/domain/inquiry"
)

type Repository interface {
	List(ctx context.Context) ([]inquiry.Inquiry, error)
	GetByID(ctx context.Context, id string) (inquiry.Inquiry, []inquiry.Reply, error)
	GetByThreadID(ctx context.Context, threadID string) (inquiry.Inquiry, []inquiry.Reply, error)
	Create(ctx context.Context, input inquiry.InquiryPayload) (inquiry.Inquiry, error)
	AddReply(ctx context.Context, inquiryID string, senderType string, senderName string, senderEmail string, message string) (inquiry.Reply, error)
	UpdateStatus(ctx context.Context, id string, status string) error
}

type Usecase interface {
	List(ctx context.Context) ([]inquiry.Inquiry, error)
	GetByID(ctx context.Context, id string) (inquiry.Inquiry, []inquiry.Reply, error)
	GetByThreadID(ctx context.Context, threadID string) (inquiry.Inquiry, []inquiry.Reply, error)
	Create(ctx context.Context, input inquiry.InquiryPayload) (inquiry.Inquiry, error)
	ReplyFromUser(ctx context.Context, threadID string, message string) (inquiry.Reply, error)
	ReplyFromAdmin(ctx context.Context, inquiryID string, message string, adminEmail string) (inquiry.Reply, error)
	UpdateStatus(ctx context.Context, id string, status string) error
}

type interactor struct {
	repo Repository
}

func New(repo Repository) Usecase {
	return &interactor{repo: repo}
}

func (u *interactor) List(ctx context.Context) ([]inquiry.Inquiry, error) {
	return u.repo.List(ctx)
}

func (u *interactor) GetByID(ctx context.Context, id string) (inquiry.Inquiry, []inquiry.Reply, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *interactor) GetByThreadID(ctx context.Context, threadID string) (inquiry.Inquiry, []inquiry.Reply, error) {
	return u.repo.GetByThreadID(ctx, threadID)
}

func (u *interactor) Create(ctx context.Context, input inquiry.InquiryPayload) (inquiry.Inquiry, error) {
	return u.repo.Create(ctx, input)
}

func (u *interactor) ReplyFromUser(ctx context.Context, threadID string, message string) (inquiry.Reply, error) {
	inq, _, err := u.repo.GetByThreadID(ctx, threadID)
	if err != nil {
		return inquiry.Reply{}, err
	}
	return u.repo.AddReply(ctx, inq.ID, "user", inq.ContactName, inq.ContactEmail, message)
}

func (u *interactor) ReplyFromAdmin(ctx context.Context, inquiryID string, message string, adminEmail string) (inquiry.Reply, error) {
	return u.repo.AddReply(ctx, inquiryID, "admin", "Admin", adminEmail, message)
}

func (u *interactor) UpdateStatus(ctx context.Context, id string, status string) error {
	return u.repo.UpdateStatus(ctx, id, status)
}
