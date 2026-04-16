package api

import (
	"context"
	"net/http"
	"strings"

	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/gcalendar"
)

func calendarEventPublicationKey(calendarID, eventID string) string {
	return calendarID + "\x00" + eventID
}

func (h *Handler) resolveCalendarEventPublications(ctx context.Context, events []gcalendar.Event) (map[string]bool, error) {
	publications := make(map[string]bool, len(events))
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

	rows, err := h.store.Pool.Query(ctx, `
		SELECT calendar_id, event_id, is_public
		FROM calendar_event_publications
		WHERE calendar_id = ANY($1) AND event_id = ANY($2)
	`, calendarIDs, eventIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var calendarID string
		var eventID string
		var isPublic bool
		if err := rows.Scan(&calendarID, &eventID, &isPublic); err != nil {
			return nil, err
		}
		publications[calendarEventPublicationKey(calendarID, eventID)] = isPublic
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return publications, nil
}

func applyCalendarEventPublications(events []gcalendar.Event, publications map[string]bool) []gcalendar.Event {
	if len(events) == 0 {
		return []gcalendar.Event{}
	}
	applied := make([]gcalendar.Event, 0, len(events))
	for _, event := range events {
		event.IsPublished = publications[calendarEventPublicationKey(event.CalendarID, event.ID)]
		applied = append(applied, event)
	}
	return applied
}

func (h *Handler) patchCalendarEventPublication(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if h.calendar == nil || !h.calendar.Enabled() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
		return
	}

	var body struct {
		CalendarID  string `json:"calendarId"`
		EventID     string `json:"eventId"`
		IsPublished bool   `json:"isPublished"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}

	calendarID := strings.TrimSpace(body.CalendarID)
	eventID := strings.TrimSpace(body.EventID)
	if calendarID == "" || eventID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "calendarId and eventId are required"})
		return
	}

	allowed := false
	for _, id := range h.calendar.CalendarIDs() {
		if id == calendarID {
			allowed = true
			break
		}
	}
	if !allowed {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid calendarId"})
		return
	}

	if _, err := h.store.Pool.Exec(r.Context(), `
		INSERT INTO calendar_event_publications (calendar_id, event_id, is_public, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (calendar_id, event_id)
		DO UPDATE SET
			is_public = EXCLUDED.is_public,
			updated_at = NOW()
	`, calendarID, eventID, body.IsPublished); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update calendar event publication"})
		return
	}

	h.calendarCache.clearEvents()
	h.logAdmin(r.Context(), "update", "calendar_event_publications", eventID, "info", user, map[string]any{
		"calendarId":  calendarID,
		"isPublished": body.IsPublished,
	})
	writeJSON(w, http.StatusOK, map[string]any{
		"calendarId":  calendarID,
		"eventId":     eventID,
		"isPublished": body.IsPublished,
	})
}
