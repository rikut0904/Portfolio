package v2

import (
	"context"
	"portfolio-backend/internal/domain/section"
	sectionusecase "portfolio-backend/internal/usecase/section"
)

type SectionHandler struct {
	*Common
	usecase sectionusecase.Usecase
}

type GetSectionsOutput struct {
	Body struct {
		Sections []section.Section `json:"sections" doc:"List of dynamic sections"`
	}
}

func (h *SectionHandler) GetSections(ctx context.Context, input *struct{}) (*GetSectionsOutput, error) {
	list, err := h.usecase.List(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetSectionsOutput{}
	resp.Body.Sections = list
	return resp, nil
}

type CreateSectionInput struct {
	Body section.SectionPayload
}

type SectionOutput struct {
	Body struct {
		Message string          `json:"message"`
		Section section.Section `json:"section"`
	}
}

func (h *SectionHandler) CreateSection(ctx context.Context, input *CreateSectionInput) (*SectionOutput, error) {
	user := GetClaims(ctx)
	s, err := h.usecase.Create(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "create", "section", s.ID, "info", user, input.Body)

	resp := &SectionOutput{}
	resp.Body.Message = "Section created successfully"
	resp.Body.Section = s
	return resp, nil
}

type UpdateSectionInput struct {
	ID   string         `path:"id" doc:"Section ID"`
	Body map[string]any `doc:"Section data updates"`
}

func (h *SectionHandler) UpdateSection(ctx context.Context, input *UpdateSectionInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "section", input.ID, "info", user, nil)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type PatchSectionMetaInput struct {
	ID   string         `path:"id" doc:"Section ID"`
	Body map[string]any `doc:"Section metadata updates"`
}

func (h *SectionHandler) PatchSectionMeta(ctx context.Context, input *PatchSectionMetaInput) (*MessageOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.UpdateMeta(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "sectionMeta", input.ID, "info", user, input.Body)

	resp := &MessageOutput{}
	resp.Body.Message = "Meta updated successfully"
	return resp, nil
}

type DeleteSectionInput struct {
	ID string `path:"id" doc:"Section ID"`
}

func (h *SectionHandler) DeleteSection(ctx context.Context, input *DeleteSectionInput) (*MessageOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Delete(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "delete", "section", input.ID, "warn", user, nil)

	resp := &MessageOutput{}
	resp.Body.Message = "Section deleted successfully"
	return resp, nil
}
