package postgres

import (
	"context"
	"strings"

	"gorm.io/gorm/clause"
	"portfolio-backend/internal/domain/calendar"
	calendarusecase "portfolio-backend/internal/usecase/calendar"
)

type CalendarRepository struct{ store *Store }

func NewCalendarRepository(store *Store) *CalendarRepository {
	return &CalendarRepository{store: store}
}

func (r *CalendarRepository) GetPreferences(ctx context.Context, ids []string, defaults map[string]string) (calendar.Preferences, error) {
	result := defaultPreferences(ids, defaults)
	if len(ids) == 0 {
		return result, nil
	}
	var rows []CalendarPreferenceModel
	if err := r.store.DB.WithContext(ctx).Where("calendar_id IN ?", ids).Find(&rows).Error; err != nil {
		return result, err
	}
	for _, row := range rows {
		if strings.TrimSpace(row.Color) != "" {
			result.CalendarColors[row.CalendarID] = strings.TrimSpace(row.Color)
		}
		result.CalendarLabels[row.CalendarID] = strings.TrimSpace(row.Label)
		if result.CalendarLabels[row.CalendarID] != "" {
			result.CalendarDisplayName[row.CalendarID] = result.CalendarLabels[row.CalendarID]
		}
	}
	return result, nil
}

func (r *CalendarRepository) PatchPreferences(ctx context.Context, ids []string, defaults map[string]string, input calendar.CalendarPreferencesPayload) (calendar.Preferences, error) {
	for _, id := range ids {
		color, hasColor := input.Colors[id]
		label, hasLabel := input.Labels[id]
		if !hasColor && !hasLabel {
			continue
		}
		values := map[string]any{"calendar_id": id, "color": defaults[id], "label": ""}
		if hasColor {
			values["color"] = color
		}
		if hasLabel {
			values["label"] = strings.TrimSpace(label)
		}
		if err := r.store.DB.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "calendar_id"}}, DoUpdates: clause.AssignmentColumns([]string{"color", "label", "updated_at"})}).Create(&CalendarPreferenceModel{CalendarID: id, Color: values["color"].(string), Label: values["label"].(string)}).Error; err != nil {
			return calendar.Preferences{}, err
		}
	}
	return r.GetPreferences(ctx, ids, defaults)
}

func (r *CalendarRepository) GetPublications(ctx context.Context, events []calendar.Event) (map[string]calendarusecase.EventPublication, error) {
	result := map[string]calendarusecase.EventPublication{}
	if len(events) == 0 {
		return result, nil
	}
	calendarIDs, eventIDs := []string{}, []string{}
	for _, event := range events {
		if event.CalendarID != "" {
			calendarIDs = append(calendarIDs, event.CalendarID)
		}
		if event.ID != "" {
			eventIDs = append(eventIDs, event.ID)
		}
	}
	var rows []CalendarEventPublicationModel
	if err := r.store.DB.WithContext(ctx).Where("calendar_id IN ? AND event_id IN ?", calendarIDs, eventIDs).Find(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.CalendarID+"\x00"+row.EventID] = calendarusecase.EventPublication{CalendarID: row.CalendarID, EventID: row.EventID, IsPublic: row.IsPublic, PublicDescription: strings.TrimSpace(row.PublicDescription)}
	}
	return result, nil
}

func (r *CalendarRepository) PatchPublication(ctx context.Context, input calendarusecase.EventPublication) error {
	return r.store.DB.WithContext(ctx).Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "calendar_id"}, {Name: "event_id"}}, DoUpdates: clause.AssignmentColumns([]string{"is_public", "public_description", "updated_at"})}).Create(&CalendarEventPublicationModel{CalendarID: input.CalendarID, EventID: input.EventID, IsPublic: input.IsPublic, PublicDescription: input.PublicDescription}).Error
}

func defaultPreferences(ids []string, defaults map[string]string) calendar.Preferences {
	result := calendar.Preferences{CalendarIds: ids, CalendarColors: map[string]string{}, CalendarLabels: map[string]string{}, CalendarDisplayName: map[string]string{}}
	for _, id := range ids {
		result.CalendarColors[id] = defaults[id]
		result.CalendarLabels[id] = ""
		result.CalendarDisplayName[id] = id
	}
	return result
}
