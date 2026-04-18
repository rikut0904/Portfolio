package gcalendar

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

var defaultCalendarPalette = []string{
	"#C86B5A",
	"#5A7BC8",
	"#4F9D73",
	"#B27A42",
	"#9A5AC8",
	"#C85A8C",
	"#3F8D9D",
	"#7A8F3A",
	"#C65F3D",
	"#5966B8",
}

type Config struct {
	CalendarIDs     []string
	Timezone        string
	CredentialsJSON string
}

type Service struct {
	calendarIDs []string
	timezone    string
	api         *calendar.Service
}

type CreateEventInput struct {
	Summary     string
	Description string
	Start       time.Time
	End         time.Time
}

type CreatedEvent struct {
	HTMLLink string
}

type PartialFetchError struct {
	Failures []string
}

func (e *PartialFetchError) Error() string {
	if e == nil || len(e.Failures) == 0 {
		return "google calendar event fetch partially failed"
	}
	return "google calendar event fetch partially failed: " + strings.Join(e.Failures, "; ")
}

type Event struct {
	ID                string `json:"id"`
	CalendarID        string `json:"calendarId"`
	Summary           string `json:"summary"`
	Description       string `json:"description"`
	PublicDescription string `json:"publicDescription"`
	Location          string `json:"location"`
	HTMLLink          string `json:"htmlLink"`
	Status            string `json:"status"`
	Start             string `json:"start"`
	End               string `json:"end"`
	IsAllDay          bool   `json:"isAllDay"`
	IsPublished       bool   `json:"isPublished"`
}

func New(ctx context.Context, cfg Config) (*Service, error) {
	calendarIDs := normalizeCalendarIDs(cfg.CalendarIDs)
	if len(calendarIDs) == 0 || strings.TrimSpace(cfg.CredentialsJSON) == "" {
		return nil, nil
	}
	api, err := calendar.NewService(
		ctx,
		option.WithCredentialsJSON([]byte(cfg.CredentialsJSON)),
		option.WithScopes(calendar.CalendarScope),
	)
	if err != nil {
		return nil, fmt.Errorf("google calendar init failed: %w", err)
	}
	tz := strings.TrimSpace(cfg.Timezone)
	if tz == "" {
		tz = "Asia/Tokyo"
	}
	return &Service{
		calendarIDs: calendarIDs,
		timezone:    tz,
		api:         api,
	}, nil
}

func (s *Service) Enabled() bool {
	return s != nil && s.api != nil && len(s.calendarIDs) > 0
}

func (s *Service) CalendarIDs() []string {
	if s == nil || len(s.calendarIDs) == 0 {
		return nil
	}
	out := make([]string, len(s.calendarIDs))
	copy(out, s.calendarIDs)
	return out
}

func (s *Service) DefaultCalendarColors() map[string]string {
	colors := make(map[string]string, len(s.calendarIDs))
	for index, calendarID := range s.calendarIDs {
		colors[calendarID] = defaultCalendarPalette[index%len(defaultCalendarPalette)]
	}
	return colors
}

func (s *Service) Timezone() string {
	if s == nil || s.timezone == "" {
		return "Asia/Tokyo"
	}
	return s.timezone
}

func (s *Service) CreateEvent(ctx context.Context, input CreateEventInput) (CreatedEvent, error) {
	if !s.Enabled() {
		return CreatedEvent{}, errors.New("google calendar is not configured")
	}
	if len(s.calendarIDs) == 0 {
		return CreatedEvent{}, errors.New("google calendar target is not configured")
	}
	if input.Start.IsZero() || input.End.IsZero() || !input.End.After(input.Start) {
		return CreatedEvent{}, errors.New("invalid event time range")
	}
	event := &calendar.Event{
		Summary:     strings.TrimSpace(input.Summary),
		Description: strings.TrimSpace(input.Description),
		Start: &calendar.EventDateTime{
			DateTime: input.Start.Format(time.RFC3339),
			TimeZone: s.Timezone(),
		},
		End: &calendar.EventDateTime{
			DateTime: input.End.Format(time.RFC3339),
			TimeZone: s.Timezone(),
		},
	}
	if event.Summary == "" {
		event.Summary = "MTG依頼"
	}
	created, err := s.api.Events.Insert(s.calendarIDs[0], event).Context(ctx).Do()
	if err != nil {
		return CreatedEvent{}, fmt.Errorf("create google calendar event: %w", err)
	}
	return CreatedEvent{HTMLLink: strings.TrimSpace(created.HtmlLink)}, nil
}

