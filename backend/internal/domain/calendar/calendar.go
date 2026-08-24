package calendar

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

type EventsOutput struct {
	Timezone             string            `json:"timezone"`
	CalendarIDs          []string          `json:"calendarIds,omitempty"`
	CalendarColors       map[string]string `json:"calendarColors"`
	CalendarLabels       map[string]string `json:"calendarLabels"`
	CalendarDisplayNames map[string]string `json:"calendarDisplayNames"`
	From                 string            `json:"from"`
	To                   string            `json:"to"`
	Events               []Event           `json:"events"`
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
