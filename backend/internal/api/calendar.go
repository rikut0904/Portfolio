package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/gcalendar"
)

const publicCalendarEventLabel = "予定あり"

const calendarEventsCacheTTL = 45 * time.Second

func (h *Handler) getCalendarPublicEvents(w http.ResponseWriter, r *http.Request) {
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

	events, err := h.listCalendarEventsWithCache(r.Context(), start, end, selectedCalendarIDs)
	if err != nil {
		log.Printf("calendar public events fetch error: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to fetch Google Calendar events"})
		return
	}
	events = filterEventsForPublicCalendar(events)
	publicEvents := sanitizeEventsForPublicResponse(events)
	filteredIDs := selectedCalendarIDsOrAll(h.calendar.CalendarIDs(), selectedCalendarIDs)
	fromText := start.Format(time.RFC3339)
	toText := end.Format(time.RFC3339)
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{
		"timezone":             h.calendar.Timezone(),
		"calendarIds":          filteredIDs,
		"calendarColors":       publicGrayCalendarColors(filteredIDs),
		"calendarLabels":       emptyCalendarStringMap(filteredIDs),
		"calendarDisplayNames": emptyCalendarStringMap(filteredIDs),
		"from":                 fromText,
		"to":                   toText,
		"events":               publicEvents,
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

	cacheKey := buildCalendarEventsCacheKey(start, end, selectedCalendarIDs)
	if cached, ok := h.calendarCache.getEvents(cacheKey); ok {
		filteredIDs := selectedCalendarIDsOrAll(h.calendar.CalendarIDs(), selectedCalendarIDs)
		writeCacheHeader(w)
		writeJSON(w, http.StatusOK, map[string]any{
			"timezone":             h.calendar.Timezone(),
			"calendarIds":          filteredIDs,
			"calendarColors":       filterCalendarMap(cached.response.CalendarColors, filteredIDs),
			"calendarLabels":       filterCalendarMap(cached.response.CalendarLabels, filteredIDs),
			"calendarDisplayNames": filterCalendarMap(cached.response.CalendarDisplayName, filteredIDs),
			"from":                 cached.from,
			"to":                   cached.to,
			"events":               cached.events,
		})
		return
	}

	events, err := h.listCalendarEventsWithCache(r.Context(), start, end, selectedCalendarIDs)
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
	fromText := start.Format(time.RFC3339)
	toText := end.Format(time.RFC3339)
	h.calendarCache.setEvents(cacheKey, cachedCalendarEventsResponse{
		response: preferences,
		events:   events,
		from:     fromText,
		to:       toText,
	}, calendarEventsCacheTTL)
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{
		"timezone":             h.calendar.Timezone(),
		"calendarIds":          filteredIDs,
		"calendarColors":       filterCalendarMap(preferences.CalendarColors, filteredIDs),
		"calendarLabels":       filterCalendarMap(preferences.CalendarLabels, filteredIDs),
		"calendarDisplayNames": filterCalendarMap(preferences.CalendarDisplayName, filteredIDs),
		"from":                 fromText,
		"to":                   toText,
		"events":               events,
	})
}

func buildCalendarEventsCacheKey(start, end time.Time, selected []string) string {
	return start.Format(time.RFC3339) + "|" + end.Format(time.RFC3339) + "|" + strings.Join(selected, ",")
}

func (h *Handler) listCalendarEventsWithCache(ctx context.Context, start, end time.Time, selectedCalendarIDs []string) ([]gcalendar.Event, error) {
	cacheKey := buildCalendarEventsCacheKey(start, end, selectedCalendarIDs)
	if cached, ok := h.calendarCache.getEvents(cacheKey); ok {
		return cached.events, nil
	}

	events, err := h.calendar.ListEvents(ctx, start, end, selectedCalendarIDs)
	if err != nil {
		return nil, err
	}
	preferences, err := h.resolveCalendarPreferences(ctx)
	if err != nil {
		return nil, err
	}
	h.calendarCache.setEvents(cacheKey, cachedCalendarEventsResponse{
		response: preferences,
		events:   events,
		from:     start.Format(time.RFC3339),
		to:       end.Format(time.RFC3339),
	}, calendarEventsCacheTTL)
	return events, nil
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

// filterEventsForPublicCalendar は公開 API で返す・空き計算に使うイベントを絞り込む。
// 今後、タグや公開フラグなどの条件をここに追加する。
func filterEventsForPublicCalendar(events []gcalendar.Event) []gcalendar.Event {
	return events
}

func sanitizeEventsForPublicResponse(events []gcalendar.Event) []gcalendar.Event {
	out := make([]gcalendar.Event, 0, len(events))
	for _, e := range events {
		out = append(out, gcalendar.Event{
			ID:          publicOpaqueEventID(e.CalendarID, e.ID),
			CalendarID:  e.CalendarID,
			Summary:     publicCalendarEventLabel,
			Description: "",
			Location:    "",
			HTMLLink:    "",
			Status:      "",
			Start:       e.Start,
			End:         e.End,
			IsAllDay:    e.IsAllDay,
		})
	}
	return out
}

func publicOpaqueEventID(calendarID, googleEventID string) string {
	sum := sha256.Sum256([]byte("pub-event\x00" + calendarID + "\x00" + googleEventID))
	return "p-" + hex.EncodeToString(sum[:12])
}

func emptyCalendarStringMap(calendarIDs []string) map[string]string {
	out := make(map[string]string, len(calendarIDs))
	for _, id := range calendarIDs {
		out[id] = ""
	}
	return out
}

// publicGrayCalendarColors は公開 UI ではカレンダーごとの色を出さないため、一律のグレーにそろえる。
func publicGrayCalendarColors(calendarIDs []string) map[string]string {
	const gray = "#9CA3AF"
	out := make(map[string]string, len(calendarIDs))
	for _, id := range calendarIDs {
		out[id] = gray
	}
	return out
}

type badRequestError struct{ message string }

func (e badRequestError) Error() string { return e.message }

func errInvalid(message string) error { return badRequestError{message: message} }
