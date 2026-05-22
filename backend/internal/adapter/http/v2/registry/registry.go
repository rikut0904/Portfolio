package registry

import (
	v2 "portfolio-backend/internal/adapter/handler/v2"
	v2repo "portfolio-backend/internal/adapter/repository/v2"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	productusecase "portfolio-backend/internal/usecase/product"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

// Registry is a dependency injection container for the application.
type Registry interface {
	NewV2Handler() *v2.Handler
}

type registry struct {
	store   *postgres.Store
	appMode bool
}

// NewRegistry creates a new registry instance.
func NewRegistry(store *postgres.Store, appMode bool) Registry {
	return &registry{
		store:   store,
		appMode: appMode,
	}
}

func (r *registry) NewV2Handler() *v2.Handler {
	return v2.NewHandler(v2.HandlerConfig{
		Store:        r.store,
		Products:     r.newProductUsecase(),
		Technologies: r.newTechnologyUsecase(),
		AppMode:      r.appMode,
	})
}

// Internal creators for repositories and usecases

func (r *registry) newProductUsecase() productusecase.Usecase {
	baseRepo := v2repo.NewRepository(r.store)
	repo := v2repo.NewProductRepository(baseRepo)
	return productusecase.New(repo)
}

func (r *registry) newTechnologyUsecase() technologyusecase.Usecase {
	// For now, reuse v1 repository pattern within v2 structure if needed,
	// or assume v2repo has it.
	return technologyusecase.New(postgres.NewTechnologyRepository(r.store))
}
