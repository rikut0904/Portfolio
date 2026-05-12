package httpapi

import (
	"context"
	"net/http"
	"strings"

	"portfolio-backend/internal/infrastructure/auth"

	"github.com/labstack/echo/v4"
)

type echoContextKey struct{}

const adminClaimsContextKey = "adminClaims"

func (h *Handler) Register(e *echo.Echo) {
	e.GET("/health", h.handleHealthEcho)

	api := e.Group("/api")
	h.registerSystemRoutes(api)
	h.registerAuthRoutes(api)
	h.registerCatalogRoutes(api)
	h.registerContactRoutes(api)

	admin := api.Group("", h.requireAdmin)
	h.registerAdminAuthRoutes(admin)
	h.registerAdminCalendarRoutes(admin)
	h.registerAdminCatalogRoutes(admin)
	h.registerAdminContactRoutes(admin)
	h.registerAdminAssetRoutes(admin)
	h.registerAdminLogRoutes(admin)
}

func (h *Handler) registerSystemRoutes(api *echo.Group) {
	api.GET("/app-mode", h.getAppModeEcho)
}

func (h *Handler) registerAuthRoutes(api *echo.Group) {
	api.POST("/auth/login", h.loginEcho)
	api.POST("/auth/refresh", h.refreshTokenEcho)
}

func (h *Handler) registerCatalogRoutes(api *echo.Group) {
	api.GET("/calendar/events", wrapHTTP(h.Calendar.getCalendarPublicEvents))
	api.GET("/products", wrapHTTP(h.Products.getProducts))
	api.GET("/sections", wrapHTTP(h.Sections.getSections))
	api.GET("/activities", wrapHTTP(h.Activities.getActivities))
	api.GET("/activities/:id", wrapHTTP(h.Activities.getActivity))
	api.GET("/activity-categories", wrapHTTP(h.Activities.getActivityCategories))
	api.GET("/technologies", wrapHTTP(h.Technologies.getTechnologies))
}

func (h *Handler) registerContactRoutes(api *echo.Group) {
	api.POST("/contact", wrapHTTP(h.Inquiries.createInquiry))
	api.GET("/contact/thread/:threadId", wrapHTTP(h.Inquiries.getInquiryThread))
	api.POST("/contact/thread/:threadId/reply", wrapHTTP(h.Inquiries.replyInquiryThread))

	api.POST("/inquiries", wrapHTTP(h.Inquiries.createInquiry))
	api.GET("/inquiries/thread/:threadId", wrapHTTP(h.Inquiries.getInquiryThread))
	api.POST("/inquiries/thread/:threadId/reply", wrapHTTP(h.Inquiries.replyInquiryThread))
}

func (h *Handler) registerAdminAuthRoutes(admin *echo.Group) {
	admin.GET("/auth/me", h.meEchoFromContext)
}

func (h *Handler) registerAdminCalendarRoutes(admin *echo.Group) {
	admin.GET("/admin/calendar/events", adminHTTP(h.Calendar.getCalendarEvents))
	admin.PATCH("/admin/calendar/events/publication", adminHTTP(h.Calendar.patchCalendarEventPublication))
	admin.GET("/admin/calendar/preferences", adminHTTP(h.Calendar.getCalendarPreferences))
	admin.PATCH("/admin/calendar/preferences", adminHTTP(h.Calendar.patchCalendarPreferences))
}

func (h *Handler) registerAdminCatalogRoutes(admin *echo.Group) {
	admin.POST("/products", adminHTTP(h.Products.createProduct))
	admin.PUT("/products/:id", adminHTTP(h.Products.updateProduct))
	admin.DELETE("/products/:id", adminHTTP(h.Products.deleteProduct))

	admin.POST("/sections", adminHTTP(h.Sections.createSection))
	admin.PUT("/sections/:id", adminHTTP(h.Sections.updateSection))
	admin.PATCH("/sections/:id/meta", adminHTTP(h.Sections.patchSectionMeta))
	admin.DELETE("/sections/:id/delete", adminHTTP(h.Sections.deleteSection))

	admin.POST("/activities", adminHTTP(h.Activities.createActivity))
	admin.PUT("/activities/:id", adminHTTP(h.Activities.updateActivity))
	admin.PATCH("/activities/:id", adminHTTP(h.Activities.patchActivity))
	admin.DELETE("/activities/:id", adminHTTP(h.Activities.deleteActivity))

	admin.POST("/activity-categories", adminHTTP(h.Activities.createActivityCategory))
	admin.PATCH("/activity-categories/:id", adminHTTP(h.Activities.patchActivityCategory))
	admin.DELETE("/activity-categories/:id", adminHTTP(h.Activities.deleteActivityCategory))

	admin.POST("/technologies", adminHTTP(h.Technologies.createTechnology))
	admin.PUT("/technologies/:id", adminHTTP(h.Technologies.updateTechnology))
	admin.DELETE("/technologies/:id", adminHTTP(h.Technologies.deleteTechnology))
}

func (h *Handler) registerAdminContactRoutes(admin *echo.Group) {
	admin.GET("/contact", adminHTTP(h.Inquiries.getInquiries))
	admin.GET("/contact/:id", adminHTTP(h.Inquiries.getInquiry))
	admin.PATCH("/contact/:id", adminHTTP(h.Inquiries.patchInquiryStatus))
	admin.POST("/contact/:id/reply", adminHTTP(h.Inquiries.replyInquiry))

	admin.GET("/inquiries", adminHTTP(h.Inquiries.getInquiries))
	admin.GET("/inquiries/:id", adminHTTP(h.Inquiries.getInquiry))
	admin.PATCH("/inquiries/:id", adminHTTP(h.Inquiries.patchInquiryStatus))
	admin.POST("/inquiries/:id/reply", adminHTTP(h.Inquiries.replyInquiry))
}

func (h *Handler) registerAdminAssetRoutes(admin *echo.Group) {
	admin.POST("/images/upload", adminHTTP(h.uploadImage))
}

func (h *Handler) registerAdminLogRoutes(admin *echo.Group) {
	admin.POST("/admin-logs", adminHTTP(h.AdminLogs.createAuthLog))
	admin.GET("/admin-logs", adminHTTP(h.AdminLogs.getAdminLogs))
}

func (h *Handler) requireAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		claims, err := h.verifier.VerifyRequest(c.Request())
		if err != nil {
			status := http.StatusUnauthorized
			if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
				status = http.StatusForbidden
			}
			return c.JSON(status, map[string]any{"error": http.StatusText(status)})
		}
		c.Set(adminClaimsContextKey, claims)
		return next(c)
	}
}

type adminHandlerFunc func(http.ResponseWriter, *http.Request, *auth.Claims) error
type publicHandlerFunc func(http.ResponseWriter, *http.Request) error

func adminHTTP(next adminHandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request().WithContext(context.WithValue(c.Request().Context(), echoContextKey{}, c))
		claims, _ := c.Get(adminClaimsContextKey).(*auth.Claims)
		if err := next(c.Response(), req, claims); err != nil {
			handleError(c.Response(), err)
		}
		return nil
	}
}

func wrapHTTP(next publicHandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request().WithContext(context.WithValue(c.Request().Context(), echoContextKey{}, c))
		if err := next(c.Response(), req); err != nil {
			handleError(c.Response(), err)
		}
		return nil
	}
}

func routeParam(r *http.Request, name string) string {
	c, _ := r.Context().Value(echoContextKey{}).(echo.Context)
	if c == nil {
		return ""
	}
	return c.Param(name)
}
