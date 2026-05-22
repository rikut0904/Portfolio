package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// HTTPErrorHandler unifies Echo errors with the Huma/v2 error format.
func HTTPErrorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}

	code := http.StatusInternalServerError
	message := err.Error()

	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
		if s, ok := he.Message.(string); ok {
			message = s
		} else {
			message = http.StatusText(code)
		}
	}

	// Output format matching Huma's default error structure for consistency
	resp := map[string]any{
		"$schema": "https://huma.rocks/openapi/3.1/error.json",
		"title":   http.StatusText(code),
		"status":  code,
		"detail":  message,
	}

	if err := c.JSON(code, resp); err != nil {
		c.Logger().Error(err)
	}
}
