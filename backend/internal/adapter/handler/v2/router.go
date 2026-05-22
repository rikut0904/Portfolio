package v2

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// Register registers all v2 API routes with the provided Huma API.
func Register(api huma.API, h *Handler) {
	// Register middlewares
	api.UseMiddleware(LogMiddleware(api))
	api.UseMiddleware(h.AuthMiddleware(api))

	huma.Register(api, huma.Operation{
		OperationID: "get-app-mode-v2",
		Method:      http.MethodGet,
		Path:        "/api/v2/app-mode",
		Summary:     "Get application mode (v2)",
		Tags:        []string{"v2"},
	}, h.AppMode.GetAppMode)

	// Note: Other routes are commented out for now to keep the adapter skeleton clean
	// but compilable.
	/*
		huma.Register(api, huma.Operation{
			OperationID: "get-technologies-v2",
			Method:      http.MethodGet,
			Path:        "/api/v2/technologies",
			Summary:     "Get all technologies (v2)",
			Tags:        []string{"v2"},
		}, h.Technologies.GetTechnologies)

		huma.Register(api, huma.Operation{
			OperationID: "get-products-v2",
			Method:      http.MethodGet,
			Path:        "/api/v2/products",
			Summary:     "List products (v2)",
			Tags:        []string{"v2"},
		}, h.Products.GetProducts)

		huma.Register(api, huma.Operation{
			OperationID: "get-sections-v2",
			Method:      http.MethodGet,
			Path:        "/api/v2/sections",
			Summary:     "Get all sections (v2)",
			Tags:        []string{"v2"},
		}, h.Sections.GetSections)
	*/
}
