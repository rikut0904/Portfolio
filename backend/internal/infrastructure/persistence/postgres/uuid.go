package postgres

import "github.com/google/uuid"

func newUUID() string { return uuid.New().String() }

func nullableString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
