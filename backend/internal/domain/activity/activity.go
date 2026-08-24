package activity

type Activity struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Link        string `json:"link"`
	Image       string `json:"image"`
	Status      string `json:"status"`
	Order       int    `json:"order"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
	CreatedYear int    `json:"createdYear"`
	CreatedMon  int    `json:"createdMonth"`
}
type Category struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	CreatedAt string `json:"createdAt"`
}
type ActivityPayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Link        string `json:"link"`
	Image       string `json:"image"`
	Status      string `json:"status"`
	Order       int    `json:"order"`
}
type ActivityCategoryPayload struct {
	Name  string `json:"name"`
	Order *int   `json:"order"`
}
