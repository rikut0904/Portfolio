package v2

type ProductRepository struct {
	*Repository
}

func NewProductRepository(base *Repository) *ProductRepository {
	return &ProductRepository{base}
}
