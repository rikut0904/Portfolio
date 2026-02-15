package api

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/mail"
	"portfolio-backend/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	store             *store.Store
	verifier          *auth.Verifier
	mailer            *mail.Client
	firebaseWebAPIKey string
	mailTo            []string
	appMode           bool
	githubToken       string
	githubOwner       string
	githubRepo        string
	githubBranch      string
}

func NewHandler(
	store *store.Store,
	verifier *auth.Verifier,
	mailer *mail.Client,
	firebaseWebAPIKey string,
	mailTo []string,
	appMode bool,
	githubToken string,
	githubOwner string,
	githubRepo string,
	githubBranch string,
) *Handler {
	return &Handler{
		store:             store,
		verifier:          verifier,
		mailer:            mailer,
		firebaseWebAPIKey: strings.TrimSpace(firebaseWebAPIKey),
		mailTo:            mailTo,
		appMode:           appMode,
		githubToken:       strings.TrimSpace(githubToken),
		githubOwner:       strings.TrimSpace(githubOwner),
		githubRepo:        strings.TrimSpace(githubRepo),
		githubBranch:      strings.TrimSpace(githubBranch),
	}
}

func (h *Handler) Register(r chi.Router) {
	r.Get("/health", h.handleHealth)

	r.Route("/api", func(r chi.Router) {
		r.Get("/app-mode", h.getAppMode)
		r.Post("/auth/login", h.login)
		r.Post("/auth/refresh", h.refreshToken)
		r.Get("/auth/me", h.withAdmin(h.me))

		r.Get("/products", h.getProducts)
		r.Post("/products", h.withAdmin(h.createProduct))
		r.Put("/products/{id}", h.withAdmin(h.updateProduct))
		r.Delete("/products/{id}", h.withAdmin(h.deleteProduct))

		r.Get("/sections", h.getSections)
		r.Post("/sections", h.withAdmin(h.createSection))
		r.Put("/sections/{id}", h.withAdmin(h.updateSection))
		r.Patch("/sections/{id}/meta", h.withAdmin(h.patchSectionMeta))
		r.Delete("/sections/{id}/delete", h.withAdmin(h.deleteSection))

		r.Get("/activities", h.getActivities)
		r.Post("/activities", h.withAdmin(h.createActivity))
		r.Get("/activities/{id}", h.getActivity)
		r.Put("/activities/{id}", h.withAdmin(h.updateActivity))
		r.Patch("/activities/{id}", h.withAdmin(h.patchActivity))
		r.Delete("/activities/{id}", h.withAdmin(h.deleteActivity))

		r.Get("/activity-categories", h.getActivityCategories)
		r.Post("/activity-categories", h.withAdmin(h.createActivityCategory))
		r.Patch("/activity-categories/{id}", h.withAdmin(h.patchActivityCategory))
		r.Delete("/activity-categories/{id}", h.withAdmin(h.deleteActivityCategory))

		r.Get("/technologies", h.getTechnologies)
		r.Post("/technologies", h.withAdmin(h.createTechnology))
		r.Put("/technologies/{id}", h.withAdmin(h.updateTechnology))
		r.Delete("/technologies/{id}", h.withAdmin(h.deleteTechnology))
		r.Post("/images/upload", h.withAdmin(h.uploadImage))

		r.Post("/inquiries", h.createInquiry)
		r.Get("/inquiries", h.withAdmin(h.getInquiries))
		r.Get("/inquiries/{id}", h.withAdmin(h.getInquiry))
		r.Patch("/inquiries/{id}", h.withAdmin(h.patchInquiryStatus))
		r.Post("/inquiries/{id}/reply", h.withAdmin(h.replyInquiry))

		r.Post("/admin-logs", h.withAdmin(h.createAuthLog))
		r.Get("/admin-logs", h.withAdmin(h.getAdminLogs))
	})
}

func (h *Handler) getAppMode(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"appMode": h.appMode,
	})
}

// auth endpoints

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	email := strings.TrimSpace(body.Email)
	password := strings.TrimSpace(body.Password)
	if email == "" || password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "email and password are required"})
		return
	}

	if h.firebaseWebAPIKey == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
		return
	}

	respBody, status, err := postJSON(
		r.Context(),
		fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		map[string]any{
			"email":             email,
			"password":          password,
			"returnSecureToken": true,
		},
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to login"})
		return
	}
	if status >= 400 {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
		return
	}

	idToken, _ := respBody["idToken"].(string)
	refreshToken, _ := respBody["refreshToken"].(string)
	expiresIn, _ := respBody["expiresIn"].(string)
	if idToken == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Invalid email or password"})
		return
	}
	claims, err := h.verifier.VerifyToken(r.Context(), idToken)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"error": "Unauthorized"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *Handler) refreshToken(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	token := strings.TrimSpace(body.RefreshToken)
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "refreshToken is required"})
		return
	}

	if h.firebaseWebAPIKey == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "FIREBASE_WEB_API_KEY is not configured"})
		return
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", token)
	respBody, status, err := postForm(
		r.Context(),
		fmt.Sprintf("https://securetoken.googleapis.com/v1/token?key=%s", url.QueryEscape(h.firebaseWebAPIKey)),
		form.Encode(),
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to refresh token"})
		return
	}
	if status >= 400 {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
		return
	}
	idToken, _ := respBody["id_token"].(string)
	refreshToken, _ := respBody["refresh_token"].(string)
	expiresIn, _ := respBody["expires_in"].(string)
	if idToken == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "Failed to refresh token"})
		return
	}
	claims, err := h.verifier.VerifyToken(r.Context(), idToken)
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"error": "Unauthorized"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"idToken":      idToken,
		"refreshToken": refreshToken,
		"expiresIn":    expiresIn,
		"user": map[string]any{
			"uid":   claims.UID,
			"email": claims.Email,
		},
	})
}

func (h *Handler) me(w http.ResponseWriter, _ *http.Request, user *auth.Claims) {
	writeJSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"uid":   user.UID,
			"email": user.Email,
		},
	})
}

