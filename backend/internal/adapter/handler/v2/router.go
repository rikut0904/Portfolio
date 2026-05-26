package v2

import (
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// Register registers all v2 API routes with the provided Huma API.
func Register(api huma.API, h *Handler) {
	log.Println("Registering v2 API routes...")
	// Register middlewares
	api.UseMiddleware(LogMiddleware(api))
	api.UseMiddleware(h.AuthMiddleware(api))

	adminSecurity := []map[string][]string{{"BearerAuth": {}}}

	// --- System ---
	huma.Register(api, huma.Operation{
		OperationID: "get-app-mode-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/app-mode",
		Summary:     "Get application mode (v2)",
		Tags:        []string{"v2 System"},
	}, h.AppMode.GetAppMode)

	huma.Register(api, huma.Operation{
		OperationID: "admin-set-api-version-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/app-mode/api-version",
		Summary:     "Set active API version (v2)",
		Tags:        []string{"v2 Admin System"},
		Security:    adminSecurity,
	}, h.AppMode.SetAPIVersion)

	// --- Technologies ---
	huma.Register(api, huma.Operation{
		OperationID: "get-technologies-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/technologies",
		Summary:     "Get all technologies (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Technologies.GetTechnologies)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-technology-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/technologies",
		Summary:     "Create technology (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Technologies.CreateTechnology)

	huma.Register(api, huma.Operation{
		OperationID: "admin-update-technology-v2",
		Method:      http.MethodPut,
		Path:        "/api/v2/technologies/{id}",
		Summary:     "Update technology (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Technologies.UpdateTechnology)

	huma.Register(api, huma.Operation{
		OperationID: "admin-delete-technology-v2",
		Method:      http.MethodDelete,
		Path:        "/api/v2/technologies/{id}",
		Summary:     "Delete technology (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Technologies.DeleteTechnology)

	// --- Products ---
	huma.Register(api, huma.Operation{
		OperationID: "get-products-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/products",
		Summary:     "List products (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Products.GetProducts)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-product-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/products",
		Summary:     "Create product (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Products.CreateProduct)

	huma.Register(api, huma.Operation{
		OperationID: "admin-update-product-v2",
		Method:      http.MethodPut,
		Path:        "/api/v2/products/{id}",
		Summary:     "Update product (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Products.UpdateProduct)

	huma.Register(api, huma.Operation{
		OperationID: "admin-delete-product-v2",
		Method:      http.MethodDelete,
		Path:        "/api/v2/products/{id}",
		Summary:     "Delete product (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Products.DeleteProduct)

	// --- Sections ---
	huma.Register(api, huma.Operation{
		OperationID: "get-sections-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/sections",
		Summary:     "Get all sections (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Sections.GetSections)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-section-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/sections",
		Summary:     "Create section (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Sections.CreateSection)

	huma.Register(api, huma.Operation{
		OperationID: "admin-update-section-v2",
		Method:      http.MethodPut,
		Path:        "/api/v2/sections/{id}",
		Summary:     "Update section (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Sections.UpdateSection)

	huma.Register(api, huma.Operation{
		OperationID: "admin-patch-section-meta-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/sections/{id}/meta",
		Summary:     "Patch section metadata (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Sections.PatchSectionMeta)

	huma.Register(api, huma.Operation{
		OperationID: "admin-delete-section-v2",
		Method:      http.MethodDelete,
		Path:        "/api/v2/sections/{id}/delete",
		Summary:     "Delete section (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Sections.DeleteSection)

	// --- Activities ---
	huma.Register(api, huma.Operation{
		OperationID: "get-activities-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/activities",
		Summary:     "Get all activities (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Activities.GetActivities)

	huma.Register(api, huma.Operation{
		OperationID: "get-activity-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/activities/{id}",
		Summary:     "Get activity by ID (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Activities.GetActivity)

	huma.Register(api, huma.Operation{
		OperationID: "get-activity-categories-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/activity-categories",
		Summary:     "Get all activity categories (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Activities.GetActivityCategories)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-activity-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/activities",
		Summary:     "Create activity (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.CreateActivity)

	huma.Register(api, huma.Operation{
		OperationID: "admin-update-activity-v2",
		Method:      http.MethodPut,
		Path:        "/api/v2/activities/{id}",
		Summary:     "Update activity (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.UpdateActivity)

	huma.Register(api, huma.Operation{
		OperationID: "admin-patch-activity-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/activities/{id}",
		Summary:     "Patch activity (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.PatchActivity)

	huma.Register(api, huma.Operation{
		OperationID: "admin-delete-activity-v2",
		Method:      http.MethodDelete,
		Path:        "/api/v2/activities/{id}",
		Summary:     "Delete activity (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.DeleteActivity)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-activity-category-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/activity-categories",
		Summary:     "Create activity category (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.CreateActivityCategory)

	huma.Register(api, huma.Operation{
		OperationID: "admin-patch-activity-category-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/activity-categories/{id}",
		Summary:     "Patch activity category (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.PatchActivityCategory)

	huma.Register(api, huma.Operation{
		OperationID: "admin-delete-activity-category-v2",
		Method:      http.MethodDelete,
		Path:        "/api/v2/activity-categories/{id}",
		Summary:     "Delete activity category (v2)",
		Tags:        []string{"v2 Admin Catalog"},
		Security:    adminSecurity,
	}, h.Activities.DeleteActivityCategory)

	// --- Contact / Inquiries ---
	huma.Register(api, huma.Operation{
		OperationID: "create-inquiry-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/inquiries",
		Summary:     "Create inquiry (v2)",
		Tags:        []string{"v2 Contact"},
	}, h.Inquiries.CreateInquiry)

	huma.Register(api, huma.Operation{
		OperationID: "get-inquiry-thread-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/inquiries/thread/{threadId}",
		Summary:     "Get inquiry by thread ID (v2)",
		Tags:        []string{"v2 Contact"},
	}, h.Inquiries.GetInquiryThread)

	huma.Register(api, huma.Operation{
		OperationID: "admin-get-inquiries-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/inquiries",
		Summary:     "List inquiries (v2)",
		Tags:        []string{"v2 Admin Contact"},
		Security:    adminSecurity,
	}, h.Inquiries.GetInquiries)

	huma.Register(api, huma.Operation{
		OperationID: "admin-get-inquiry-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/inquiries/{id}",
		Summary:     "Get inquiry by ID (v2)",
		Tags:        []string{"v2 Admin Contact"},
		Security:    adminSecurity,
	}, h.Inquiries.GetInquiry)

	huma.Register(api, huma.Operation{
		OperationID: "admin-reply-inquiry-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/inquiries/{id}/reply",
		Summary:     "Reply to inquiry (v2)",
		Tags:        []string{"v2 Admin Contact"},
		Security:    adminSecurity,
	}, h.Inquiries.ReplyInquiry)

	huma.Register(api, huma.Operation{
		OperationID: "admin-update-inquiry-status-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/inquiries/{id}",
		Summary:     "Update inquiry status (v2)",
		Tags:        []string{"v2 Admin Contact"},
		Security:    adminSecurity,
	}, h.Inquiries.UpdateStatus)

	// --- Calendar ---
	huma.Register(api, huma.Operation{
		OperationID: "get-calendar-public-events-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/calendar/events",
		Summary:     "Get public calendar events (v2)",
		Tags:        []string{"v2 Catalog"},
	}, h.Calendar.GetPublicEvents)

	huma.Register(api, huma.Operation{
		OperationID: "admin-get-calendar-events-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/admin/calendar/events",
		Summary:     "Get all calendar events (v2)",
		Tags:        []string{"v2 Admin Calendar"},
		Security:    adminSecurity,
	}, h.Calendar.GetAdminEvents)

	huma.Register(api, huma.Operation{
		OperationID: "admin-patch-calendar-publication-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/admin/calendar/events/publication",
		Summary:     "Patch calendar event publication (v2)",
		Tags:        []string{"v2 Admin Calendar"},
		Security:    adminSecurity,
	}, h.Calendar.PatchPublication)

	huma.Register(api, huma.Operation{
		OperationID: "admin-get-calendar-preferences-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/admin/calendar/preferences",
		Summary:     "Get calendar preferences (v2)",
		Tags:        []string{"v2 Admin Calendar"},
		Security:    adminSecurity,
	}, h.Calendar.GetPreferences)

	huma.Register(api, huma.Operation{
		OperationID: "admin-patch-calendar-preferences-v2",
		Method:      http.MethodPatch,
		Path:        "/api/v2/admin/calendar/preferences",
		Summary:     "Patch calendar preferences (v2)",
		Tags:        []string{"v2 Admin Calendar"},
		Security:    adminSecurity,
	}, h.Calendar.PatchPreferences)

	// --- Admin Logs ---
	huma.Register(api, huma.Operation{
		OperationID: "admin-get-logs-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/admin-logs",
		Summary:     "List admin logs (v2)",
		Tags:        []string{"v2 Admin Logs"},
		Security:    adminSecurity,
	}, h.AdminLogs.GetAdminLogs)

	huma.Register(api, huma.Operation{
		OperationID: "admin-create-auth-log-v2",
		Method:      http.MethodPost,
		Path:        "/api/v2/admin-logs",
		Summary:     "Create auth log (v2)",
		Tags:        []string{"v2 Admin Logs"},
		Security:    adminSecurity,
	}, h.AdminLogs.CreateAuthLog)
}
