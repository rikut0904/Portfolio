package v2

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humaecho"
)

// AuthMiddleware creates a Huma middleware that enforces Bearer authentication.
// It only triggers if the OpenAPI operation has 'BearerAuth' defined in its security requirements.
func (h *Handler) AuthMiddleware(api huma.API) func(ctx huma.Context, next func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		op := ctx.Operation()
		if op == nil {
			next(ctx)
			return
		}

		requiresAuth := false
		for _, req := range op.Security {
			if _, ok := req["BearerAuth"]; ok {
				requiresAuth = true
				break
			}
		}

		if requiresAuth {
			echoCtx := humaecho.Unwrap(ctx)
			req := echoCtx.Request()

			claims, err := h.verifier.VerifyRequest(req)
			if err != nil {
				status := http.StatusUnauthorized
				if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
					status = http.StatusForbidden
				}
				huma.WriteErr(api, ctx, status, http.StatusText(status), err)
				return
			}

			// Store claims in Echo context for handlers to retrieve
			echoCtx.Set("adminClaims", claims)
		}

		next(ctx)
	}
}

// LogMiddleware logs the details of each request.
func LogMiddleware(api huma.API) func(ctx huma.Context, next func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		start := time.Now()
		next(ctx)

		// In Huma v2, Path might be accessible via ctx.Operation().Path or similar
		path := ""
		if op := ctx.Operation(); op != nil {
			path = op.Path
		}

		log.Printf("v2-api: %s %s took %s", ctx.Method(), path, time.Since(start))
	}
}
