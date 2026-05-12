package product

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	domain "portfolio-backend/internal/domain/product"
)

var (
	ErrInvalidProduct = errors.New("invalid product")
	ErrNotFound       = errors.New("product not found")
)

type Repository interface {
	List(ctx context.Context) ([]domain.Product, error)
	Create(ctx context.Context, input domain.Payload, now time.Time) (domain.Product, error)
	Update(ctx context.Context, id string, input domain.Payload, now time.Time) error
	Delete(ctx context.Context, id string) error
}

type Usecase struct {
	repo Repository
}

func New(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

type ListInput struct {
	Category     string
	Status       string
	DeployStatus string
	CreatedYear  int
	CreatedMonth int
	Technologies []string
	SortBy       string
	Page         int
	Limit        int
}

type ListOutput struct {
	Products   []domain.Product
	Pagination Pagination
}

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasMore    bool `json:"hasMore"`
}

func (u *Usecase) List(ctx context.Context, input ListInput) (ListOutput, error) {
	input.Category = strings.TrimSpace(input.Category)
	input.Status = strings.TrimSpace(input.Status)
	input.DeployStatus = strings.TrimSpace(input.DeployStatus)
	products, err := u.repo.List(ctx)
	if err != nil {
		return ListOutput{}, err
	}

	filtered := make([]domain.Product, 0, len(products))
	for _, p := range products {
		if input.Category != "" && p.Category != input.Category {
			continue
		}
		if input.Status != "" && p.Status != input.Status {
			continue
		}
		if input.DeployStatus != "" && p.Deploy != input.DeployStatus {
			continue
		}
		if input.CreatedYear > 0 && p.CreatedYear != input.CreatedYear {
			continue
		}
		if input.CreatedMonth > 0 && p.CreatedMon != input.CreatedMonth {
			continue
		}
		if len(input.Technologies) > 0 && !hasAny(p.Techs, input.Technologies) {
			continue
		}
		filtered = append(filtered, p)
	}

	sortBy := input.SortBy
	if sortBy == "" {
		sortBy = "createdYear-asc"
	}
	sort.Slice(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		switch sortBy {
		case "createdYear-asc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon < b.CreatedMon
			}
			return a.CreatedYear < b.CreatedYear
		case "createdYear-desc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon > b.CreatedMon
			}
			return a.CreatedYear > b.CreatedYear
		case "title-asc":
			return a.Title < b.Title
		case "title-desc":
			return a.Title > b.Title
		case "createdAt-asc":
			return a.CreatedAt < b.CreatedAt
		case "createdAt-desc":
			return a.CreatedAt > b.CreatedAt
		default:
			return false
		}
	})

	page := input.Page
	if page < 1 {
		page = 1
	}
	limit := input.Limit
	if limit < 1 {
		limit = 100
	}
	total := len(filtered)
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return ListOutput{
		Products: filtered[start:end],
		Pagination: Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
			HasMore:    end < total,
		},
	}, nil
}

func (u *Usecase) Create(ctx context.Context, input domain.Payload) (domain.Product, error) {
	now := time.Now().UTC()
	normalized, err := normalizePayload(input, now)
	if err != nil {
		return domain.Product{}, err
	}
	return u.repo.Create(ctx, normalized, now)
}

func (u *Usecase) Update(ctx context.Context, id string, input domain.Payload) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidProduct
	}
	now := time.Now().UTC()
	normalized, err := normalizePayload(input, now)
	if err != nil {
		return err
	}
	return u.repo.Update(ctx, id, normalized, now)
}

func (u *Usecase) Delete(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrInvalidProduct
	}
	return u.repo.Delete(ctx, id)
}

func normalizePayload(input domain.Payload, now time.Time) (domain.Payload, error) {
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Description) == "" {
		return domain.Payload{}, ErrInvalidProduct
	}
	if input.CreatedYear == 0 {
		input.CreatedYear = now.Year()
	}
	if input.CreatedMon == 0 {
		input.CreatedMon = int(now.Month())
	}
	if input.Status == "" {
		input.Status = "公開"
	}
	if input.Deploy == "" {
		input.Deploy = "未公開"
	}
	return input, nil
}

func hasAny(arr, wanted []string) bool {
	if len(arr) == 0 || len(wanted) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(arr))
	for _, v := range arr {
		set[v] = struct{}{}
	}
	for _, w := range wanted {
		if _, ok := set[w]; ok {
			return true
		}
	}
	return false
}
