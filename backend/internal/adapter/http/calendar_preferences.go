package httpapi

import (
	"context"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"portfolio-backend/internal/domain/calendar"
	"portfolio-backend/internal/infrastructure/auth"
)

var hexColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

const calendarPreferencesCacheTTL = 5 * time.Minute

type calendarPreferencesResponse struct {
	CalendarIds         []string          `json:"calendarIds"`
	CalendarColors      map[string]string `json:"calendarColors"`
	CalendarLabels      map[string]string `json:"calendarLabels"`
	CalendarDisplayName map[string]string `json:"calendarDisplayNames"`
}

func (h *CalendarHandler) getCalendarPreferences(w http.ResponseWriter, r *http.Request, _ *auth.Claims) error {
	if h.service == nil || !h.service.Enabled() {
		return NewAppError(http.StatusServiceUnavailable, "Google Calendar is not configured", nil)
	}

	cacheKey := strings.Join(h.service.CalendarIDs(), ",")
	if cached, ok := h.cache.getPreferences(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached.response)
		return nil
	}

	preferences, err := h.resolveCalendarPreferences(r.Context())
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to load calendar preferences", err)
	}
	h.cache.setPreferences(cacheKey, cachedCalendarPreferences{response: preferences}, calendarPreferencesCacheTTL)
	writeJSON(w, http.StatusOK, preferences)
	return nil
}

func (h *CalendarHandler) patchCalendarPreferences(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	if h.service == nil || !h.service.Enabled() {
		return NewAppError(http.StatusServiceUnavailable, "Google Calendar is not configured", nil)
	}

	var body struct {
		Colors map[string]string `json:"colors"`
		Labels map[string]string `json:"labels"`
	}
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	if len(body.Colors) == 0 && len(body.Labels) == 0 {
		return NewAppError(http.StatusBadRequest, "colors or labels is required", nil)
	}

	allowed := make(map[string]struct{}, len(h.service.CalendarIDs()))
	for _, calendarID := range h.service.CalendarIDs() {
		allowed[calendarID] = struct{}{}
	}

	updatedColors := make(map[string]string)
	updatedLabels := make(map[string]string)
	for _, calendarID := range h.service.CalendarIDs() {
		id := strings.TrimSpace(calendarID)
		if id == "" {
			continue
		}
		if _, ok := allowed[id]; !ok {
			continue
		}

		color, hasColor := body.Colors[id]
		label, hasLabel := body.Labels[id]
		if !hasColor && !hasLabel {
			continue
		}

		normalizedColor := ""
		if hasColor {
			normalizedColor = normalizeCalendarColor(color)
			if normalizedColor == "" {
				return NewAppError(http.StatusBadRequest, "Invalid color for "+id, nil)
			}
			updatedColors[id] = normalizedColor
		}
		normalizedLabel := ""
		if hasLabel {
			normalizedLabel = strings.TrimSpace(label)
			updatedLabels[id] = normalizedLabel
		}

	}

	if len(updatedColors) == 0 && len(updatedLabels) == 0 {
		return NewAppError(http.StatusBadRequest, "No valid preferences to update", nil)
	}

	preferences, err := h.repository.PatchPreferences(r.Context(), h.service.CalendarIDs(), h.service.DefaultCalendarColors(), calendar.CalendarPreferencesPayload{Colors: updatedColors, Labels: updatedLabels})
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to load calendar preferences", err)
	}

	h.logAdmin(r.Context(), "update", "calendar_preferences", "", "info", user, map[string]any{
		"colors": updatedColors,
		"labels": updatedLabels,
	})
	h.cache.clearPreferences()
	h.cache.clearEvents()
	writeJSON(w, http.StatusOK, preferences)
	return nil
}

func (h *CalendarHandler) resolveCalendarPreferences(ctx context.Context) (calendarPreferencesResponse, error) {
	defaultColors := map[string]string{}
	if h.service != nil {
		defaultColors = h.service.DefaultCalendarColors()
	}
	allIDs := h.service.CalendarIDs()
	if h.repository == nil {
		return calendarPreferencesResponse{CalendarIds: allIDs, CalendarColors: defaultColors, CalendarLabels: map[string]string{}, CalendarDisplayName: map[string]string{}}, nil
	}
	preferences, err := h.repository.GetPreferences(ctx, allIDs, defaultColors)
	if err != nil {
		log.Printf("calendar_preferences: query failed (using defaults): %v", err)
		return calendarPreferencesResponse{CalendarIds: allIDs, CalendarColors: defaultColors, CalendarLabels: map[string]string{}, CalendarDisplayName: map[string]string{}}, nil
	}
	return calendarPreferencesResponse{CalendarIds: preferences.CalendarIds, CalendarColors: preferences.CalendarColors, CalendarLabels: preferences.CalendarLabels, CalendarDisplayName: preferences.CalendarDisplayName}, nil
}

func normalizeCalendarColor(value string) string {
	color := strings.ToUpper(strings.TrimSpace(value))
	if !hexColorPattern.MatchString(color) {
		return ""
	}
	return color
}
