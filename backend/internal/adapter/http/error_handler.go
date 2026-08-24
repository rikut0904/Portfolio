package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// HTTPErrorHandler returns a consistent JSON error response for Echo.
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

	resp := map[string]any{
		"title":  http.StatusText(code),
		"status": code,
		"detail": message,
	}

	if err := c.JSON(code, resp); err != nil {
		c.Logger().Error(err)
	}
}
