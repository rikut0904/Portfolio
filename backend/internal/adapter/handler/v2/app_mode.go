package v2

import (
	"context"
)

type AppModeHandler struct {
	*Common
	appMode bool
}

type AppModeOutput struct {
	Body struct {
		AppMode bool `json:"appMode" doc:"Whether the application is in maintenance mode"`
	}
}

func (h *AppModeHandler) GetAppMode(ctx context.Context, input *struct{}) (*AppModeOutput, error) {
	resp := &AppModeOutput{}
	resp.Body.AppMode = h.appMode
	return resp, nil
}
