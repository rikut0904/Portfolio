package httpapi

import (
	"strings"
	"sync"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/discord"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/mail"
	"portfolio-backend/internal/infrastructure/persistence/postgres"
	productusecase "portfolio-backend/internal/usecase/product"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

type Handler struct {
	store             *postgres.Store
	products          *productusecase.Usecase
	technologies      *technologyusecase.Usecase
	verifier          *auth.Verifier
	mailer            *mail.Client
	discord           *discord.Client
	firebaseWebAPIKey string
	appBaseURL        string
	mailTo            []string
	appMode           bool
	githubToken       string
	githubOwner       string
	githubRepo        string
	githubBranch      string
	calendar          *gcalendar.Service
	calendarCache     *calendarAPICache
}

type HandlerConfig struct {
	Store             *postgres.Store
	Products          *productusecase.Usecase
	Technologies      *technologyusecase.Usecase
	Verifier          *auth.Verifier
	Mailer            *mail.Client
	Discord           *discord.Client
	FirebaseWebAPIKey string
	AppBaseURL        string
	MailTo            []string
	AppMode           bool
	GitHubToken       string
	GitHubOwner       string
	GitHubRepo        string
	GitHubBranch      string
	Calendar          *gcalendar.Service
}

func NewHandler(cfg HandlerConfig) *Handler {
	return &Handler{
		store:             cfg.Store,
		products:          cfg.Products,
		technologies:      cfg.Technologies,
		verifier:          cfg.Verifier,
		mailer:            cfg.Mailer,
		discord:           cfg.Discord,
		firebaseWebAPIKey: strings.TrimSpace(cfg.FirebaseWebAPIKey),
		appBaseURL:        strings.TrimRight(strings.TrimSpace(cfg.AppBaseURL), "/"),
		mailTo:            cfg.MailTo,
		appMode:           cfg.AppMode,
		githubToken:       strings.TrimSpace(cfg.GitHubToken),
		githubOwner:       strings.TrimSpace(cfg.GitHubOwner),
		githubRepo:        strings.TrimSpace(cfg.GitHubRepo),
		githubBranch:      strings.TrimSpace(cfg.GitHubBranch),
		calendar:          cfg.Calendar,
		calendarCache:     newCalendarAPICache(),
	}
}

type cachedCalendarEventsResponse struct {
	response calendarPreferencesResponse
	events   []gcalendar.Event
	from     string
	to       string
}

type cachedCalendarPreferences struct {
	response calendarPreferencesResponse
}

type calendarCacheEntry[T any] struct {
	value     T
	expiresAt time.Time
}

type calendarAPICache struct {
	mu          sync.RWMutex
	events      map[string]calendarCacheEntry[cachedCalendarEventsResponse]
	preferences map[string]calendarCacheEntry[cachedCalendarPreferences]
}

func newCalendarAPICache() *calendarAPICache {
	return &calendarAPICache{
		events:      make(map[string]calendarCacheEntry[cachedCalendarEventsResponse]),
		preferences: make(map[string]calendarCacheEntry[cachedCalendarPreferences]),
	}
}

func (c *calendarAPICache) getEvents(key string) (cachedCalendarEventsResponse, bool) {
	c.mu.RLock()
	entry, ok := c.events[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			c.mu.Lock()
			delete(c.events, key)
			c.mu.Unlock()
		}
		return cachedCalendarEventsResponse{}, false
	}
	return entry.value, true
}

func (c *calendarAPICache) setEvents(key string, value cachedCalendarEventsResponse, ttl time.Duration) {
	c.mu.Lock()
	c.pruneExpiredEventsLocked(time.Now())
	c.events[key] = calendarCacheEntry[cachedCalendarEventsResponse]{
		value:     value,
		expiresAt: time.Now().Add(ttl),
	}
	c.mu.Unlock()
}

func (c *calendarAPICache) getPreferences(key string) (cachedCalendarPreferences, bool) {
	c.mu.RLock()
	entry, ok := c.preferences[key]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			c.mu.Lock()
			delete(c.preferences, key)
			c.mu.Unlock()
		}
		return cachedCalendarPreferences{}, false
	}
	return entry.value, true
}

func (c *calendarAPICache) setPreferences(key string, value cachedCalendarPreferences, ttl time.Duration) {
	c.mu.Lock()
	c.pruneExpiredPreferencesLocked(time.Now())
	c.preferences[key] = calendarCacheEntry[cachedCalendarPreferences]{
		value:     value,
		expiresAt: time.Now().Add(ttl),
	}
	c.mu.Unlock()
}

func (c *calendarAPICache) pruneExpiredEventsLocked(now time.Time) {
	for key, entry := range c.events {
		if now.After(entry.expiresAt) {
			delete(c.events, key)
		}
	}
}

func (c *calendarAPICache) pruneExpiredPreferencesLocked(now time.Time) {
	for key, entry := range c.preferences {
		if now.After(entry.expiresAt) {
			delete(c.preferences, key)
		}
	}
}

func (c *calendarAPICache) clearPreferences() {
	c.mu.Lock()
	clear(c.preferences)
	c.mu.Unlock()
}

func (c *calendarAPICache) clearEvents() {
	c.mu.Lock()
	clear(c.events)
	c.mu.Unlock()
}