func (h *Handler) withAdmin(next func(http.ResponseWriter, *http.Request, *auth.Claims)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := h.verifier.VerifyRequest(r)
		if err != nil {
			status := http.StatusUnauthorized
			if strings.Contains(strings.ToLower(err.Error()), "forbidden") {
				status = http.StatusForbidden
			}
			writeJSON(w, status, map[string]any{"error": http.StatusText(status)})
			return
		}
		next(w, r, claims)
	}
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := h.store.Pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"ok": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func decodeBody(r *http.Request, dst any) error {
	defer r.Body.Close()
	b, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		return err
	}
	if len(strings.TrimSpace(string(b))) == 0 {
		return errors.New("empty body")
	}
	return json.Unmarshal(b, dst)
}

func postJSON(ctx context.Context, endpoint string, body any) (map[string]any, int, error) {
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(payload)))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, res.StatusCode, err
	}
	out := map[string]any{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &out)
	}
	return out, res.StatusCode, nil
}

func postForm(ctx context.Context, endpoint string, body string) (map[string]any, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{Timeout: 12 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, res.StatusCode, err
	}
	out := map[string]any{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &out)
	}
	return out, res.StatusCode, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeCacheHeader(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30")
}

func toISO(t time.Time) string {
	return t.UTC().Format(time.RFC3339)
}

func (h *Handler) logAdmin(ctx context.Context, action, entity, entityID, level string, user *auth.Claims, details any) {
	if level == "" {
		level = "info"
	}
	if details == nil {
		details = map[string]any{}
	}
	_, _ = h.store.Pool.Exec(ctx, `
		INSERT INTO "adminLogs" (id, action, entity, "entityId", "userId", "userEmail", level, details, "createdAt")
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb, NOW())
	`, fmt.Sprintf("log_%d", time.Now().UnixNano()), action, nullable(entity), nullable(entityID), nullable(user.UID), nullable(user.Email), level, mustJSON(details))
	_, _ = h.store.Pool.Exec(ctx, `DELETE FROM "adminLogs" WHERE "createdAt" < NOW() - INTERVAL '2 months'`)
}

func nullable(v string) any {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{}`
	}
	if string(b) == "null" {
		return `{}`
	}
	return string(b)
}

// products

type product struct {
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

func nullToString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

type productPayload struct {
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

func (h *Handler) getProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			p.id,
			p.title,
			p.description,
			p.image,
			p.link,
			COALESCE(to_jsonb(p)->>'githubUrl', to_jsonb(p)->>'github_url', to_jsonb(p)->>'githuburl', '') AS github_url,
			p.category,
			COALESCE(to_jsonb(p)->'technologies', '[]'::jsonb) AS technologies,
			p.status,
			COALESCE(to_jsonb(p)->>'deployStatus', to_jsonb(p)->>'deploy_status', to_jsonb(p)->>'deploystatus', '') AS deploy_status,
			COALESCE(NULLIF(COALESCE(to_jsonb(p)->>'createdYear', to_jsonb(p)->>'created_year', to_jsonb(p)->>'createdyear', ''), '')::bigint, 0) AS created_year,
			COALESCE(NULLIF(COALESCE(to_jsonb(p)->>'createdMonth', to_jsonb(p)->>'created_month', to_jsonb(p)->>'createdmonth', ''), '')::bigint, 0) AS created_month,
			COALESCE(to_jsonb(p)->>'createdAt', to_jsonb(p)->>'created_at', to_jsonb(p)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(p)->>'updatedAt', to_jsonb(p)->>'updated_at', to_jsonb(p)->>'updatedat', '') AS updated_at
		FROM "products" p
	`)
	if err != nil {
		log.Printf("getProducts query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch products"})
		return
	}
	defer rows.Close()

	products := make([]product, 0)
	for rows.Next() {
		var p product
		var techRaw []byte
		var description, image, link, githubURL, category, status, deploy sql.NullString
		var createdAt sql.NullString
		var updatedAt sql.NullString
		var createdYear sql.NullInt64
		var createdMonth sql.NullInt64
		if err := rows.Scan(&p.ID, &p.Title, &description, &image, &link, &githubURL, &category, &techRaw, &status, &deploy, &createdYear, &createdMonth, &createdAt, &updatedAt); err != nil {
			log.Printf("getProducts scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch products"})
			return
		}
		p.Description = nullToString(description)
		p.Image = nullToString(image)
		p.Link = nullToString(link)
		p.GithubURL = nullToString(githubURL)
		p.Category = nullToString(category)
		p.Status = normalizeVisibilityStatus(nullToString(status))
		p.Deploy = normalizeDeployStatus(nullToString(deploy))
		if createdAt.Valid {
			p.CreatedAt = createdAt.String
		}
		if updatedAt.Valid {
			p.UpdatedAt = updatedAt.String
		}
		if createdYear.Valid {
			p.CreatedYear = int(createdYear.Int64)
		}
		if createdMonth.Valid {
			p.CreatedMon = int(createdMonth.Int64)
		}
		p.Techs = parseStringArrayJSON(techRaw)
		products = append(products, p)
	}

	q := r.URL.Query()
	category := strings.TrimSpace(q.Get("category"))
	status := strings.TrimSpace(q.Get("status"))
	deployStatus := strings.TrimSpace(q.Get("deployStatus"))
	createdYear := parseIntDefault(q.Get("createdYear"), 0)
	createdMonth := parseIntDefault(q.Get("createdMonth"), 0)
	techFilter := splitCSV(q.Get("technologies"))

	filtered := make([]product, 0, len(products))
	for _, p := range products {
		if category != "" && p.Category != category {
			continue
		}
		if status != "" && p.Status != status {
			continue
		}
		if deployStatus != "" && p.Deploy != deployStatus {
			continue
		}
		if createdYear > 0 && p.CreatedYear != createdYear {
			continue
		}
		if createdMonth > 0 && p.CreatedMon != createdMonth {
			continue
		}
		if len(techFilter) > 0 && !hasAny(p.Techs, techFilter) {
			continue
		}
		filtered = append(filtered, p)
	}

	sortBy := q.Get("sortBy")
	if sortBy == "" {
		sortBy = "createdYear-asc"
	}
	sort.Slice(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		switch sortBy {
		case "createdYear-asc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon < b.CreatedMon
			}
			return a.CreatedYear < b.CreatedYear
		case "createdYear-desc":
			if a.CreatedYear == b.CreatedYear {
				return a.CreatedMon > b.CreatedMon
			}
			return a.CreatedYear > b.CreatedYear
		case "title-asc":
			return a.Title < b.Title
		case "title-desc":
			return a.Title > b.Title
		case "createdAt-asc":
			return a.CreatedAt < b.CreatedAt
		case "createdAt-desc":
			return a.CreatedAt > b.CreatedAt
		default:
			return false
		}
	})

	page := parseIntDefault(q.Get("page"), 1)
	limit := parseIntDefault(q.Get("limit"), 100)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 100
	}
	total := len(filtered)
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"products": filtered[start:end],
		"pagination": map[string]any{
			"page":  page,
			"limit": limit,
			"total": total,
			"totalPages": func() int {
				if total == 0 {
					return 0
				}
				return (total + limit - 1) / limit
			}(),
			"hasMore": end < total,
		},
	})
}

