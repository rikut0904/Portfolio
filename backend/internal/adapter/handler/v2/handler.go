package v2

import (
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	productusecase "portfolio-backend/internal/usecase/product"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

// Handler serves as the entry point for all v2 HTTP adapters.
type Handler struct {
	AppMode      *AppModeHandler
	Products     *ProductHandler
	Technologies *TechnologyHandler
}

// HandlerConfig defines dependencies for v2 handlers.
type HandlerConfig struct {
	Store        *postgres.Store
	Verifier     *auth.Verifier
	Products     productusecase.Usecase
	Technologies technologyusecase.Usecase
	AppMode      bool
}

// NewHandler initializes the v2 handler with its dependencies.
func NewHandler(cfg HandlerConfig) *Handler {
	return &Handler{
		AppMode:      &AppModeHandler{appMode: cfg.AppMode},
		Products:     &ProductHandler{usecase: cfg.Products},
		Technologies: &TechnologyHandler{usecase: cfg.Technologies},
	}
}
