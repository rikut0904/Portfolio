package httpapi

import (
	"context"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"

	"gorm.io/gorm"
)

type calendarPreferenceModel struct {
	CalendarID string    `gorm:"column:calendar_id;primaryKey"`
	Color      string    `gorm:"column:color"`
	Label      string    `gorm:"column:label"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt  time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (calendarPreferenceModel) TableName() string {
	return "calendar_preferences"
}

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

	tx := h.store.DB.WithContext(r.Context()).Begin()
	if tx.Error != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update calendar preferences", tx.Error)
	}
	defer tx.Rollback()

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

		var pref calendarPreferenceModel
		err := tx.Where("calendar_id = ?", id).First(&pref).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return NewAppError(http.StatusInternalServerError, "Failed to update calendar preferences", err)
		}

		if err == gorm.ErrRecordNotFound {
			pref = calendarPreferenceModel{
				CalendarID: id,
			}
			if hasColor {
				pref.Color = normalizedColor
			} else {
				pref.Color = h.service.DefaultCalendarColors()[id]
			}
			if hasLabel {
				pref.Label = normalizedLabel
			} else {
				pref.Label = ""
			}
			if err := tx.Create(&pref).Error; err != nil {
				return NewAppError(http.StatusInternalServerError, "Failed to update calendar preferences", err)
			}
		} else {
			updates := map[string]interface{}{}
			if hasColor {
				updates["color"] = normalizedColor
			}
			if hasLabel {
				updates["label"] = normalizedLabel
			}
			if len(updates) > 0 {
				if err := tx.Model(&pref).Updates(updates).Error; err != nil {
					return NewAppError(http.StatusInternalServerError, "Failed to update calendar preferences", err)
				}
			}
		}
	}

	if len(updatedColors) == 0 && len(updatedLabels) == 0 {
		return NewAppError(http.StatusBadRequest, "No valid preferences to update", nil)
	}

	if err := tx.Commit().Error; err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update calendar preferences", err)
	}

	preferences, err := h.resolveCalendarPreferences(r.Context())
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

	var prefs []calendarPreferenceModel
	if err := h.store.DB.WithContext(ctx).Where("calendar_id IN ?", allIDs).Find(&prefs).Error; err != nil {
		log.Printf("calendar_preferences: query failed (using defaults): %v", err)
		return response, nil
	}

	for _, p := range prefs {
		calendarID := p.CalendarID
		if normalized := normalizeCalendarColor(p.Color); normalized != "" {
			response.CalendarColors[calendarID] = normalized
		}
		response.CalendarLabels[calendarID] = strings.TrimSpace(p.Label)
		if response.CalendarLabels[calendarID] != "" {
			response.CalendarDisplayName[calendarID] = response.CalendarLabels[calendarID]
		}
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
