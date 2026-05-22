package v2

import "portfolio-backend/internal/infrastructure/persistence/postgres"

type SectionHandler struct {
	store *postgres.Store
}