func (h *Handler) createProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	now := time.Now().UTC()
	if body.CreatedYear == 0 {
		body.CreatedYear = now.Year()
	}
	if body.CreatedMon == 0 {
		body.CreatedMon = int(now.Month())
	}
	if body.Status == "" {
		body.Status = "公開"
	}
	if body.Deploy == "" {
		body.Deploy = "未公開"
	}

	var id string
	nowISO := toISO(now)
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "products" (id, title, description, image, link, "githubUrl", category, technologies, status, "deployStatus", "createdYear", "createdMonth", "createdAt", "updatedAt")
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,NOW()) RETURNING id
	`, fmt.Sprintf("product_%d", now.UnixNano()), body.Title, body.Description, body.Image, body.Link, body.GithubURL, body.Category, mustJSON(body.Techs), body.Status, body.Deploy, body.CreatedYear, body.CreatedMon, nowISO).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create product"})
		return
	}

	h.logAdmin(r.Context(), "create", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusCreated, map[string]any{"product": map[string]any{"id": id, "title": body.Title, "description": body.Description, "image": body.Image, "link": body.Link, "githubUrl": body.GithubURL}})
}

func (h *Handler) updateProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	var body productPayload
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and description are required"})
		return
	}
	now := time.Now().UTC()
	if body.CreatedYear == 0 {
		body.CreatedYear = now.Year()
	}
	if body.CreatedMon == 0 {
		body.CreatedMon = int(now.Month())
	}
	if body.Status == "" {
		body.Status = "公開"
	}
	if body.Deploy == "" {
		body.Deploy = "未公開"
	}
	cmd, err := h.store.Pool.Exec(r.Context(), `
		UPDATE "products" SET title=$1, description=$2, image=$3, link=$4, "githubUrl"=$5, category=$6,
		technologies=$7::jsonb, status=$8, "deployStatus"=$9, "createdYear"=$10, "createdMonth"=$11, "updatedAt"=NOW()
		WHERE id=$12
	`, body.Title, body.Description, body.Image, body.Link, body.GithubURL, body.Category, mustJSON(body.Techs), body.Status, body.Deploy, body.CreatedYear, body.CreatedMon, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update product"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "product", id, "info", user, map[string]any{"title": body.Title, "status": body.Status, "deployStatus": body.Deploy})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteProduct(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "products" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete product"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "product", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// sections

type sectionMeta struct {
	DisplayName string `json:"displayName"`
	Type        string `json:"type"`
	Order       int    `json:"order"`
	Editable    bool   `json:"editable"`
	SortOrder   string `json:"sortOrder,omitempty"`
}

type section struct {
	ID   string          `json:"id"`
	Meta sectionMeta     `json:"meta"`
	Data json.RawMessage `json:"data"`
}

func isZeroJSON(raw []byte) bool {
	trimmed := strings.TrimSpace(string(raw))
	return trimmed == "" || trimmed == "null" || trimmed == "{}"
}

func isEmptyJSONArray(raw []byte) bool {
	return strings.TrimSpace(string(raw)) == "[]"
}

func normalizeVisibilityStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "public", "published", "open", "active", "visible", "公開":
		return "公開"
	case "private", "draft", "hidden", "inactive", "非公開":
		return "非公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeDeployStatus(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "", "deployed", "live", "production", "公開中":
		return "公開中"
	case "undeployed", "not_deployed", "draft", "staging", "未公開":
		return "未公開"
	default:
		return strings.TrimSpace(v)
	}
}

func normalizeSectionType(v string) string {
	s := strings.ToLower(strings.TrimSpace(v))
	switch s {
	case "single", "profile":
		return "single"
	case "categorized", "category":
		return "categorized"
	case "list":
		return "list"
	case "history", "timeline":
		return "history"
	default:
		if s == "" {
			return "list"
		}
		return strings.TrimSpace(v)
	}
}

func buildSectionData(rawData, rawItems, rawHistories []byte, sectionType string, name, hometown, hobbies, profileImage, university string) []byte {
	sectionType = strings.ToLower(strings.TrimSpace(sectionType))
	var rawObj map[string]any
	if !isZeroJSON(rawData) {
		_ = json.Unmarshal(rawData, &rawObj)
	}
	if rawObj == nil {
		rawObj = map[string]any{}
	}

	profile := map[string]string{
		"name":         strings.TrimSpace(name),
		"hometown":     strings.TrimSpace(hometown),
		"hobbies":      strings.TrimSpace(hobbies),
		"profileImage": strings.TrimSpace(profileImage),
		"university":   strings.TrimSpace(university),
	}

	switch sectionType {
	case "single", "profile":
		if len(rawObj) > 0 {
			return rawData
		}
		if profile["name"] != "" || profile["hometown"] != "" || profile["hobbies"] != "" || profile["profileImage"] != "" || profile["university"] != "" {
			b, _ := json.Marshal(map[string]any{"data": profile})
			return b
		}
	case "history", "timeline":
		if v, ok := rawObj["histories"]; ok && v != nil {
			return rawData
		}
		if v, ok := rawObj["items"]; ok && v != nil {
			return rawData
		}
		if !isZeroJSON(rawHistories) && !isEmptyJSONArray(rawHistories) {
			b, _ := json.Marshal(map[string]any{"histories": json.RawMessage(rawHistories)})
			return b
		}
		if !isZeroJSON(rawItems) && !isEmptyJSONArray(rawItems) {
			b, _ := json.Marshal(map[string]any{"histories": json.RawMessage(rawItems)})
			return b
		}
		if len(rawObj) > 0 {
			return rawData
		}
	case "list":
		if v, ok := rawObj["lists"]; ok && v != nil {
			return rawData
		}
		if v, ok := rawObj["items"]; ok && v != nil {
			return rawData
		}
		if !isZeroJSON(rawItems) {
			b, _ := json.Marshal(map[string]any{"lists": json.RawMessage(rawItems)})
			return b
		}
		if len(rawObj) > 0 {
			return rawData
		}
	default:
		if len(rawObj) > 0 {
			return rawData
		}
		if !isZeroJSON(rawHistories) || !isZeroJSON(rawItems) {
			payload := map[string]any{}
			if !isZeroJSON(rawHistories) {
				payload["histories"] = json.RawMessage(rawHistories)
			}
			if !isZeroJSON(rawItems) {
				payload["items"] = json.RawMessage(rawItems)
			}
			if len(payload) > 0 {
				b, _ := json.Marshal(payload)
				return b
			}
		}
	}

	return []byte(`{}`)
}

func (h *Handler) getSections(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			sm.id,
			COALESCE(to_jsonb(sm)->>'displayName', to_jsonb(sm)->>'display_name', '') AS display_name,
			COALESCE(NULLIF(to_jsonb(sm)->>'type_name', ''), NULLIF(to_jsonb(sm)->>'type', ''), NULLIF(to_jsonb(s)->>'type_name', ''), NULLIF(to_jsonb(s)->>'type', ''), 'list') AS section_type,
			COALESCE(NULLIF(to_jsonb(sm)->>'order', '')::int, 0),
			COALESCE(NULLIF(to_jsonb(sm)->>'editable', '')::boolean, true),
			'' as sort_order,
			COALESCE(to_jsonb(s)->'data', '{}'::jsonb),
			COALESCE(to_jsonb(s)->>'data_name', to_jsonb(s)->>'name', ''),
			COALESCE(to_jsonb(s)->>'data_hometown', to_jsonb(s)->>'hometown', ''),
			COALESCE(to_jsonb(s)->>'data_hobbies', to_jsonb(s)->>'hobbies', ''),
			COALESCE(to_jsonb(s)->>'data_profileImage', to_jsonb(s)->>'data_profile_image', to_jsonb(s)->>'profileImage', to_jsonb(s)->>'profile_image', ''),
			COALESCE(to_jsonb(s)->>'data_university', to_jsonb(s)->>'university', ''),
			COALESCE(to_jsonb(s)->'items', '[]'::jsonb),
			COALESCE(to_jsonb(s)->'histories', '[]'::jsonb)
		FROM "sectionMeta" sm
		LEFT JOIN "sections" s ON (
			s.id = sm.id
			OR s.id = COALESCE(NULLIF(to_jsonb(sm)->>'section_id', ''), NULLIF(to_jsonb(sm)->>'sectionId', ''), NULLIF(to_jsonb(sm)->>'sectionid', ''))
		)
		ORDER BY COALESCE(NULLIF(to_jsonb(sm)->>'order', '')::int, 0) ASC
	`)
	if err != nil {
		log.Printf("getSections query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
		return
	}
	defer rows.Close()

	sections := make([]section, 0)
	for rows.Next() {
		var s section
		var rawData, rawItems, rawHistories []byte
		var dataName, dataHometown, dataHobbies, dataProfileImage, dataUniversity string
		if err := rows.Scan(
			&s.ID,
			&s.Meta.DisplayName,
			&s.Meta.Type,
			&s.Meta.Order,
			&s.Meta.Editable,
			&s.Meta.SortOrder,
			&rawData,
			&dataName,
			&dataHometown,
			&dataHobbies,
			&dataProfileImage,
			&dataUniversity,
			&rawItems,
			&rawHistories,
		); err != nil {
			log.Printf("getSections scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch sections"})
			return
		}
		s.Meta.Type = normalizeSectionType(s.Meta.Type)
		s.Data = json.RawMessage(buildSectionData(rawData, rawItems, rawHistories, s.Meta.Type, dataName, dataHometown, dataHobbies, dataProfileImage, dataUniversity))
		sections = append(sections, s)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"sections": sections})
}

