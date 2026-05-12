package httpapi

import (
	"net/http"
	"time"

	"portfolio-backend/internal/config"

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

	h.Register(e)
	return e
}
