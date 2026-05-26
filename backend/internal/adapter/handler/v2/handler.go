package v2

import (
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

// Common holds shared dependencies for all v2 handlers.
type Common struct {
	store    *postgres.Store
	verifier *auth.Verifier
}

// Handler contains all the v2 handlers.
type Handler struct {
	*Common
	AppMode      *AppModeHandler
	Products     *ProductHandler
	Technologies *TechnologyHandler
	Sections     *SectionHandler
	Activities   *ActivityHandler
	Inquiries    *InquiryHandler
	AdminLogs    *AdminLogHandler
	Calendar     *CalendarHandler
}

// HandlerConfig defines dependencies for v2 handlers.
type HandlerConfig struct {
	Store        *postgres.Store
	Verifier     *auth.Verifier
	Products     productusecase.Usecase
	Technologies technologyusecase.Usecase
	Sections     sectionusecase.Usecase
	Activities   activityusecase.Usecase
	Inquiries    inquiryusecase.Usecase
	AdminLogs    adminlogusecase.Usecase
	Calendar     calendarusecase.Usecase
	AppMode      bool
}

// NewHandler initializes the v2 handler with its dependencies.
func NewHandler(cfg HandlerConfig) *Handler {
	common := &Common{
		store:    cfg.Store,
		verifier: cfg.Verifier,
	}

	h := &Handler{
		Common: common,
	}

	h.AppMode = &AppModeHandler{Common: common, appMode: cfg.AppMode}
	h.Products = &ProductHandler{Common: common, usecase: cfg.Products}
	h.Technologies = &TechnologyHandler{Common: common, usecase: cfg.Technologies}
	h.Sections = &SectionHandler{Common: common, usecase: cfg.Sections}
	h.Activities = &ActivityHandler{Common: common, usecase: cfg.Activities}
	h.Inquiries = &InquiryHandler{Common: common, usecase: cfg.Inquiries}
	h.AdminLogs = &AdminLogHandler{Common: common, usecase: cfg.AdminLogs}
	h.Calendar = &CalendarHandler{Common: common, usecase: cfg.Calendar}

	return h
}