func (s *Service) ListEvents(ctx context.Context, start, end time.Time, selectedCalendarIDs []string) ([]Event, error) {
	if !s.Enabled() {
		return nil, errors.New("google calendar is not configured")
	}
	calendarIDs := s.filterCalendarIDs(selectedCalendarIDs)
	if len(calendarIDs) == 0 {
		return []Event{}, nil
	}
	var (
		mu       sync.Mutex
		wg       sync.WaitGroup
		events   = make([]Event, 0)
		failures = make([]string, 0)
	)
	for _, calendarID := range calendarIDs {
		wg.Add(1)
		go func(calendarID string) {
			defer wg.Done()
			calendarEvents, err := s.fetchCalendarEvents(ctx, calendarID, start, end)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				log.Printf("google calendar events.list warning: calendar=%q err=%v", calendarID, err)
				failures = append(failures, fmt.Sprintf("%s: %v", calendarID, err))
				return
			}
			events = append(events, calendarEvents...)
		}(calendarID)
	}
	wg.Wait()
	sort.Slice(events, func(i, j int) bool {
		if events[i].Start == events[j].Start {
			if events[i].End == events[j].End {
				if events[i].CalendarID == events[j].CalendarID {
					return events[i].ID < events[j].ID
				}
				return events[i].CalendarID < events[j].CalendarID
			}
			return events[i].End < events[j].End
		}
		return events[i].Start < events[j].Start
	})
	if len(events) == 0 && len(failures) > 0 {
		return nil, fmt.Errorf("all calendar event fetches failed: %s", strings.Join(failures, "; "))
	}
	if len(failures) > 0 {
		return nil, &PartialFetchError{Failures: failures}
	}
	return events, nil
}

func (s *Service) fetchCalendarEvents(ctx context.Context, calendarID string, start, end time.Time) ([]Event, error) {
	call := s.api.Events.List(calendarID).
		Context(ctx).
		ShowDeleted(false).
		SingleEvents(true).
		OrderBy("startTime").
		TimeMin(start.Format(time.RFC3339)).
		TimeMax(end.Format(time.RFC3339)).
		MaxResults(2500)

	resp, err := call.Do()
	if err != nil {
		return nil, err
	}
	events := make([]Event, 0, len(resp.Items))
	for _, item := range resp.Items {
		if eventDeclinedBySelf(item) {
			continue
		}
		startText, endText, isAllDay := parseEventRange(item)
		events = append(events, Event{
			ID:          item.Id,
			CalendarID:  calendarID,
			Summary:     item.Summary,
			Description: item.Description,
			Location:    item.Location,
			HTMLLink:    item.HtmlLink,
			Status:      item.Status,
			Start:       startText,
			End:         endText,
			IsAllDay:    isAllDay,
		})
	}
	return events, nil
}

func (s *Service) filterCalendarIDs(selected []string) []string {
	if len(selected) == 0 {
		return s.CalendarIDs()
	}
	allowed := make(map[string]struct{}, len(s.calendarIDs))
	for _, calendarID := range s.calendarIDs {
		allowed[calendarID] = struct{}{}
	}
	filtered := make([]string, 0, len(selected))
	seen := make(map[string]struct{}, len(selected))
	for _, calendarID := range selected {
		id := strings.TrimSpace(calendarID)
		if id == "" {
			continue
		}
		if _, ok := allowed[id]; !ok {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		filtered = append(filtered, id)
	}
	return filtered
}

// eventDeclinedBySelf は、自分の参加回答が「辞退」の予定なら true（一覧に出さない）。
func eventDeclinedBySelf(item *calendar.Event) bool {
	if item == nil || len(item.Attendees) == 0 {
		return false
	}
	for _, a := range item.Attendees {
		if a.Self && strings.EqualFold(a.ResponseStatus, "declined") {
			return true
		}
	}
	return false
}

func parseEventRange(item *calendar.Event) (string, string, bool) {
	if item == nil {
		return "", "", false
	}
	if item.Start != nil && item.Start.Date != "" {
		return item.Start.Date, item.End.Date, true
	}
	if item.Start != nil && item.Start.DateTime != "" {
		return item.Start.DateTime, item.End.DateTime, false
	}
	return "", "", false
}

func normalizeCalendarIDs(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		id := strings.TrimSpace(value)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
