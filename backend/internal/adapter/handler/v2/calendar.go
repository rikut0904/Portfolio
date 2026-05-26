package v2

import (
	"context"
	"errors"
	"portfolio-backend/internal/domain/calendar"
	calendarusecase "portfolio-backend/internal/usecase/calendar"
	"time"
)

type CalendarHandler struct {
	*Common
	usecase calendarusecase.Usecase
}

type GetEventsInput struct {
	From        string   `query:"from" doc:"Start time (RFC3339)"`
	To          string   `query:"to" doc:"End time (RFC3339)"`
	CalendarIDs []string `query:"calendarId" doc:"Filter by calendar IDs"`
}

type CalendarEventsOutput struct {
	Body calendar.EventsOutput
}

func (h *CalendarHandler) GetPublicEvents(ctx context.Context, input *GetEventsInput) (*CalendarEventsOutput, error) {
	from, to, err := parseRange(input.From, input.To)
	if err != nil {
		return nil, MapError(err)
	}

	out, err := h.usecase.GetPublicEvents(ctx, from, to, input.CalendarIDs)
	if err != nil {
		return nil, MapError(err)
	}

	resp := &CalendarEventsOutput{}
	resp.Body = out
	return resp, nil
}

func (h *CalendarHandler) GetAdminEvents(ctx context.Context, input *GetEventsInput) (*CalendarEventsOutput, error) {
	from, to, err := parseRange(input.From, input.To)
	if err != nil {
		return nil, MapError(err)
	}

	out, err := h.usecase.GetAllEvents(ctx, from, to, input.CalendarIDs)
	if err != nil {
		return nil, MapError(err)
	}

	resp := &CalendarEventsOutput{}
	resp.Body = out
	return resp, nil
}

type PatchPublicationInput struct {
	Body calendar.CalendarPublicationPayload
}

type PublicationOutput struct {
	Body calendar.CalendarPublicationPayload
}

func (h *CalendarHandler) PatchPublication(ctx context.Context, input *PatchPublicationInput) (*PublicationOutput, error) {
	user := GetClaims(ctx)
	out, err := h.usecase.PatchPublication(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "calendar_event_publications", input.Body.EventID, "info", user, input.Body)

	resp := &PublicationOutput{}
	resp.Body = out
	return resp, nil
}

type GetPreferencesOutput struct {
	Body calendar.Preferences
}

func (h *CalendarHandler) GetPreferences(ctx context.Context, input *struct{}) (*GetPreferencesOutput, error) {
	out, err := h.usecase.GetPreferences(ctx)
	if err != nil {
		return nil, MapError(err)
	}
	resp := &GetPreferencesOutput{}
	resp.Body = out
	return resp, nil
}

type PatchPreferencesInput struct {
	Body calendar.CalendarPreferencesPayload
}

func (h *CalendarHandler) PatchPreferences(ctx context.Context, input *PatchPreferencesInput) (*GetPreferencesOutput, error) {
	user := GetClaims(ctx)
	out, err := h.usecase.PatchPreferences(ctx, input.Body)
	if err != nil {
		return nil, MapError(err)
	}

	h.LogAdminActivity(ctx, "update", "calendar_preferences", "", "info", user, input.Body)

	resp := &GetPreferencesOutput{}
	resp.Body = out
	return resp, nil
}

func parseRange(fromStr, toStr string) (time.Time, time.Time, error) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -1)
	to := now.AddDate(0, 0, 30)

	var err error
	if fromStr != "" {
		from, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return time.Time{}, time.Time{}, errors.New("invalid from format")
		}
	}
	if toStr != "" {
		to, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			return time.Time{}, time.Time{}, errors.New("invalid to format")
		}
	}
	return from, to, nil
}
