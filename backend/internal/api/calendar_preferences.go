package api

import (
	"context"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"portfolio-backend/internal/auth"
)

var hexColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

const calendarPreferencesCacheTTL = 5 * time.Minute

type calendarPreferencesResponse struct {
	CalendarIds         []string          `json:"calendarIds"`
	CalendarColors      map[string]string `json:"calendarColors"`
	CalendarLabels      map[string]string `json:"calendarLabels"`
	CalendarDisplayName map[string]string `json:"calendarDisplayNames"`
}

func (h *Handler) getCalendarPreferences(w http.ResponseWriter, r *http.Request, _ *auth.Claims) {
	if h.calendar == nil || !h.calendar.Enabled() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
		return
	}

	cacheKey := strings.Join(h.calendar.CalendarIDs(), ",")
	if cached, ok := h.calendarCache.getPreferences(cacheKey); ok {
		writeJSON(w, http.StatusOK, cached.response)
		return
	}

	preferences, err := h.resolveCalendarPreferences(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load calendar preferences"})
		return
	}
	h.calendarCache.setPreferences(cacheKey, cachedCalendarPreferences{response: preferences}, calendarPreferencesCacheTTL)
	writeJSON(w, http.StatusOK, preferences)
}

func (h *Handler) patchCalendarPreferences(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if h.calendar == nil || !h.calendar.Enabled() {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
		return
	}

	var body struct {
		Colors map[string]string `json:"colors"`
		Labels map[string]string `json:"labels"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if len(body.Colors) == 0 && len(body.Labels) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "colors or labels is required"})
		return
	}

	allowed := make(map[string]struct{}, len(h.calendar.CalendarIDs()))
	for _, calendarID := range h.calendar.CalendarIDs() {
		allowed[calendarID] = struct{}{}
	}

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update calendar preferences"})
		return
	}
	defer tx.Rollback(r.Context())

	updatedColors := make(map[string]string)
	updatedLabels := make(map[string]string)
	for _, calendarID := range h.calendar.CalendarIDs() {
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
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid color for " + id})
				return
			}
			updatedColors[id] = normalizedColor
		}
		normalizedLabel := ""
		if hasLabel {
			normalizedLabel = strings.TrimSpace(label)
			updatedLabels[id] = normalizedLabel
		}

		if _, err := tx.Exec(r.Context(), `
				INSERT INTO calendar_preferences (calendar_id, color, label, updated_at)
				VALUES (
					$1,
					CASE
						WHEN $4 THEN $2
						ELSE $3
					END,
					CASE
						WHEN $5 THEN $6
						ELSE ''
					END,
					NOW()
				)
				ON CONFLICT (calendar_id)
				DO UPDATE SET
					color = CASE
						WHEN $4 THEN EXCLUDED.color
						ELSE calendar_preferences.color
					END,
					label = CASE
						WHEN $5 THEN EXCLUDED.label
						ELSE calendar_preferences.label
					END,
					updated_at = NOW()
			`, id, normalizedColor, h.calendar.DefaultCalendarColors()[id], hasColor, hasLabel, normalizedLabel); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update calendar preferences"})
			return
		}
	}

	if len(updatedColors) == 0 && len(updatedLabels) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "No valid preferences to update"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update calendar preferences"})
		return
	}

	preferences, err := h.resolveCalendarPreferences(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to load calendar preferences"})
		return
	}

	h.logAdmin(r.Context(), "update", "calendar_preferences", "", "info", user, map[string]any{
		"colors": updatedColors,
		"labels": updatedLabels,
	})
	h.calendarCache.clearPreferences()
	h.calendarCache.clearEvents()
	writeJSON(w, http.StatusOK, preferences)
}

func (h *Handler) resolveCalendarPreferences(ctx context.Context) (calendarPreferencesResponse, error) {
	defaultColors := map[string]string{}
	if h.calendar != nil {
		defaultColors = h.calendar.DefaultCalendarColors()
	}
	allIDs := h.calendar.CalendarIDs()
	response := calendarPreferencesResponse{
		CalendarIds:         allIDs,
		CalendarColors:      make(map[string]string, len(defaultColors)),
		CalendarLabels:      make(map[string]string, len(allIDs)),
		CalendarDisplayName: make(map[string]string, len(allIDs)),
	}
	for _, calendarID := range allIDs {
		response.CalendarColors[calendarID] = defaultColors[calendarID]
		response.CalendarLabels[calendarID] = ""
		response.CalendarDisplayName[calendarID] = calendarID
	}
	if len(allIDs) == 0 {
		return response, nil
	}

	rows, err := h.store.Pool.Query(ctx, `
		SELECT calendar_id, color, label
		FROM calendar_preferences
		WHERE calendar_id = ANY($1)
	`, allIDs)
	if err != nil {
		log.Printf("calendar_preferences: query failed (using defaults): %v", err)
		return response, nil
	}
	defer rows.Close()

	for rows.Next() {
		var calendarID string
		var color string
		var label string
		if err := rows.Scan(&calendarID, &color, &label); err != nil {
			return calendarPreferencesResponse{}, err
		}
		if normalized := normalizeCalendarColor(color); normalized != "" {
			response.CalendarColors[calendarID] = normalized
		}
		response.CalendarLabels[calendarID] = strings.TrimSpace(label)
		if response.CalendarLabels[calendarID] != "" {
			response.CalendarDisplayName[calendarID] = response.CalendarLabels[calendarID]
		}
	}
	if err := rows.Err(); err != nil {
		return calendarPreferencesResponse{}, err
	}
	return response, nil
}

func normalizeCalendarColor(value string) string {
	color := strings.ToUpper(strings.TrimSpace(value))
	if !hexColorPattern.MatchString(color) {
		return ""
	}
	return color
}
