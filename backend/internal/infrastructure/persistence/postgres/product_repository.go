package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	domain "portfolio-backend/internal/domain/product"
	productusecase "portfolio-backend/internal/usecase/product"
)

type ProductRepository struct {
	store *Store
}

func NewProductRepository(store *Store) *ProductRepository {
	return &ProductRepository{store: store}
}

type productModel struct {
	ID           string          `gorm:"primaryKey;column:id"`
	Title        string          `gorm:"column:title"`
	Description  string          `gorm:"column:description"`
	Image        string          `gorm:"column:image"`
	Link         string          `gorm:"column:link"`
	GithubURL    string          `gorm:"column:githubUrl"`
	Category     string          `gorm:"column:category"`
	Technologies json.RawMessage `gorm:"column:technologies;type:jsonb"`
	Status       string          `gorm:"column:status"`
	DeployStatus string          `gorm:"column:deployStatus"`
	CreatedYear  int             `gorm:"column:createdYear"`
	CreatedMonth int             `gorm:"column:createdMonth"`
	CreatedAt    string          `gorm:"column:createdAt"`
	UpdatedAt    time.Time       `gorm:"column:updatedAt"`
}

func (productModel) TableName() string {
	return "products"
}

func (r *ProductRepository) List(ctx context.Context) ([]domain.Product, error) {
	var models []productModel
	if err := r.store.DB.WithContext(ctx).Find(&models).Error; err != nil {
		return nil, err
	}

	products := make([]domain.Product, 0, len(models))
	for _, m := range models {
		products = append(products, m.toDomain())
	}
	return products, nil
}

func (r *ProductRepository) Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Product, error) {
	id := fmt.Sprintf("product_%d", now.UnixNano())
	createdAt := now.UTC().Format(time.RFC3339)
	techs, _ := json.Marshal(input.Techs)

	model := productModel{
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
		return domain.Product{}, err
	}

	return model.toDomain(), nil
}

func (r *ProductRepository) Update(ctx context.Context, id string, input domain.Payload, _ time.Time) error {
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

	result := r.store.DB.WithContext(ctx).Model(&productModel{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return productusecase.ErrNotFound
	}
	return nil
}

func (r *ProductRepository) Delete(ctx context.Context, id string) error {
	result := r.store.DB.WithContext(ctx).Delete(&productModel{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return productusecase.ErrNotFound
	}
	return nil
}

func (m *productModel) toDomain() domain.Product {
	var techs []string
	if len(m.Technologies) > 0 {
		_ = json.Unmarshal(m.Technologies, &techs)
	}
	if techs == nil {
		techs = []string{}
	}

	return domain.Product{
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