func (h *Handler) createSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		ID          string          `json:"id"`
		DisplayName string          `json:"displayName"`
		Type        string          `json:"type"`
		Order       *int            `json:"order"`
		SortOrder   string          `json:"sortOrder"`
		Data        json.RawMessage `json:"data"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if body.ID == "" || body.DisplayName == "" || body.Type == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "id, displayName, and type are required"})
		return
	}
	if len(body.Data) == 0 {
		body.Data = json.RawMessage(`{}`)
	}

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	defer tx.Rollback(r.Context())

	var exists bool
	if err := tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM "sectionMeta" WHERE id=$1)`, body.ID).Scan(&exists); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	if exists {
		writeJSON(w, http.StatusConflict, map[string]any{"error": "Section with this ID already exists"})
		return
	}

	orderNo := 0
	if body.Order != nil {
		orderNo = *body.Order
	} else {
		_ = tx.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "sectionMeta"`).Scan(&orderNo)
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO "sectionMeta" (id, section_id, "displayName", type_name, "order", editable)
		VALUES ($1,$1,$2,$3,$4,true)
	`, body.ID, body.DisplayName, body.Type, orderNo)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}

	_, err = tx.Exec(r.Context(), `INSERT INTO "sections" (id, type_name, data) VALUES ($1, $2, $3::jsonb)`, body.ID, body.Type, string(body.Data))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create section"})
		return
	}

	h.logAdmin(r.Context(), "create", "section", body.ID, "info", user, map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": orderNo})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Section created successfully", "section": map[string]any{"id": body.ID, "meta": map[string]any{"displayName": body.DisplayName, "type": body.Type, "order": orderNo, "editable": true, "sortOrder": body.SortOrder}, "data": json.RawMessage(body.Data)}})
}

