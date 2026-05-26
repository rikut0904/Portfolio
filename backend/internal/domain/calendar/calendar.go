package calendar

import "portfolio-backend/internal/infrastructure/gcalendar"

type EventsOutput struct {
	Timezone             string            `json:"timezone"`
	CalendarIDs          []string          `json:"calendarIds,omitempty"`
	CalendarColors       map[string]string `json:"calendarColors"`
	CalendarLabels       map[string]string `json:"calendarLabels"`
	CalendarDisplayNames map[string]string `json:"calendarDisplayNames"`
	From                 string            `json:"from"`
	To                   string            `json:"to"`
	Events               []gcalendar.Event `json:"events"`
}

type Preferences struct {
	CalendarIds         []string          `json:"calendarIds"`
	CalendarColors      map[string]string `json:"calendarColors"`
	CalendarLabels      map[string]string `json:"calendarLabels"`
	CalendarDisplayName map[string]string `json:"calendarDisplayNames"`
}

type CalendarPublicationPayload struct {
	CalendarID        string `json:"calendarId"`
	EventID           string `json:"eventId"`
	IsPublished       bool   `json:"isPublished"`
	PublicDescription string `json:"publicDescription"`
}

type CalendarPreferencesPayload struct {
	Colors map[string]string `json:"colors"`
	Labels map[string]string `json:"labels"`
}
