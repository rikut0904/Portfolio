package httpapi

import (
	"net/http"
	"time"

	v2 "portfolio-backend/internal/adapter/handler/v2"
	"portfolio-backend/internal/infrastructure/config"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humaecho"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func NewRouter(cfg config.Config, h *Handler) http.Handler {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.Use(middleware.RequestID())
	e.Use(middleware.Recover())
	e.Use(middleware.ContextTimeout(20 * time.Second))

	origins := cfg.AllowedOrigins
	if len(origins) == 0 {
		origins = []string{"*"}
	}
	allowCredentials := cfg.AllowCredentials
	for _, origin := range origins {
		if origin == "*" {
			// Browsers reject credentialed CORS with wildcard origin.
			allowCredentials = false
			break
		}
	}
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     origins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderAccept, echo.HeaderAuthorization, echo.HeaderContentType, "X-CSRF-Token"},
		ExposeHeaders:    []string{"Link"},
		AllowCredentials: allowCredentials,
		MaxAge:           300,
	}))

	// v1 (legacy) routes
	h.Register(e)

	// v2 (Huma) routes
	humaConfig := huma.DefaultConfig("Portfolio API v2", "2.0.0")
	humaConfig.DocsPath = "/docs/v2"
	humaConfig.DocsRenderer = huma.DocsRendererSwaggerUI
	humaConfig.OpenAPIPath = "/openapi/v2"
	api := humaecho.New(e, humaConfig)
	v2.Register(api, h.V2)

	return e
}