func (h *Handler) updateSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	b, _ := json.Marshal(patch)
	cmd, err := h.store.Pool.Exec(r.Context(), `
		UPDATE "sections" SET data = COALESCE(data,'{}'::jsonb) || $2::jsonb WHERE id=$1
	`, id, string(b))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "section", id, "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) patchSectionMeta(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	setClauses := make([]string, 0)
	args := make([]any, 0)
	idx := 1
	for k, v := range patch {
		sqlCol := ""
		switch k {
		case "displayName":
			sqlCol = `"displayName"`
		case "type":
			sqlCol = "type_name"
		case "order":
			sqlCol = `"order"`
		case "editable":
			sqlCol = "editable"
		case "sortOrder":
			sqlCol = ""
		}
		if sqlCol == "" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s=$%d", sqlCol, idx))
		args = append(args, v)
		idx++
	}
	if len(setClauses) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
		return
	}
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE "sectionMeta" SET %s WHERE id=$%d`, strings.Join(setClauses, ","), idx)
	cmd, err := h.store.Pool.Exec(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update section meta"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "sectionMeta", id, "info", user, map[string]any{"updates": patch})
	writeJSON(w, http.StatusOK, map[string]any{"message": "Meta updated successfully"})
}

func (h *Handler) deleteSection(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	defer tx.Rollback(r.Context())
	_, _ = tx.Exec(r.Context(), `DELETE FROM "sections" WHERE id=$1`, id)
	cmd, err := tx.Exec(r.Context(), `DELETE FROM "sectionMeta" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete section"})
		return
	}
	h.logAdmin(r.Context(), "delete", "section", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Section deleted successfully"})
}

// activities and categories

type activity struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Techs       []string `json:"technologies"`
	Link        string   `json:"link"`
	Image       string   `json:"image"`
	Status      string   `json:"status"`
	CreatedYear int      `json:"createdYear"`
	CreatedMon  int      `json:"createdMonth"`
	Order       int      `json:"order"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

func (h *Handler) getActivities(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			a.id,
			a.title,
			a.description,
			a.category,
			a.link,
			a.image,
			a.status,
			COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(a)->>'created_at', to_jsonb(a)->>'createdAt', to_jsonb(a)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(a)->>'updated_at', to_jsonb(a)->>'updatedAt', to_jsonb(a)->>'updatedat', '') AS updated_at
		FROM "activities" a
		ORDER BY COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activities"})
		return
	}
	defer rows.Close()
	list := make([]activity, 0)
	for rows.Next() {
		var a activity
		var description, category, link, image, status sql.NullString
		var ct, ut sql.NullString
		if err := rows.Scan(&a.ID, &a.Title, &description, &category, &link, &image, &status, &a.Order, &ct, &ut); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activities"})
			return
		}
		a.Description = nullToString(description)
		a.Category = nullToString(category)
		a.Link = nullToString(link)
		a.Image = nullToString(image)
		if ct.Valid {
			a.CreatedAt = ct.String
		}
		if ut.Valid {
			a.UpdatedAt = ut.String
		}
		parsedCreatedAt, err := time.Parse(time.RFC3339, a.CreatedAt)
		if err == nil {
			a.CreatedYear = parsedCreatedAt.Year()
			a.CreatedMon = int(parsedCreatedAt.Month())
		}
		a.Status = normalizeVisibilityStatus(nullToString(status))
		a.Techs = []string{}
		list = append(list, a)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"activities": list})
}

func (h *Handler) getActivity(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var a activity
	var description, category, link, image, status sql.NullString
	var ct, ut sql.NullString
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT
			a.id,
			a.title,
			a.description,
			a.category,
			a.link,
			a.image,
			a.status,
			COALESCE(NULLIF(to_jsonb(a)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(a)->>'created_at', to_jsonb(a)->>'createdAt', to_jsonb(a)->>'createdat', '') AS created_at,
			COALESCE(to_jsonb(a)->>'updated_at', to_jsonb(a)->>'updatedAt', to_jsonb(a)->>'updatedat', '') AS updated_at
		FROM "activities" a
		WHERE a.id=$1
	`, id).Scan(&a.ID, &a.Title, &description, &category, &link, &image, &status, &a.Order, &ct, &ut)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch activity"})
		return
	}
	a.Description = nullToString(description)
	a.Category = nullToString(category)
	a.Link = nullToString(link)
	a.Image = nullToString(image)
	if ct.Valid {
		a.CreatedAt = ct.String
	}
	if ut.Valid {
		a.UpdatedAt = ut.String
	}
	parsedCreatedAt, err := time.Parse(time.RFC3339, a.CreatedAt)
	if err == nil {
		a.CreatedYear = parsedCreatedAt.Year()
		a.CreatedMon = int(parsedCreatedAt.Month())
	}
	a.Status = normalizeVisibilityStatus(nullToString(status))
	a.Techs = []string{}
	writeJSON(w, http.StatusOK, map[string]any{"activity": a})
}

func (h *Handler) createActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body activity
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Category) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Title and category are required"})
		return
	}
	now := time.Now().UTC()
	if body.Order == 0 {
		_ = h.store.Pool.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "activities"`).Scan(&body.Order)
	}
	if body.Status == "" {
		body.Status = "非公開"
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "activities" (id, title, description, category, link, image, status, "order", created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING id
	`, fmt.Sprintf("activity_%d", now.UnixNano()), body.Title, body.Description, body.Category, body.Link, body.Image, body.Status, body.Order).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create activity"})
		return
	}
	h.logAdmin(r.Context(), "create", "activity", id, "info", user, map[string]any{"title": body.Title, "category": body.Category, "status": body.Status})
	body.ID = id
	body.CreatedAt = toISO(now)
	body.UpdatedAt = toISO(now)
	body.CreatedYear = now.Year()
	body.CreatedMon = int(now.Month())
	body.Techs = []string{}
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Activity created successfully", "activity": body})
}

func (h *Handler) updateActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	h.upsertActivityByID(w, r, user, false)
}

func (h *Handler) patchActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	h.upsertActivityByID(w, r, user, true)
}

