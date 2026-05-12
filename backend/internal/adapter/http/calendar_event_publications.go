package httpapi

import (
	"context"
	"net/http"
	"strings"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/persistence/postgres"

	"gorm.io/gorm/clause"
)

type calendarEventPublication struct {
	IsPublic          bool
	PublicDescription string
}

func calendarEventPublicationKey(calendarID, eventID string) string {
	return calendarID + "\x00" + eventID
}

func (h *CalendarHandler) resolveCalendarEventPublications(ctx context.Context, events []gcalendar.Event) (map[string]calendarEventPublication, error) {
	publications := make(map[string]calendarEventPublication, len(events))
	if len(events) == 0 {
		return publications, nil
	}

	calendarIDs := make([]string, 0, len(events))
	eventIDs := make([]string, 0, len(events))
	seenCalendars := make(map[string]struct{}, len(events))
	seenEvents := make(map[string]struct{}, len(events))
	for _, event := range events {
		if event.CalendarID != "" {
			if _, ok := seenCalendars[event.CalendarID]; !ok {
				seenCalendars[event.CalendarID] = struct{}{}
				calendarIDs = append(calendarIDs, event.CalendarID)
			}
		}
		if event.ID != "" {
			if _, ok := seenEvents[event.ID]; !ok {
				seenEvents[event.ID] = struct{}{}
				eventIDs = append(eventIDs, event.ID)
			}
		}
	}
	if len(calendarIDs) == 0 || len(eventIDs) == 0 {
		return publications, nil
	}

	var models []postgres.CalendarEventPublicationModel
	err := h.store.DB.WithContext(ctx).
		Where("calendar_id IN ? AND event_id IN ?", calendarIDs, eventIDs).
		Find(&models).Error
	if err != nil {
		return nil, err
	}

	for _, m := range models {
		publications[calendarEventPublicationKey(m.CalendarID, m.EventID)] = calendarEventPublication{
			IsPublic:          m.IsPublic,
			PublicDescription: strings.TrimSpace(m.PublicDescription),
		}
	}
	return publications, nil
}

func applyCalendarEventPublications(events []gcalendar.Event, publications map[string]calendarEventPublication) []gcalendar.Event {
	if len(events) == 0 {
		return []gcalendar.Event{}
	}
	applied := make([]gcalendar.Event, 0, len(events))
	for _, event := range events {
		publication := publications[calendarEventPublicationKey(event.CalendarID, event.ID)]
		event.IsPublished = publication.IsPublic
		event.PublicDescription = publication.PublicDescription
		applied = append(applied, event)
	}
	return applied
}

func (h *CalendarHandler) patchCalendarEventPublication(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	if h.service == nil || !h.service.Enabled() {
		return NewAppError(http.StatusServiceUnavailable, "Google Calendar is not configured", nil)
	}

	var body struct {
		CalendarID        string `json:"calendarId"`
		EventID           string `json:"eventId"`
		IsPublished       bool   `json:"isPublished"`
		PublicDescription string `json:"publicDescription"`
	}
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}

	calendarID := strings.TrimSpace(body.CalendarID)
	eventID := strings.TrimSpace(body.EventID)
	if calendarID == "" || eventID == "" {
		return NewAppError(http.StatusBadRequest, "calendarId and eventId are required", nil)
	}

	allowed := false
	for _, id := range h.service.CalendarIDs() {
		if id == calendarID {
			allowed = true
			break
		}
	}
	if !allowed {
		return NewAppError(http.StatusBadRequest, "Invalid calendarId", nil)
	}

	publicDescription := strings.TrimSpace(body.PublicDescription)

	model := postgres.CalendarEventPublicationModel{
		CalendarID:        calendarID,
		EventID:           eventID,
		IsPublic:          body.IsPublished,
		PublicDescription: publicDescription,
	}

	if err := h.store.DB.WithContext(r.Context()).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "calendar_id"}, {Name: "event_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"is_public", "public_description", "updated_at"}),
	}).Create(&model).Error; err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update calendar event publication", err)
	}

	h.cache.clearEvents()
	h.logAdmin(r.Context(), "update", "calendar_event_publications", eventID, "info", user, map[string]any{
		"calendarId":        calendarID,
		"isPublished":       body.IsPublished,
		"publicDescription": publicDescription,
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"calendarId":        calendarID,
		"eventId":           eventID,
		"isPublished":       body.IsPublished,
		"publicDescription": publicDescription,
	})
	return nil
}
