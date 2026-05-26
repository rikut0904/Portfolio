package v2

import (
	"context"
	"portfolio-backend/internal/domain/activity"
	activityusecase "portfolio-backend/internal/usecase/activity"
)

type ActivityHandler struct {
	*Common
	usecase activityusecase.Usecase
}

type GetActivitiesOutput struct {
	Body struct {
		Activities []activity.Activity `json:"activities" doc:"List of activities"`
	}
}

func (h *ActivityHandler) GetActivities(ctx context.Context, input *struct{}) (*GetActivitiesOutput, error) {
	list, err := h.usecase.List(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetActivitiesOutput{}
	resp.Body.Activities = list
	return resp, nil
}

type GetActivityInput struct {
	ID string `path:"id" doc:"Activity ID"`
}

type ActivityOutput struct {
	Body struct {
		Activity activity.Activity `json:"activity"`
	}
}

func (h *ActivityHandler) GetActivity(ctx context.Context, input *GetActivityInput) (*ActivityOutput, error) {
	a, err := h.usecase.GetByID(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &ActivityOutput{}
	resp.Body.Activity = a
	return resp, nil
}

type CreateActivityInput struct {
	Body activity.ActivityPayload
}

func (h *ActivityHandler) CreateActivity(ctx context.Context, input *CreateActivityInput) (*ActivityOutput, error) {
	user := GetClaims(ctx)
	a, err := h.usecase.Create(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "create", "activity", a.ID, "info", user, input.Body)

	resp := &ActivityOutput{}
	resp.Body.Activity = a
	return resp, nil
}

type UpdateActivityInput struct {
	ID   string `path:"id" doc:"Activity ID"`
	Body activity.ActivityPayload
}

func (h *ActivityHandler) UpdateActivity(ctx context.Context, input *UpdateActivityInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "activity", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type PatchActivityInput struct {
	ID   string         `path:"id" doc:"Activity ID"`
	Body map[string]any `doc:"Partial activity updates"`
}

func (h *ActivityHandler) PatchActivity(ctx context.Context, input *PatchActivityInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Patch(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "activity", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type DeleteActivityInput struct {
	ID string `path:"id" doc:"Activity ID"`
}

func (h *ActivityHandler) DeleteActivity(ctx context.Context, input *DeleteActivityInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Delete(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "delete", "activity", input.ID, "warn", user, nil)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type GetActivityCategoriesOutput struct {
	Body struct {
		Categories []activity.Category `json:"categories" doc:"List of activity categories"`
	}
}

func (h *ActivityHandler) GetActivityCategories(ctx context.Context, input *struct{}) (*GetActivityCategoriesOutput, error) {
	list, err := h.usecase.ListCategories(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetActivityCategoriesOutput{}
	resp.Body.Categories = list
	return resp, nil
}

type CreateActivityCategoryInput struct {
	Body activity.ActivityCategoryPayload
}

type ActivityCategoryOutput struct {
	Body struct {
		Category activity.Category `json:"category"`
	}
}

func (h *ActivityHandler) CreateActivityCategory(ctx context.Context, input *CreateActivityCategoryInput) (*ActivityCategoryOutput, error) {
	user := GetClaims(ctx)
	c, err := h.usecase.CreateCategory(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "create", "activityCategory", c.ID, "info", user, input.Body)

	resp := &ActivityCategoryOutput{}
	resp.Body.Category = c
	return resp, nil
}

type PatchActivityCategoryInput struct {
	ID   string         `path:"id" doc:"Category ID"`
	Body map[string]any `doc:"Partial category updates"`
}

func (h *ActivityHandler) PatchActivityCategory(ctx context.Context, input *PatchActivityCategoryInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.PatchCategory(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "activityCategory", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

func (h *ActivityHandler) DeleteActivityCategory(ctx context.Context, input *DeleteActivityInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.DeleteCategory(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "delete", "activityCategory", input.ID, "warn", user, nil)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