func (h *Handler) upsertActivityByID(w http.ResponseWriter, r *http.Request, user *auth.Claims, partial bool) {
	id := chi.URLParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if len(patch) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return
	}
	if !partial {
		if _, ok := patch["title"]; !ok {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "title is required"})
			return
		}
	}

	mapping := map[string]string{
		"title":       "title",
		"description": "description",
		"category":    "category",
		"link":        "link",
		"image":       "image",
		"status":      "status",
		"order":       `"order"`,
	}
	clauses := make([]string, 0)
	args := make([]any, 0)
	idx := 1
	for k, v := range patch {
		col, ok := mapping[k]
		if !ok {
			continue
		}
		clauses = append(clauses, fmt.Sprintf("%s=$%d", col, idx))
		args = append(args, v)
		idx++
	}
	clauses = append(clauses, "updated_at=NOW()")
	if len(clauses) == 1 {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
		return
	}
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE "activities" SET %s WHERE id=$%d`, strings.Join(clauses, ","), idx)
	cmd, err := h.store.Pool.Exec(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update activity"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "activity", id, "info", user, func() any {
		if partial {
			return map[string]any{"updates": patch}
		}
		return map[string]any{}
	}())
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity updated successfully"})
}

func (h *Handler) deleteActivity(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "activities" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete activity"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Activity not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "activity", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Activity deleted successfully"})
}

type activityCategory struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Order     int    `json:"order"`
	CreatedAt string `json:"createdAt"`
}

func (h *Handler) resolveActivityCategoryTable(ctx context.Context) (string, error) {
	var tableName string
	err := h.store.Pool.QueryRow(ctx, `
		SELECT CASE
			WHEN to_regclass('public."activityCategories"') IS NOT NULL THEN '"activityCategories"'
			WHEN to_regclass('public.activity_categories') IS NOT NULL THEN 'activity_categories'
			WHEN to_regclass('public.activitycategories') IS NOT NULL THEN 'activitycategories'
			ELSE ''
		END
	`).Scan(&tableName)
	if err != nil {
		return "", err
	}
	if tableName == "" {
		return "", errors.New("activity categories table not found")
	}
	return tableName, nil
}

func (h *Handler) getActivityCategories(w http.ResponseWriter, r *http.Request) {
	tableName, err := h.resolveActivityCategoryTable(r.Context())
	if err != nil {
		log.Printf("getActivityCategories resolve table error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
	}

	rows, err := h.store.Pool.Query(r.Context(), fmt.Sprintf(`
		SELECT
			ac.id,
			ac.name,
			COALESCE(NULLIF(to_jsonb(ac)->>'order', '')::int, 0) AS order_no,
			COALESCE(to_jsonb(ac)->>'createdAt', to_jsonb(ac)->>'created_at', to_jsonb(ac)->>'createdat', '') AS created_at
		FROM %s ac
		ORDER BY COALESCE(NULLIF(to_jsonb(ac)->>'order', '')::int, 0) ASC
	`, tableName))
	if err != nil {
		log.Printf("getActivityCategories query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
		return
	}
	defer rows.Close()
	list := make([]activityCategory, 0)
	for rows.Next() {
		var c activityCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Order, &c.CreatedAt); err != nil {
			log.Printf("getActivityCategories scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch categories"})
			return
		}
		list = append(list, c)
	}
	writeCacheHeader(w)
	writeJSON(w, http.StatusOK, map[string]any{"categories": list})
}

func (h *Handler) createActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		Name  string `json:"name"`
		Order *int   `json:"order"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Category name is required"})
		return
	}
	orderNo := 0
	if body.Order != nil {
		orderNo = *body.Order
	} else {
		_ = h.store.Pool.QueryRow(r.Context(), `SELECT COALESCE(MAX("order"),0)+1 FROM "activityCategories"`).Scan(&orderNo)
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO "activityCategories" (id, name, "order", created_at) VALUES ($1,$2,$3,NOW()) RETURNING id
	`, fmt.Sprintf("activity_category_%d", time.Now().UnixNano()), body.Name, orderNo).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create category"})
		return
	}
	h.logAdmin(r.Context(), "create", "activityCategory", id, "info", user, map[string]any{"name": body.Name, "order": orderNo})
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Category created successfully", "category": map[string]any{"id": id, "name": body.Name, "order": orderNo, "createdAt": toISO(time.Now())}})
}

func (h *Handler) deleteActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	defer tx.Rollback(r.Context())
	var name string
	if err := tx.QueryRow(r.Context(), `SELECT name FROM "activityCategories" WHERE id=$1`, id).Scan(&name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	_, err = tx.Exec(r.Context(), `DELETE FROM "activityCategories" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	_, err = tx.Exec(r.Context(), `DELETE FROM "activities" WHERE category=$1`, name)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete category"})
		return
	}
	h.logAdmin(r.Context(), "delete", "activityCategory", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities deleted successfully"})
}

func (h *Handler) patchActivityCategory(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	var patch map[string]any
	if err := decodeBody(r, &patch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}
	defer tx.Rollback(r.Context())

	var oldName string
	if err := tx.QueryRow(r.Context(), `SELECT name FROM "activityCategories" WHERE id=$1`, id).Scan(&oldName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Category not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}

	set := []string{}
	args := []any{}
	idx := 1
	for k, v := range patch {
		col := ""
		switch k {
		case "name":
			col = "name"
		case "order":
			col = `"order"`
		}
		if col == "" {
			continue
		}
		set = append(set, fmt.Sprintf("%s=$%d", col, idx))
		args = append(args, v)
		idx++
	}
	if len(set) > 0 {
		args = append(args, id)
		query := fmt.Sprintf(`UPDATE "activityCategories" SET %s WHERE id=$%d`, strings.Join(set, ","), idx)
		if _, err := tx.Exec(r.Context(), query, args...); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
			return
		}
	}

	if newNameAny, ok := patch["name"]; ok {
		if newName, ok := newNameAny.(string); ok && strings.TrimSpace(newName) != "" && newName != oldName {
			if _, err := tx.Exec(r.Context(), `UPDATE "activities" SET category=$1 WHERE category=$2`, newName, oldName); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
				return
			}
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update category"})
		return
	}
	h.logAdmin(r.Context(), "update", "activityCategory", id, "info", user, map[string]any{"updates": patch})
	if _, ok := patch["name"]; ok {
		writeJSON(w, http.StatusOK, map[string]any{"message": "Category and related activities updated successfully"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": "Category updated successfully"})
}

// technologies

func (h *Handler) getTechnologies(w http.ResponseWriter, r *http.Request) {
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT
			t.id,
			t.name,
			t.category,
			COALESCE(to_jsonb(t)->>'createdAt', to_jsonb(t)->>'created_at', to_jsonb(t)->>'createdat', '') AS created_at
		FROM "technologies" t
		ORDER BY t.name ASC
	`)
	if err != nil {
		log.Printf("getTechnologies query error: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch technologies"})
		return
	}
	defer rows.Close()
	list := make([]map[string]any, 0)
	for rows.Next() {
		var id, name, category sql.NullString
		var ct sql.NullString
		if err := rows.Scan(&id, &name, &category, &ct); err != nil {
			log.Printf("getTechnologies scan error: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch technologies"})
			return
		}
		createdAt := ""
		if ct.Valid {
			createdAt = ct.String
		}
		list = append(list, map[string]any{
			"id":        nullToString(id),
			"name":      nullToString(name),
			"category":  nullToString(category),
			"createdAt": createdAt,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"technologies": list})
}

func (h *Handler) createTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	var exists bool
	if err := h.store.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM technologies WHERE LOWER(name)=LOWER($1))`, name).Scan(&exists); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create technology"})
		return
	}
	if exists {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology already exists"})
		return
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `INSERT INTO "technologies" (id, name, category, "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW()) RETURNING id`, fmt.Sprintf("tech_%d", time.Now().UnixNano()), name, body.Category).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create technology"})
		return
	}
	h.logAdmin(r.Context(), "create", "technology", id, "info", user, map[string]any{"name": name, "category": body.Category})
	writeJSON(w, http.StatusCreated, map[string]any{"technology": map[string]any{"id": id, "name": name, "category": body.Category, "createdAt": toISO(time.Now())}})
}

