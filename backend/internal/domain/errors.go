package domain

import (
	"errors"
	"fmt"
)

// Common domain errors that are independent of any transport layer (HTTP, etc.)
var (
	ErrNotFound          = errors.New("resource not found")
	ErrAlreadyExists     = errors.New("resource already exists")
	ErrInvalidInput      = errors.New("invalid input provided")
	ErrUnauthorized      = errors.New("unauthorized access")
	ErrForbidden         = errors.New("action forbidden")
	ErrInternal          = errors.New("internal server error")
	ErrNotImplemented    = errors.New("feature not implemented")
	ErrServiceUnavailable = errors.New("service temporarily unavailable")
)

// DomainError can be used to wrap original errors with additional context
type DomainError struct {
	Code    error
	Message string
	Wrapped error
}

func (e *DomainError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("%v: %s", e.Code, e.Message)
	}
	return e.Code.Error()
}

func (e *DomainError) Unwrap() error {
	return e.Wrapped
}

// Wrap returns a new DomainError wrapping an existing error
func Wrap(code error, message string, wrapped error) error {
	return &DomainError{
		Code:    code,
		Message: message,
		Wrapped: wrapped,
	}
}
