package v2

import (
	"context"
	"portfolio-backend/internal/domain/technology"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

type TechnologyHandler struct {
	*Common
	usecase technologyusecase.Usecase
}

type GetTechnologiesOutput struct {
	Body struct {
		Technologies []technology.Technology `json:"technologies" doc:"List of technologies used in projects"`
	}
}

func (h *TechnologyHandler) GetTechnologies(ctx context.Context, input *struct{}) (*GetTechnologiesOutput, error) {
	list, err := h.usecase.List(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetTechnologiesOutput{}
	resp.Body.Technologies = list
	return resp, nil
}

type CreateTechnologyInput struct {
	Body technology.TechnologyPayload
}

type TechnologyOutput struct {
	Body struct {
		Technology technology.Technology `json:"technology"`
	}
}

func (h *TechnologyHandler) CreateTechnology(ctx context.Context, input *CreateTechnologyInput) (*TechnologyOutput, error) {
	user := GetClaims(ctx)
	tech, err := h.usecase.Create(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "create", "technology", tech.ID, "info", user, input.Body)

	resp := &TechnologyOutput{}
	resp.Body.Technology = tech
	return resp, nil
}

type UpdateTechnologyInput struct {
	ID   string `path:"id" doc:"Technology ID"`
	Body technology.TechnologyPayload
}

func (h *TechnologyHandler) UpdateTechnology(ctx context.Context, input *UpdateTechnologyInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "technology", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type DeleteTechnologyInput struct {
	ID string `path:"id" doc:"Technology ID"`
}

func (h *TechnologyHandler) DeleteTechnology(ctx context.Context, input *DeleteTechnologyInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Delete(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "delete", "technology", input.ID, "warn", user, nil)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
