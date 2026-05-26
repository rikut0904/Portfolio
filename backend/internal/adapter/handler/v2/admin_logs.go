package v2

import (
	"context"
	"portfolio-backend/internal/domain/adminlog"
	adminlogusecase "portfolio-backend/internal/usecase/adminlog"

	"github.com/danielgtaylor/huma/v2"
)

type AdminLogHandler struct {
	*Common
	usecase adminlogusecase.Usecase
}

type GetAdminLogsInput struct {
	Limit  int    `query:"limit" default:"10" doc:"Items per page"`
	Cursor string `query:"cursor" doc:"Pagination cursor"`
}

type GetAdminLogsOutput struct {
	Body struct {
		Logs       []adminlog.AdminLog `json:"logs" doc:"List of admin logs"`
		NextCursor any                 `json:"nextCursor" doc:"Next pagination cursor"`
	}
}

func (h *AdminLogHandler) GetAdminLogs(ctx context.Context, input *GetAdminLogsInput) (*GetAdminLogsOutput, error) {
	out, err := h.usecase.List(ctx, adminlog.ListInput{
		Limit:  input.Limit,
		Cursor: input.Cursor,
	})
	if err != nil {
		return nil, MapError(err)
	}

	resp := &GetAdminLogsOutput{}
	resp.Body.Logs = out.Logs
	resp.Body.NextCursor = out.NextCursor
	return resp, nil
}

type CreateAuthLogInput struct {
	Body struct {
		Action string `json:"action" doc:"Login or Logout action"`
	}
}

func (h *AdminLogHandler) CreateAuthLog(ctx context.Context, input *CreateAuthLogInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	userID := ""
	userEmail := ""
	if user != nil {
		userID = user.UID
		userEmail = user.Email
	}

	// For user agent, we might need echo context
	userAgent := ""
	if humaCtx, ok := ctx.(huma.Context); ok {
		userAgent = humaCtx.Header("User-Agent")
	}

	err := h.usecase.CreateLog(ctx, input.Body.Action, "auth", "", "info", userID, userEmail, map[string]any{"userAgent": userAgent})
	if err != nil {
		return nil, MapError(err)
	}

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
