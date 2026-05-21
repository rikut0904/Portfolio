package v2

import (
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	productusecase "portfolio-backend/internal/usecase/product"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

// Handler contains all the v2 handlers and common dependencies.
type Handler struct {
	store        *postgres.Store
	verifier     *auth.Verifier
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
	h := &Handler{
		store:    cfg.Store,
		verifier: cfg.Verifier,
	}

	h.AppMode = &AppModeHandler{appMode: cfg.AppMode}
	h.Products = &ProductHandler{usecase: cfg.Products}
	h.Technologies = &TechnologyHandler{usecase: cfg.Technologies}

	return h
}
