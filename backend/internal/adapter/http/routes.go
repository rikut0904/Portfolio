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
	api.GET("/app-mode", h.getAppModeEcho)
	api.GET("/calendar/events", wrapHTTP(h.getCalendarPublicEvents))
	api.POST("/auth/login", h.loginEcho)
	api.POST("/auth/refresh", h.refreshTokenEcho)

	api.GET("/products", wrapHTTP(h.getProducts))

	api.GET("/sections", wrapHTTP(h.getSections))

	api.GET("/activities", wrapHTTP(h.getActivities))
	api.GET("/activities/:id", wrapHTTP(h.getActivity))

	api.GET("/activity-categories", wrapHTTP(h.getActivityCategories))

	api.GET("/technologies", wrapHTTP(h.getTechnologies))

	api.POST("/contact", wrapHTTP(h.createInquiry))
	api.GET("/contact/thread/:threadId", wrapHTTP(h.getInquiryThread))
	api.POST("/contact/thread/:threadId/reply", wrapHTTP(h.replyInquiryThread))

	api.POST("/inquiries", wrapHTTP(h.createInquiry))
	api.GET("/inquiries/thread/:threadId", wrapHTTP(h.getInquiryThread))
	api.POST("/inquiries/thread/:threadId/reply", wrapHTTP(h.replyInquiryThread))

	admin := api.Group("", h.requireAdmin)
	admin.GET("/admin/calendar/events", adminHTTP(h.getCalendarEvents))
	admin.PATCH("/admin/calendar/events/publication", adminHTTP(h.patchCalendarEventPublication))
	admin.GET("/admin/calendar/preferences", adminHTTP(h.getCalendarPreferences))
	admin.PATCH("/admin/calendar/preferences", adminHTTP(h.patchCalendarPreferences))
	admin.GET("/auth/me", h.meEchoFromContext)

	admin.POST("/products", adminHTTP(h.createProduct))
	admin.PUT("/products/:id", adminHTTP(h.updateProduct))
	admin.DELETE("/products/:id", adminHTTP(h.deleteProduct))

	admin.POST("/sections", adminHTTP(h.createSection))
	admin.PUT("/sections/:id", adminHTTP(h.updateSection))
	admin.PATCH("/sections/:id/meta", adminHTTP(h.patchSectionMeta))
	admin.DELETE("/sections/:id/delete", adminHTTP(h.deleteSection))

	admin.POST("/activities", adminHTTP(h.createActivity))
	admin.PUT("/activities/:id", adminHTTP(h.updateActivity))
	admin.PATCH("/activities/:id", adminHTTP(h.patchActivity))
	admin.DELETE("/activities/:id", adminHTTP(h.deleteActivity))

	admin.POST("/activity-categories", adminHTTP(h.createActivityCategory))
	admin.PATCH("/activity-categories/:id", adminHTTP(h.patchActivityCategory))
	admin.DELETE("/activity-categories/:id", adminHTTP(h.deleteActivityCategory))

	admin.POST("/technologies", adminHTTP(h.createTechnology))
	admin.PUT("/technologies/:id", adminHTTP(h.updateTechnology))
	admin.DELETE("/technologies/:id", adminHTTP(h.deleteTechnology))
	admin.POST("/images/upload", adminHTTP(h.uploadImage))

	admin.GET("/contact", adminHTTP(h.getInquiries))
	admin.GET("/contact/:id", adminHTTP(h.getInquiry))
	admin.PATCH("/contact/:id", adminHTTP(h.patchInquiryStatus))
	admin.POST("/contact/:id/reply", adminHTTP(h.replyInquiry))

	admin.GET("/inquiries", adminHTTP(h.getInquiries))
	admin.GET("/inquiries/:id", adminHTTP(h.getInquiry))
	admin.PATCH("/inquiries/:id", adminHTTP(h.patchInquiryStatus))
	admin.POST("/inquiries/:id/reply", adminHTTP(h.replyInquiry))

	admin.POST("/admin-logs", adminHTTP(h.createAuthLog))
	admin.GET("/admin-logs", adminHTTP(h.getAdminLogs))
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

func adminHTTP(next func(http.ResponseWriter, *http.Request, *auth.Claims)) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request().WithContext(context.WithValue(c.Request().Context(), echoContextKey{}, c))
		claims, _ := c.Get(adminClaimsContextKey).(*auth.Claims)
		next(c.Response(), req, claims)
		return nil
	}
}

func wrapHTTP(next http.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request().WithContext(context.WithValue(c.Request().Context(), echoContextKey{}, c))
		next(c.Response(), req)
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
