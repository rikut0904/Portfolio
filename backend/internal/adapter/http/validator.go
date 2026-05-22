package httpapi

import (
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

// CustomValidator is a wrapper for go-playground/validator.
type CustomValidator struct {
	validator *validator.Validate
}

// NewCustomValidator creates a new custom validator.
func NewCustomValidator() *CustomValidator {
	return &CustomValidator{validator: validator.New()}
}

// Validate performs validation on a struct.
func (cv *CustomValidator) Validate(i any) error {
	if err := cv.validator.Struct(i); err != nil {
		// You can cast it to validator.ValidationErrors to get more details
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return nil
}
