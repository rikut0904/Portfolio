package postgres

import (
	"context"
	"encoding/json"
	"portfolio-backend/internal/domain/product"
	"time"

	"github.com/google/uuid"
)

type ProductRepository struct {
	store *Store
}

func NewProductRepository(store *Store) *ProductRepository {
	return &ProductRepository{store: store}
}

func (r *ProductRepository) List(ctx context.Context) ([]product.Product, error) {
	var models []ProductModel
	if err := r.store.DB.WithContext(ctx).Find(&models).Error; err != nil {
		return nil, err
	}

	products := make([]product.Product, 0, len(models))
	for _, m := range models {
		products = append(products, r.toDomain(m))
	}
	return products, nil
}

func (r *ProductRepository) Create(ctx context.Context, input product.ProductPayload, now time.Time) (product.Product, error) {
	id := uuid.New().String()
	createdAt := now.UTC().Format(time.RFC3339)
	techs, _ := json.Marshal(input.Techs)

	model := ProductModel{
		ID:           id,
		Title:        input.Title,
		Description:  input.Description,
		Image:        input.Image,
		Link:         input.Link,
		GithubURL:    input.GithubURL,
		Category:     input.Category,
		Technologies: techs,
		Status:       input.Status,
		DeployStatus: input.Deploy,
		CreatedYear:  input.CreatedYear,
		CreatedMonth: input.CreatedMon,
		CreatedAt:    createdAt,
		UpdatedAt:    now,
	}

	if err := r.store.DB.WithContext(ctx).Create(&model).Error; err != nil {
		return product.Product{}, err
	}

	return r.toDomain(model), nil
}

func (r *ProductRepository) Update(ctx context.Context, id string, input product.ProductPayload, _ time.Time) error {
	techs, _ := json.Marshal(input.Techs)
	updates := map[string]any{
		"title":        input.Title,
		"description":  input.Description,
		"image":        input.Image,
		"link":         input.Link,
		"githubUrl":    input.GithubURL,
		"category":     input.Category,
		"technologies": techs,
		"status":       input.Status,
		"deployStatus": input.Deploy,
		"createdYear":  input.CreatedYear,
		"createdMonth": input.CreatedMon,
		"updatedAt":    time.Now(),
	}

	result := r.store.DB.WithContext(ctx).Model(&ProductModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (r *ProductRepository) Delete(ctx context.Context, id string) error {
	result := r.store.DB.WithContext(ctx).Delete(&ProductModel{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	return nil
}

func (r *ProductRepository) toDomain(m ProductModel) product.Product {
	var techs []string
	if len(m.Technologies) > 0 {
		_ = json.Unmarshal(m.Technologies, &techs)
	}
	if techs == nil {
		techs = []string{}
	}

	return product.Product{
		ID:          m.ID,
		Title:       m.Title,
		Description: m.Description,
		Image:       m.Image,
		Link:        m.Link,
		GithubURL:   m.GithubURL,
		Category:    m.Category,
		Techs:       techs,
		Status:      m.Status,
		Deploy:      m.DeployStatus,
		CreatedYear: m.CreatedYear,
		CreatedMon:  m.CreatedMonth,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt.Format(time.RFC3339),
	}
}
