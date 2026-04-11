package api

import (
	"log"
	"net/http"
	"time"

	"portfolio-backend/internal/auth"
)

type calendarResponse struct {
	Timezone string `json:"timezone"`
	From     string `json:"from"`
	To       string `json:"to"`
}

func (h *Handler) getCalendarAvailability(w http.ResponseWriter, r *http.Request) {
	if h.calendar == nil || !h.calendar.Enabled() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
		return
	}
	start, end, err := parseCalendarRange(r, h.calendar.Timezone())
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	selectedCalendarIDs := parseCalendarIDFilter(r)
	days, err := h.calendar.GetAvailability(r.Context(), start, end, selectedCalendarIDs)
	if err != nil {
		log.Printf("calendar availability fetch error: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to fetch Google Calendar availability"})
		return
	}
	preferences, err := h.resolveCalendarPreferences(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load calendar preferences"})
		return
	}
	filteredIDs := selectedCalendarIDsOrAll(h.calendar.CalendarIDs(), selectedCalendarIDs)
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{
		"timezone":             h.calendar.Timezone(),
		"calendarIds":          filteredIDs,
		"calendarColors":       filterCalendarMap(preferences.CalendarColors, filteredIDs),
		"calendarLabels":       filterCalendarMap(preferences.CalendarLabels, filteredIDs),
		"calendarDisplayNames": filterCalendarMap(preferences.CalendarDisplayName, filteredIDs),
		"from":                 start.Format(time.RFC3339),
		"to":                   end.Format(time.RFC3339),
		"days":                 days,
	})
}

func (h *Handler) getCalendarEvents(w http.ResponseWriter, r *http.Request, _ *auth.Claims) {
	if h.calendar == nil || !h.calendar.Enabled() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
		return
	}
	start, end, err := parseCalendarRange(r, h.calendar.Timezone())
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	selectedCalendarIDs := parseCalendarIDFilter(r)
	events, err := h.calendar.ListEvents(r.Context(), start, end, selectedCalendarIDs)
	if err != nil {
		log.Printf("calendar events fetch error: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to fetch Google Calendar events"})
		return
	}
	preferences, err := h.resolveCalendarPreferences(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load calendar preferences"})
		return
	}
	filteredIDs := selectedCalendarIDsOrAll(h.calendar.CalendarIDs(), selectedCalendarIDs)
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{
		"timezone":             h.calendar.Timezone(),
		"calendarIds":          filteredIDs,
		"calendarColors":       filterCalendarMap(preferences.CalendarColors, filteredIDs),
		"calendarLabels":       filterCalendarMap(preferences.CalendarLabels, filteredIDs),
		"calendarDisplayNames": filterCalendarMap(preferences.CalendarDisplayName, filteredIDs),
		"from":                 start.Format(time.RFC3339),
		"to":                   end.Format(time.RFC3339),
		"events":               events,
	})
}

func parseCalendarRange(r *http.Request, timezone string) (time.Time, time.Time, error) {
	loc := loadCalendarLocation(timezone)
	now := time.Now().In(loc)
	fromText := r.URL.Query().Get("from")
	toText := r.URL.Query().Get("to")
	start := now.AddDate(0, 0, -1)
	end := now.AddDate(0, 0, 30)
	var err error
	if fromText != "" {
		start, err = time.Parse(time.RFC3339, fromText)
		if err != nil {
			return time.Time{}, time.Time{}, errInvalid("from must be RFC3339")
		}
	}
	if toText != "" {
		end, err = time.Parse(time.RFC3339, toText)
		if err != nil {
			return time.Time{}, time.Time{}, errInvalid("to must be RFC3339")
		}
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, errInvalid("to must be after from")
	}
	if end.Sub(start) > 370*24*time.Hour {
		return time.Time{}, time.Time{}, errInvalid("range must be 370 days or less")
	}
	return start, end, nil
}

func loadCalendarLocation(timezone string) *time.Location {
	tz := timezone
	if tz == "" {
		tz = "Asia/Tokyo"
	}
	loc, err := time.LoadLocation(tz)
	if err == nil && loc != nil {
		return loc
	}
	if tz == "Asia/Tokyo" {
		return time.FixedZone("Asia/Tokyo", 9*60*60)
	}
	return time.UTC
}

func parseCalendarIDFilter(r *http.Request) []string {
	values := r.URL.Query()["calendarId"]
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func selectedCalendarIDsOrAll(all, selected []string) []string {
	if len(selected) == 0 {
		return all
	}
	return selected
}

func filterCalendarMap(values map[string]string, calendarIDs []string) map[string]string {
	filtered := make(map[string]string, len(calendarIDs))
	for _, calendarID := range calendarIDs {
		filtered[calendarID] = values[calendarID]
	}
	return filtered
}

type badRequestError struct{ message string }

func (e badRequestError) Error() string { return e.message }

func errInvalid(message string) error { return badRequestError{message: message} }
