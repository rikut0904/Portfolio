package httpapi

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"
)

type echoContextKey struct{}

func (h *Handler) Register(e *echo.Echo) {
	e.GET("/health", h.handleHealthEcho)

	api := e.Group("/api")
	api.GET("/app-mode", h.getAppModeEcho)
	api.GET("/calendar/events", wrapHTTP(h.getCalendarPublicEvents))

	api.GET("/admin/calendar/events", wrapHTTP(h.withAdmin(h.getCalendarEvents)))
	api.PATCH("/admin/calendar/events/publication", wrapHTTP(h.withAdmin(h.patchCalendarEventPublication)))
	api.GET("/admin/calendar/preferences", wrapHTTP(h.withAdmin(h.getCalendarPreferences)))
	api.PATCH("/admin/calendar/preferences", wrapHTTP(h.withAdmin(h.patchCalendarPreferences)))
	api.POST("/auth/login", h.loginEcho)
	api.POST("/auth/refresh", h.refreshTokenEcho)
	api.GET("/auth/me", h.withAdminEcho(h.meEcho))

	api.GET("/products", wrapHTTP(h.getProducts))
	api.POST("/products", wrapHTTP(h.withAdmin(h.createProduct)))
	api.PUT("/products/:id", wrapHTTP(h.withAdmin(h.updateProduct)))
	api.DELETE("/products/:id", wrapHTTP(h.withAdmin(h.deleteProduct)))

	api.GET("/sections", wrapHTTP(h.getSections))
	api.POST("/sections", wrapHTTP(h.withAdmin(h.createSection)))
	api.PUT("/sections/:id", wrapHTTP(h.withAdmin(h.updateSection)))
	api.PATCH("/sections/:id/meta", wrapHTTP(h.withAdmin(h.patchSectionMeta)))
	api.DELETE("/sections/:id/delete", wrapHTTP(h.withAdmin(h.deleteSection)))

	api.GET("/activities", wrapHTTP(h.getActivities))
	api.POST("/activities", wrapHTTP(h.withAdmin(h.createActivity)))
	api.GET("/activities/:id", wrapHTTP(h.getActivity))
	api.PUT("/activities/:id", wrapHTTP(h.withAdmin(h.updateActivity)))
	api.PATCH("/activities/:id", wrapHTTP(h.withAdmin(h.patchActivity)))
	api.DELETE("/activities/:id", wrapHTTP(h.withAdmin(h.deleteActivity)))

	api.GET("/activity-categories", wrapHTTP(h.getActivityCategories))
	api.POST("/activity-categories", wrapHTTP(h.withAdmin(h.createActivityCategory)))
	api.PATCH("/activity-categories/:id", wrapHTTP(h.withAdmin(h.patchActivityCategory)))
	api.DELETE("/activity-categories/:id", wrapHTTP(h.withAdmin(h.deleteActivityCategory)))

	api.GET("/technologies", wrapHTTP(h.getTechnologies))
	api.POST("/technologies", wrapHTTP(h.withAdmin(h.createTechnology)))
	api.PUT("/technologies/:id", wrapHTTP(h.withAdmin(h.updateTechnology)))
	api.DELETE("/technologies/:id", wrapHTTP(h.withAdmin(h.deleteTechnology)))
	api.POST("/images/upload", wrapHTTP(h.withAdmin(h.uploadImage)))

	api.POST("/contact", wrapHTTP(h.createInquiry))
	api.GET("/contact/thread/:threadId", wrapHTTP(h.getInquiryThread))
	api.POST("/contact/thread/:threadId/reply", wrapHTTP(h.replyInquiryThread))
	api.GET("/contact", wrapHTTP(h.withAdmin(h.getInquiries)))
	api.GET("/contact/:id", wrapHTTP(h.withAdmin(h.getInquiry)))
	api.PATCH("/contact/:id", wrapHTTP(h.withAdmin(h.patchInquiryStatus)))
	api.POST("/contact/:id/reply", wrapHTTP(h.withAdmin(h.replyInquiry)))

	api.POST("/inquiries", wrapHTTP(h.createInquiry))
	api.GET("/inquiries/thread/:threadId", wrapHTTP(h.getInquiryThread))
	api.POST("/inquiries/thread/:threadId/reply", wrapHTTP(h.replyInquiryThread))
	api.GET("/inquiries", wrapHTTP(h.withAdmin(h.getInquiries)))
	api.GET("/inquiries/:id", wrapHTTP(h.withAdmin(h.getInquiry)))
	api.PATCH("/inquiries/:id", wrapHTTP(h.withAdmin(h.patchInquiryStatus)))
	api.POST("/inquiries/:id/reply", wrapHTTP(h.withAdmin(h.replyInquiry)))

	api.POST("/admin-logs", wrapHTTP(h.withAdmin(h.createAuthLog)))
	api.GET("/admin-logs", wrapHTTP(h.withAdmin(h.getAdminLogs)))
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
