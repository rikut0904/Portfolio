package v2

import (
	"context"
	"portfolio-backend/internal/domain/inquiry"
	inquiryusecase "portfolio-backend/internal/usecase/inquiry"
)

type InquiryHandler struct {
	*Common
	usecase inquiryusecase.Usecase
}

type GetInquiriesOutput struct {
	Body struct {
		Inquiries []inquiry.Inquiry `json:"inquiries" doc:"List of inquiries"`
	}
}

func (h *InquiryHandler) GetInquiries(ctx context.Context, input *struct{}) (*GetInquiriesOutput, error) {
	list, err := h.usecase.List(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetInquiriesOutput{}
	resp.Body.Inquiries = list
	return resp, nil
}

type GetInquiryInput struct {
	ID string `path:"id" doc:"Inquiry ID"`
}

type InquiryDetailOutput struct {
	Body struct {
		Inquiry inquiry.Inquiry `json:"inquiry"`
		Replies []inquiry.Reply `json:"replies"`
	}
}

func (h *InquiryHandler) GetInquiry(ctx context.Context, input *GetInquiryInput) (*InquiryDetailOutput, error) {
	inq, replies, err := h.usecase.GetByID(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &InquiryDetailOutput{}
	resp.Body.Inquiry = inq
	resp.Body.Replies = replies
	return resp, nil
}

type GetInquiryThreadInput struct {
	ThreadID string `path:"threadId" doc:"Inquiry thread ID"`
}

func (h *InquiryHandler) GetInquiryThread(ctx context.Context, input *GetInquiryThreadInput) (*InquiryDetailOutput, error) {
	inq, replies, err := h.usecase.GetByThreadID(ctx, input.ThreadID)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &InquiryDetailOutput{}
	resp.Body.Inquiry = inq
	resp.Body.Replies = replies
	return resp, nil
}

type CreateInquiryInput struct {
	Body inquiry.InquiryPayload
}

func (h *InquiryHandler) CreateInquiry(ctx context.Context, input *CreateInquiryInput) (*InquiryDetailOutput, error) {
	inq, err := h.usecase.Create(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &InquiryDetailOutput{}
	resp.Body.Inquiry = inq
	resp.Body.Replies = []inquiry.Reply{}
	return resp, nil
}

type ReplyInquiryInput struct {
	ID   string `path:"id" doc:"Inquiry ID"`
	Body inquiry.InquiryReplyPayload
}

type ReplyOutput struct {
	Body struct {
		Reply inquiry.Reply `json:"reply"`
	}
}

func (h *InquiryHandler) ReplyInquiry(ctx context.Context, input *ReplyInquiryInput) (*ReplyOutput, error) {
	user := GetClaims(ctx)
	adminEmail := ""
	if user != nil {
		adminEmail = user.Email
	}
	rep, err := h.usecase.ReplyFromAdmin(ctx, input.ID, input.Body.Message, adminEmail)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "reply", "inquiry", input.ID, "info", user, map[string]any{"replyId": rep.ID})

	resp := &ReplyOutput{}
	resp.Body.Reply = rep
	return resp, nil
}

type UpdateInquiryStatusInput struct {
	ID   string `path:"id" doc:"Inquiry ID"`
	Body struct {
		Status string `json:"status" doc:"New status"`
	}
}

func (h *InquiryHandler) UpdateStatus(ctx context.Context, input *UpdateInquiryStatusInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.UpdateStatus(ctx, input.ID, input.Body.Status)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "inquiry", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