func (h *Handler) updateTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology name is required"})
		return
	}
	var dup bool
	if err := h.store.Pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM "technologies" WHERE LOWER(name)=LOWER($1) AND id<>$2)`, name, id).Scan(&dup); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update technology"})
		return
	}
	if dup {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Technology with this name already exists"})
		return
	}
	cmd, err := h.store.Pool.Exec(r.Context(), `UPDATE "technologies" SET name=$1, category=$2, "updatedAt"=NOW() WHERE id=$3`, name, body.Category, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update technology"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "technology", id, "info", user, map[string]any{"name": name, "category": body.Category})
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *Handler) deleteTechnology(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	id := chi.URLParam(r, "id")
	cmd, err := h.store.Pool.Exec(r.Context(), `DELETE FROM "technologies" WHERE id=$1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to delete technology"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "delete", "technology", id, "warn", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// inquiries

func normalize(v any) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func (h *Handler) ensureInquiriesTable(w http.ResponseWriter, r *http.Request) bool {
	var exists bool
	err := h.store.Pool.QueryRow(r.Context(), `SELECT to_regclass('public.inquiries') IS NOT NULL`).Scan(&exists)
	if err != nil || !exists {
		writeJSON(w, http.StatusNotImplemented, map[string]any{
			"error": "inquiries table is not found. Please create public.inquiries first",
		})
		return false
	}
	return true
}

func (h *Handler) createInquiry(w http.ResponseWriter, r *http.Request) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	category := normalize(body["category"])
	subject := normalize(body["subject"])
	message := normalize(body["message"])
	contactName := normalize(body["contactName"])
	contactEmail := normalize(body["contactEmail"])
	if subject == "" || message == "" || contactEmail == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "subject, message, contactEmail are required"})
		return
	}
	var id string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO inquiries (category, subject, message, contact_name, contact_email, status, replies, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,'pending','[]'::jsonb,NOW(),NOW()) RETURNING id
	`, category, subject, message, contactName, contactEmail).Scan(&id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create inquiry"})
		return
	}
	if h.mailer != nil {
		subjectAdmin, bodyAdmin, tErr := mail.BuildInquiryNotification(mail.InquiryNotificationData{
			ID:           id,
			Category:     category,
			Subject:      subject,
			Message:      message,
			ContactName:  contactName,
			ContactEmail: contactEmail,
		})
		if tErr != nil {
			fmt.Printf("mail template error (inquiry->admin): %v\n", tErr)
		} else {
			if err := h.mailer.SendText(
				r.Context(),
				h.mailTo,
				subjectAdmin,
				bodyAdmin,
			); err != nil {
				fmt.Printf("SES notify error (inquiry->admin): %v\n", err)
			}
		}

		subjectAuto, bodyAuto, tErr := mail.BuildInquiryAutoReply(mail.InquiryAutoReplyData{
			Subject: subject,
		})
		if tErr != nil {
			fmt.Printf("mail template error (auto-reply): %v\n", tErr)
		} else {
			if err := h.mailer.SendText(
				r.Context(),
				[]string{contactEmail},
				subjectAuto,
				bodyAuto,
			); err != nil {
				fmt.Printf("SES notify error (auto-reply): %v\n", err)
			}
		}
	}

	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) getInquiries(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT id, category, subject, message, contact_name, contact_email, status, replies, created_at, updated_at
		FROM inquiries ORDER BY created_at DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiries"})
		return
	}
	defer rows.Close()
	inquiries := make([]map[string]any, 0)
	for rows.Next() {
		var id, category, subject, message, contactName, contactEmail, status string
		var replies []byte
		var ct, ut time.Time
		if err := rows.Scan(&id, &category, &subject, &message, &contactName, &contactEmail, &status, &replies, &ct, &ut); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiries"})
			return
		}
		inquiries = append(inquiries, map[string]any{"id": id, "category": category, "subject": subject, "message": message, "contactName": contactName, "contactEmail": contactEmail, "status": status, "replies": json.RawMessage(replies), "createdAt": toISO(ct), "updatedAt": toISO(ut)})
	}
	h.logAdmin(r.Context(), "read", "inquiries", "", "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"inquiries": inquiries})
}

func (h *Handler) getInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	var category, subject, message, contactName, contactEmail, status string
	var replies []byte
	var ct, ut time.Time
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT category, subject, message, contact_name, contact_email, status, replies, created_at, updated_at
		FROM inquiries WHERE id=$1
	`, id).Scan(&category, &subject, &message, &contactName, &contactEmail, &status, &replies, &ct, &ut)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiry"})
		return
	}
	h.logAdmin(r.Context(), "read", "inquiry", id, "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"inquiry": map[string]any{"id": id, "category": category, "subject": subject, "message": message, "contactName": contactName, "contactEmail": contactEmail, "status": status, "replies": json.RawMessage(replies), "createdAt": toISO(ct), "updatedAt": toISO(ut)}})
}

