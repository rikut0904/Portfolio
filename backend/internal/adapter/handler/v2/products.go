package v2

import (
	"context"
	"portfolio-backend/internal/domain/product"
	productusecase "portfolio-backend/internal/usecase/product"
)

type ProductHandler struct {
	*Common
	usecase productusecase.Usecase
}

type GetProductsInput struct {
	Category     string   `query:"category" doc:"Filter by category"`
	Status       string   `query:"status" doc:"Filter by status"`
	DeployStatus string   `query:"deployStatus" doc:"Filter by deploy status"`
	CreatedYear  int      `query:"createdYear" doc:"Filter by year"`
	CreatedMonth int      `query:"createdMonth" doc:"Filter by month"`
	Technologies []string `query:"technologies" doc:"Filter by technologies"`
	SortBy       string   `query:"sortBy" doc:"Sort by field"`
	Page         int      `query:"page" default:"1" doc:"Page number"`
	Limit        int      `query:"limit" default:"100" doc:"Items per page"`
}

type GetProductsOutput struct {
	Body struct {
		Products   []product.Product         `json:"products" doc:"List of products"`
		Pagination productusecase.Pagination `json:"pagination" doc:"Pagination metadata"`
	}
}

func (h *ProductHandler) GetProducts(ctx context.Context, input *GetProductsInput) (*GetProductsOutput, error) {
	out, err := h.usecase.List(ctx, productusecase.ListInput{
		Category:     input.Category,
		Status:       input.Status,
		DeployStatus: input.DeployStatus,
		CreatedYear:  input.CreatedYear,
		CreatedMonth: input.CreatedMonth,
		Technologies: input.Technologies,
		SortBy:       input.SortBy,
		Page:         input.Page,
		Limit:        input.Limit,
	})
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetProductsOutput{}
	resp.Body.Products = out.Products
	resp.Body.Pagination = out.Pagination
	return resp, nil
}

type CreateProductInput struct {
	Body product.ProductPayload
}

type ProductOutput struct {
	Body struct {
		Product product.Product `json:"product"`
	}
}

func (h *ProductHandler) CreateProduct(ctx context.Context, input *CreateProductInput) (*ProductOutput, error) {
	user := GetClaims(ctx)
	p, err := h.usecase.Create(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "create", "product", p.ID, "info", user, input.Body)

	resp := &ProductOutput{}
	resp.Body.Product = p
	return resp, nil
}

type UpdateProductInput struct {
	ID   string                 `path:"id" doc:"Product ID"`
	Body product.ProductPayload `doc:"Product updates"`
}

func (h *ProductHandler) UpdateProduct(ctx context.Context, input *UpdateProductInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Update(ctx, input.ID, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "product", input.ID, "info", user, input.Body)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}

type DeleteProductInput struct {
	ID string `path:"id" doc:"Product ID"`
}

func (h *ProductHandler) DeleteProduct(ctx context.Context, input *DeleteProductInput) (*SuccessStatusOutput, error) {
	user := GetClaims(ctx)
	err := h.usecase.Delete(ctx, input.ID)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "delete", "product", input.ID, "warn", user, nil)

	resp := &SuccessStatusOutput{}
	resp.Body.Success = true
	return resp, nil
}
