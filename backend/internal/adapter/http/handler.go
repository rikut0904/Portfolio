package httpapi

import (
	"strings"
	"sync"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/discord"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/mail"
	activityusecase "portfolio-backend/internal/usecase/activity"
	adminlogusecase "portfolio-backend/internal/usecase/adminlog"
	calendarusecase "portfolio-backend/internal/usecase/calendar"
	inquiryusecase "portfolio-backend/internal/usecase/inquiry"
	productusecase "portfolio-backend/internal/usecase/product"
	sectionusecase "portfolio-backend/internal/usecase/section"
	technologyusecase "portfolio-backend/internal/usecase/technology"
)

// BaseHandler contains common dependencies for all domain handlers.
type BaseHandler struct {
	healthChecker HealthChecker
	verifier      *auth.Verifier
	mailer        *mail.Client
	discord       *discord.Client
	appBaseURL    string
	mailTo        []string
	appMode       bool
	adminLogs     adminlogusecase.Usecase
	githubToken   string
	githubOwner   string
	githubRepo    string
	githubBranch  string
}

// Handler is the root container for all domain-specific handlers.
type Handler struct {
	*BaseHandler
	Activities   *ActivityHandler
	Products     *ProductHandler
	Technologies *TechnologyHandler
	Inquiries    *InquiryHandler
	Sections     *SectionHandler
	Calendar     *CalendarHandler
	AdminLogs    *AdminLogHandler
}

type HandlerConfig struct {
	HealthChecker HealthChecker
	Products      productusecase.Usecase
	Activities    activityusecase.Usecase
	Inquiries     inquiryusecase.Usecase
	AdminLogs     adminlogusecase.Usecase
	Sections      sectionusecase.Usecase
	Technologies  technologyusecase.Usecase
	Verifier      *auth.Verifier
	Mailer        *mail.Client
	Discord       *discord.Client
	AppBaseURL    string
	MailTo        []string
	AppMode       bool
	GitHubToken   string
	GitHubOwner   string
	GitHubRepo    string
	GitHubBranch  string
	Calendar      *gcalendar.Service
	CalendarRepo  calendarusecase.Repository
}

func NewHandler(cfg HandlerConfig) *Handler {
	base := &BaseHandler{
		healthChecker: cfg.HealthChecker,
		verifier:      cfg.Verifier,
		mailer:        cfg.Mailer,
		discord:       cfg.Discord,
		appBaseURL:    strings.TrimRight(strings.TrimSpace(cfg.AppBaseURL), "/"),
		mailTo:        cfg.MailTo,
		appMode:       cfg.AppMode,
		githubToken:   strings.TrimSpace(cfg.GitHubToken),
		githubOwner:   strings.TrimSpace(cfg.GitHubOwner),
		githubRepo:    strings.TrimSpace(cfg.GitHubRepo),
		githubBranch:  strings.TrimSpace(cfg.GitHubBranch),
	}

	h := &Handler{
		BaseHandler: base,
	}

	h.Activities = &ActivityHandler{BaseHandler: base, usecase: cfg.Activities}
	h.Products = &ProductHandler{BaseHandler: base, usecase: cfg.Products}
	h.Technologies = &TechnologyHandler{BaseHandler: base, usecase: cfg.Technologies}

	sharedCalendarCache := newCalendarAPICache()
	h.Inquiries = &InquiryHandler{BaseHandler: base, calendar: cfg.Calendar, calendarCache: sharedCalendarCache, usecase: cfg.Inquiries}
	h.Sections = &SectionHandler{BaseHandler: base, usecase: cfg.Sections}
	h.Calendar = &CalendarHandler{BaseHandler: base, service: cfg.Calendar, cache: sharedCalendarCache, repository: cfg.CalendarRepo}
	base.adminLogs = cfg.AdminLogs
	h.AdminLogs = &AdminLogHandler{BaseHandler: base, usecase: cfg.AdminLogs}

	return h
}

// ActivityHandler handles activity-related requests.
type ActivityHandler struct {
	*BaseHandler
	usecase activityusecase.Usecase
}

// ProductHandler handles product-related requests.
type ProductHandler struct {
	*BaseHandler
	usecase productusecase.Usecase
}

// TechnologyHandler handles technology-related requests.
type TechnologyHandler struct {
	*BaseHandler
	usecase technologyusecase.Usecase
}

// InquiryHandler handles inquiry and contact requests.
type InquiryHandler struct {
	*BaseHandler
	calendar      *gcalendar.Service
	calendarCache *calendarAPICache
	usecase       inquiryusecase.Usecase
}

// SectionHandler handles dynamic section requests.
type SectionHandler struct {
	*BaseHandler
	usecase sectionusecase.Usecase
}

// CalendarHandler handles calendar-related requests.
type CalendarHandler struct {
	*BaseHandler
	service    *gcalendar.Service
	cache      *calendarAPICache
	repository calendarusecase.Repository
}

// AdminLogHandler handles admin log requests.
type AdminLogHandler struct {
	*BaseHandler
	usecase adminlogusecase.Usecase
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
