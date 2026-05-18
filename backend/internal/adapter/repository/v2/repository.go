package v2

import (
	"portfolio-backend/internal/infrastructure/persistence/postgres"
)

// Repository serves as the container for all v2 database adapters.
type Repository struct {
	store *postgres.Store
}

// NewRepository creates a new repository container.
func NewRepository(store *postgres.Store) *Repository {
	return &Repository{store: store}
}
