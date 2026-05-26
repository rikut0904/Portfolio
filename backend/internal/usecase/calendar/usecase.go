package calendar

import (
	"context"
	"portfolio-backend/internal/domain/calendar"
	"time"
)

type Usecase interface {
	GetPublicEvents(ctx context.Context, from time.Time, to time.Time, calendarIDs []string) (calendar.EventsOutput, error)
	GetAllEvents(ctx context.Context, from time.Time, to time.Time, calendarIDs []string) (calendar.EventsOutput, error)
	PatchPublication(ctx context.Context, input calendar.CalendarPublicationPayload) (calendar.CalendarPublicationPayload, error)
	GetPreferences(ctx context.Context) (calendar.Preferences, error)
	PatchPreferences(ctx context.Context, input calendar.CalendarPreferencesPayload) (calendar.Preferences, error)
}

type interactor struct {
	// dependencies will be added here
}

func New() Usecase {
	return &interactor{}
}

func (u *interactor) GetPublicEvents(ctx context.Context, from time.Time, to time.Time, calendarIDs []string) (calendar.EventsOutput, error) {
	return calendar.EventsOutput{}, nil
}

func (u *interactor) GetAllEvents(ctx context.Context, from time.Time, to time.Time, calendarIDs []string) (calendar.EventsOutput, error) {
	return calendar.EventsOutput{}, nil
}

func (u *interactor) PatchPublication(ctx context.Context, input calendar.CalendarPublicationPayload) (calendar.CalendarPublicationPayload, error) {
	return input, nil
}

func (u *interactor) GetPreferences(ctx context.Context) (calendar.Preferences, error) {
	return calendar.Preferences{}, nil
}

func (u *interactor) PatchPreferences(ctx context.Context, input calendar.CalendarPreferencesPayload) (calendar.Preferences, error) {
	return calendar.Preferences{}, nil
}
