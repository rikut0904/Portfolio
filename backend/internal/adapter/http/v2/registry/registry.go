package registry

import (
	v2 "portfolio-backend/internal/adapter/handler/v2"
	v2repo "portfolio-backend/internal/adapter/repository/v2"
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	activityusecase "portfolio-backend/internal/usecase/activity"
	adminlogusecase "portfolio-backend/internal/usecase/adminlog"
	calendarusecase "portfolio-backend/internal/usecase/calendar"
	inquiryusecase "portfolio-backend/internal/usecase/inquiry"
	productusecase "portfolio-backend/internal/usecase/product"
	sectionusecase "portfolio-backend/internal/usecase/section"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

// Registry is a dependency injection container for the application.
type Registry interface {
	NewV2Handler(verifier *auth.Verifier) *v2.Handler
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

func (r *registry) NewV2Handler(verifier *auth.Verifier) *v2.Handler {
	return v2.NewHandler(v2.HandlerConfig{
		Store:        r.store,
		Verifier:     verifier,
		Products:     r.newProductUsecase(),
		Technologies: r.newTechnologyUsecase(),
		Sections:     r.newSectionUsecase(),
		Activities:   r.newActivityUsecase(),
		Inquiries:    r.newInquiryUsecase(),
		AdminLogs:    r.newAdminLogUsecase(),
		Calendar:     r.newCalendarUsecase(),
		AppMode:      r.appMode,
	})
}

func (r *registry) newProductUsecase() productusecase.Usecase {
	repo := v2repo.NewProductRepository(v2repo.NewRepository(r.store))
	return productusecase.New(repo)
}

func (r *registry) newTechnologyUsecase() technologyusecase.Usecase {
	// For now using postgres repo directly if v2repo doesn't have it yet
	return technologyusecase.New(postgres.NewTechnologyRepository(r.store))
}

func (r *registry) newSectionUsecase() sectionusecase.Usecase {
	repo := v2repo.NewSectionRepository(v2repo.NewRepository(r.store))
	return sectionusecase.New(repo)
}

func (r *registry) newActivityUsecase() activityusecase.Usecase {
	repo := v2repo.NewActivityRepository(v2repo.NewRepository(r.store))
	return activityusecase.New(repo)
}

func (r *registry) newInquiryUsecase() inquiryusecase.Usecase {
	repo := v2repo.NewInquiryRepository(v2repo.NewRepository(r.store))
	return inquiryusecase.New(repo)
}

func (r *registry) newAdminLogUsecase() adminlogusecase.Usecase {
	repo := v2repo.NewAdminLogRepository(v2repo.NewRepository(r.store))
	return adminlogusecase.New(repo)
}

func (r *registry) newCalendarUsecase() calendarusecase.Usecase {
	return calendarusecase.New()
}
