package product

type Product struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Link        string   `json:"link"`
	GithubURL   string   `json:"githubUrl"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Status      string   `json:"status"`
	Deploy      string   `json:"deployStatus"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

type Payload struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Image       string   `json:"image"`
	Link        string   `json:"link"`
	GithubURL   string   `json:"githubUrl"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Status      string   `json:"status"`
	Deploy      string   `json:"deployStatus"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
}
