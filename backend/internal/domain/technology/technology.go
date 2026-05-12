package technology

import "errors"

var (
	ErrInvalid   = errors.New("invalid technology")
	ErrDuplicate = errors.New("duplicate technology")
)

type Technology struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Category  string `json:"category"`
	CreatedAt string `json:"createdAt"`
}

type Payload struct {
	Name     string `json:"name"`
	Category string `json:"category"`
}
