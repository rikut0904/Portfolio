package v2

import (
	"context"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
)

type AppModeHandler struct {
	*Common
	appMode bool
}

type AppModeOutput struct {
	Body struct {
		AppMode    bool   `json:"appMode" doc:"Whether the application is in maintenance mode"`
		APIVersion string `json:"apiVersion" doc:"The currently active API version (v1 or v2)"`
	}
}

func (h *AppModeHandler) GetAppMode(ctx context.Context, input *struct{}) (*AppModeOutput, error) {
	resp := &AppModeOutput{}
	resp.Body.AppMode = h.appMode

	// Fetch API version from settings table, fallback to v1 if not found
	var setting postgres.SystemSettingModel
	err := h.store.DB.WithContext(ctx).Where("key = ?", "apiVersion").First(&setting).Error
	if err == nil {
		resp.Body.APIVersion = setting.Value
	} else {
		resp.Body.APIVersion = "v1" // Default fallback
	}

	return resp, nil
}

type SetAPIVersionInput struct {
	Body struct {
		Version string `json:"version" doc:"API version to set (v1 or v2)"`
	}
}

func (h *AppModeHandler) SetAPIVersion(ctx context.Context, input *SetAPIVersionInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)

	err := h.store.DB.WithContext(ctx).Model(&postgres.SystemSettingModel{}).
		Where("key = ?", "apiVersion").
		Assign(postgres.SystemSettingModel{Value: input.Body.Version}).
		FirstOrCreate(&postgres.SystemSettingModel{Key: "apiVersion"}).Error

	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "systemSetting", "apiVersion", "warn", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