func (h *Handler) patchInquiryStatus(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	status := normalize(body["status"])
	if status != "pending" && status != "in_progress" && status != "resolved" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid status"})
		return
	}
	cmd, err := h.store.Pool.Exec(r.Context(), `UPDATE inquiries SET status=$1, updated_at=NOW() WHERE id=$2`, status, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update inquiry"})
		return
	}
	if cmd.RowsAffected() == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
		return
	}
	h.logAdmin(r.Context(), "update", "inquiry", id, "info", user, map[string]any{"status": status})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) replyInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	message := normalize(body["message"])
	if message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "message is required"})
		return
	}
	reply := map[string]any{
		"id":         fmt.Sprintf("%d", time.Now().UnixNano()),
		"message":    message,
		"senderType": "admin",
		"senderName": func() string {
			if strings.TrimSpace(user.Email) != "" {
				return user.Email
			}
			return "admin"
		}(),
		"createdAt": toISO(time.Now()),
	}

	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	defer tx.Rollback(r.Context())

	var currentStatus string
	var contactEmail string
	err = tx.QueryRow(r.Context(), `SELECT status, contact_email FROM inquiries WHERE id=$1 FOR UPDATE`, id).Scan(&currentStatus, &contactEmail)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	nextStatus := currentStatus
	if currentStatus == "pending" {
		nextStatus = "in_progress"
	}
	_, err = tx.Exec(r.Context(), `
		UPDATE inquiries
		SET replies = COALESCE(replies, '[]'::jsonb) || $1::jsonb,
		status = $2,
		updated_at = NOW()
		WHERE id=$3
	`, mustJSON([]map[string]any{reply}), nextStatus, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	if h.mailer != nil {
		subjectReply, bodyReply, tErr := mail.BuildInquiryReply(mail.InquiryReplyData{
			Message: message,
		})
		if tErr != nil {
			fmt.Printf("mail template error (reply): %v\n", tErr)
		} else {
			if err := h.mailer.SendText(
				r.Context(),
				[]string{contactEmail},
				subjectReply,
				bodyReply,
			); err != nil {
				fmt.Printf("SES notify error (reply): %v\n", err)
			}
		}
	}

	h.logAdmin(r.Context(), "reply", "inquiry", id, "info", user, map[string]any{"messageLength": len(message)})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// admin logs

func (h *Handler) createAuthLog(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	action := normalize(body["action"])
	if action != "login" && action != "logout" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid action"})
		return
	}
	h.logAdmin(r.Context(), action, "auth", "", "info", user, map[string]any{"userAgent": r.Header.Get("User-Agent")})
	writeJSON(w, http.StatusCreated, map[string]any{"success": true})
}

type cursor struct {
	CreatedAt string `json:"createdAt"`
	ID        string `json:"id"`
}

func encodeCursor(c cursor) string {
	b, _ := json.Marshal(c)
	return base64.StdEncoding.EncodeToString(b)
}

func decodeCursor(v string) (cursor, bool) {
	b, err := base64.StdEncoding.DecodeString(v)
	if err != nil {
		return cursor{}, false
	}
	var c cursor
	if err := json.Unmarshal(b, &c); err != nil {
		return cursor{}, false
	}
	if c.CreatedAt == "" || c.ID == "" {
		return cursor{}, false
	}
	return c, true
}

func (h *Handler) getAdminLogs(w http.ResponseWriter, r *http.Request, _ *auth.Claims) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 10)
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	cursorParam := strings.TrimSpace(r.URL.Query().Get("cursor"))

	base := `
		SELECT id, action, COALESCE(entity,''), COALESCE("entityId",''), COALESCE("userId",''), COALESCE("userEmail",''), level,
		COALESCE(details,'{}'::jsonb), "createdAt"
		FROM "adminLogs"
	`
	args := []any{}
	where := ""
	if cursorParam != "" {
		if c, ok := decodeCursor(cursorParam); ok {
			where = ` WHERE ("createdAt", id) < ($1::timestamptz, $2::text) `
			args = append(args, c.CreatedAt, c.ID)
		}
	}
	query := base + where + fmt.Sprintf(` ORDER BY "createdAt" DESC, id DESC LIMIT %d`, limit)
	rows, err := h.store.Pool.Query(r.Context(), query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin logs"})
		return
	}
	defer rows.Close()

	logs := make([]map[string]any, 0)
	var lastCreatedAt time.Time
	var lastID string
	for rows.Next() {
		var id, action, entity, entityID, userID, userEmail, level string
		var details []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &action, &entity, &entityID, &userID, &userEmail, &level, &details, &createdAt); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch admin logs"})
			return
		}
		log := map[string]any{
			"id":        id,
			"action":    action,
			"level":     level,
			"createdAt": toISO(createdAt),
		}
		if entity != "" {
			log["entity"] = entity
		}
		if entityID != "" {
			log["entityId"] = entityID
		}
		if userID != "" {
			log["userId"] = userID
		}
		if userEmail != "" {
			log["userEmail"] = userEmail
		}
		if string(details) != "{}" {
			log["details"] = json.RawMessage(details)
		}
		logs = append(logs, log)
		lastCreatedAt, lastID = createdAt, id
	}

	nextCursor := any(nil)
	if len(logs) == limit {
		nextCursor = encodeCursor(cursor{CreatedAt: toISO(lastCreatedAt), ID: lastID})
	}
	writeJSON(w, http.StatusOK, map[string]any{"logs": logs, "nextCursor": nextCursor})
}

func parseIntDefault(v string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil {
		return fallback
	}
	return n
}

func splitCSV(v string) []string {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func hasAny(arr, wanted []string) bool {
	if len(arr) == 0 || len(wanted) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(arr))
	for _, v := range arr {
		set[v] = struct{}{}
	}
	for _, w := range wanted {
		if _, ok := set[w]; ok {
			return true
		}
	}
	return false
}

func parseStringArrayJSON(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var arr []string
	if err := json.Unmarshal(raw, &arr); err != nil {
		return []string{}
	}
	return arr
}

var _ = sql.ErrNoRows
var _ = pgxpool.Pool{}
