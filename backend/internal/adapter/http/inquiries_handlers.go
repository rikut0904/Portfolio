package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/mail"

	"gorm.io/gorm"
)

func normalize(v any) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

type inquiryReplyItem struct {
	ID          string `json:"id"`
	InquiryID   string `json:"inquiryId"`
	ThreadID    string `json:"threadId"`
	SenderType  string `json:"senderType"`
	SenderName  string `json:"senderName"`
	SenderEmail string `json:"senderEmail,omitempty"`
	Message     string `json:"message"`
	CreatedAt   string `json:"createdAt"`
}

func (h *Handler) ensureInquiriesTable(w http.ResponseWriter, r *http.Request) bool {
	m := h.store.DB.WithContext(r.Context()).Migrator()
	if !m.HasTable("inquiries") || !m.HasTable("inquiry_replies") || !m.HasColumn("inquiries", "thread_id") {
		writeJSON(w, http.StatusNotImplemented, map[string]any{
			"error": "inquiry thread schema is not found. Please apply the latest inquiry migration first",
		})
		return false
	}
	return true
}

func (h *Handler) buildContactLink(threadID string) string {
	threadID = strings.TrimSpace(threadID)
	if threadID == "" || h.appBaseURL == "" {
		return ""
	}
	return h.appBaseURL + "/contact/" + threadID
}

func buildGoogleCalendarTemplateURL(summary, description string, start, end time.Time) string {
	if start.IsZero() || end.IsZero() || !end.After(start) {
		return ""
	}
	values := url.Values{}
	values.Set("action", "TEMPLATE")
	values.Set("text", strings.TrimSpace(summary))
	values.Set("details", strings.TrimSpace(description))
	values.Set(
		"dates",
		start.UTC().Format("20060102T150405Z")+"/"+end.UTC().Format("20060102T150405Z"),
	)
	return "https://calendar.google.com/calendar/render?" + values.Encode()
}

type inquiryModel struct {
	ID           string    `gorm:"column:id;primaryKey;default:gen_random_uuid()"`
	Category     string    `gorm:"column:category"`
	Subject      string    `gorm:"column:subject"`
	Message      string    `gorm:"column:message"`
	ContactName  string    `gorm:"column:contact_name"`
	ContactEmail string    `gorm:"column:contact_email"`
	ThreadID     string    `gorm:"column:thread_id;default:gen_random_uuid()"`
	Status       string    `gorm:"column:status"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (inquiryModel) TableName() string {
	return "inquiries"
}

type inquiryReplyModel struct {
	ID          string    `gorm:"column:id;primaryKey"`
	InquiryID   string    `gorm:"column:inquiry_id"`
	ThreadID    string    `gorm:"column:thread_id"`
	SenderType  string    `gorm:"column:sender_type"`
	SenderName  string    `gorm:"column:sender_name"`
	SenderEmail string    `gorm:"column:sender_email"`
	Message     string    `gorm:"column:message"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (inquiryReplyModel) TableName() string {
	return "inquiry_replies"
}

func (h *Handler) fetchInquiryReplies(ctx context.Context, inquiryID string) ([]inquiryReplyItem, error) {
	var models []inquiryReplyModel
	err := h.store.DB.WithContext(ctx).
		Where("inquiry_id = ?", inquiryID).
		Order("created_at ASC, id ASC").
		Find(&models).Error
	if err != nil {
		return nil, err
	}

	replies := make([]inquiryReplyItem, len(models))
	for i, m := range models {
		replies[i] = inquiryReplyItem{
			ID:          m.ID,
			InquiryID:   m.InquiryID,
			ThreadID:    m.ThreadID,
			SenderType:  m.SenderType,
			SenderName:  m.SenderName,
			SenderEmail: m.SenderEmail,
			Message:     m.Message,
			CreatedAt:   toISO(m.CreatedAt),
		}
	}

	return replies, nil
}

func (h *Handler) createInquiry(w http.ResponseWriter, r *http.Request) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	var body struct {
		Category       string `json:"category"`
		Subject        string `json:"subject"`
		Message        string `json:"message"`
		ContactName    string `json:"contactName"`
		ContactEmail   string `json:"contactEmail"`
		RequestedStart string `json:"requestedStart"`
		RequestedEnd   string `json:"requestedEnd"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "Invalid request body"})
		return
	}
	category := strings.TrimSpace(body.Category)
	subject := strings.TrimSpace(body.Subject)
	message := strings.TrimSpace(body.Message)
	contactName := strings.TrimSpace(body.ContactName)
	contactEmail := strings.TrimSpace(body.ContactEmail)
	if subject == "" || message == "" || contactEmail == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "subject, message, contactEmail are required"})
		return
	}
	var requestedStart time.Time
	var requestedEnd time.Time
	calendarEventURL := ""
	if category == "mtg" {
		if h.calendar == nil || !h.calendar.Enabled() {
			writeJSON(w, http.StatusServiceUnavailable, map[string]any{"error": "Google Calendar is not configured"})
			return
		}
		var err error
		requestedStart, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedStart))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "requestedStart must be RFC3339"})
			return
		}
		requestedEnd, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedEnd))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "requestedEnd must be RFC3339"})
			return
		}
		if !requestedEnd.After(requestedStart) {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "requestedEnd must be after requestedStart"})
			return
		}
	}

	inquiry := inquiryModel{
		Category:     category,
		Subject:      subject,
		Message:      message,
		ContactName:  contactName,
		ContactEmail: contactEmail,
		Status:       "pending",
	}

	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&inquiry).Error; err != nil {
			return err
		}

		if category == "mtg" {
			calendarSummary := "MTG"
			if strings.TrimSpace(contactName) != "" {
				calendarSummary = strings.TrimSpace(contactName) + "-MTG"
			}
			calendarDescription := strings.TrimSpace(strings.Join([]string{
				"MTG詳細",
				message,
			}, "\n"))
			calendarEvent, err := h.calendar.CreateEvent(r.Context(), gcalendar.CreateEventInput{
				Summary:     calendarSummary,
				Description: calendarDescription,
				Start:       requestedStart,
				End:         requestedEnd,
			})
			if err != nil {
				return err
			}
			h.calendarCache.clearEvents()
			calendarEventURL = buildGoogleCalendarTemplateURL(
				calendarSummary,
				calendarDescription,
				requestedStart,
				requestedEnd,
			)
			if calendarEventURL == "" {
				calendarEventURL = calendarEvent.HTMLLink
			}
		}
		return nil
	})

	if err != nil {
		log.Printf("failed to create inquiry: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create inquiry"})
		return
	}

	threadURL := h.buildContactLink(inquiry.ThreadID)
	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{
		ID:                inquiry.ID,
		ThreadID:          inquiry.ThreadID,
		ThreadURL:         threadURL,
		NotificationLabel: "新しいお問い合わせ",
		Category:          category,
		Subject:           subject,
		Message:           message,
		ContactName:       contactName,
		ContactEmail:      contactEmail,
	})
	h.sendInquiryReceipt(r.Context(), mail.InquiryReceiptData{
		Name:         contactName,
		Category:     category,
		Subject:      subject,
		Message:      message,
		ThreadURL:    threadURL,
		CalendarURL:  calendarEventURL,
		ContactEmail: contactEmail,
	})

	writeJSON(w, http.StatusCreated, map[string]any{"id": inquiry.ID, "threadId": inquiry.ThreadID, "threadUrl": threadURL})
}

func (h *Handler) getInquiries(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	var models []inquiryModel
	err := h.store.DB.WithContext(r.Context()).Order("created_at DESC").Find(&models).Error
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiries"})
		return
	}

	inquiries := make([]map[string]any, 0, len(models))
	for _, m := range models {
		inquiries = append(inquiries, map[string]any{
			"id":           m.ID,
			"threadId":     m.ThreadID,
			"category":     m.Category,
			"subject":      m.Subject,
			"message":      m.Message,
			"contactName":  m.ContactName,
			"contactEmail": m.ContactEmail,
			"status":       m.Status,
			"createdAt":    toISO(m.CreatedAt),
			"updatedAt":    toISO(m.UpdatedAt),
		})
	}
	h.logAdmin(r.Context(), "read", "inquiries", "", "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"contacts": inquiries, "inquiries": inquiries})
}

func (h *Handler) getInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := routeParam(r, "id")
	var m inquiryModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiry"})
		return
	}

	replies, err := h.fetchInquiryReplies(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiry"})
		return
	}
	h.logAdmin(r.Context(), "read", "inquiry", id, "info", user, nil)
	detail := map[string]any{
		"id":           m.ID,
		"threadId":     m.ThreadID,
		"threadUrl":    h.buildContactLink(m.ThreadID),
		"category":     m.Category,
		"subject":      m.Subject,
		"message":      m.Message,
		"contactName":  m.ContactName,
		"contactEmail": m.ContactEmail,
		"status":       m.Status,
		"replies":      replies,
		"createdAt":    toISO(m.CreatedAt),
		"updatedAt":    toISO(m.UpdatedAt),
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": detail, "inquiry": detail})
}

func (h *Handler) getInquiryThread(w http.ResponseWriter, r *http.Request) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	threadID := strings.TrimSpace(routeParam(r, "threadId"))
	if threadID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "threadId is required"})
		return
	}

	var m inquiryModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "thread_id = ?", threadID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiry"})
		return
	}

	replies, err := h.fetchInquiryReplies(r.Context(), m.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiry"})
		return
	}

	detail := map[string]any{
		"id":           m.ID,
		"threadId":     m.ThreadID,
		"threadUrl":    h.buildContactLink(m.ThreadID),
		"category":     m.Category,
		"subject":      m.Subject,
		"message":      m.Message,
		"contactName":  m.ContactName,
		"contactEmail": m.ContactEmail,
		"status":       m.Status,
		"replies":      replies,
		"createdAt":    toISO(m.CreatedAt),
		"updatedAt":    toISO(m.UpdatedAt),
	}
	writeJSON(w, http.StatusOK, map[string]any{"contact": detail, "inquiry": detail})
}

func (h *Handler) replyInquiryThread(w http.ResponseWriter, r *http.Request) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	threadID := strings.TrimSpace(routeParam(r, "threadId"))
	if threadID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "threadId is required"})
		return
	}

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

	replyID := fmt.Sprintf("%d", time.Now().UnixNano())

	var inquiry inquiryModel
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&inquiry, "thread_id = ?", threadID).Error; err != nil {
			return err
		}

		reply := inquiryReplyModel{
			ID:           replyID,
			InquiryID:    inquiry.ID,
			ThreadID:     threadID,
			SenderType:   "user",
			SenderName:   inquiry.ContactName,
			SenderEmail:  inquiry.ContactEmail,
			Message:      message,
		}
		if err := tx.Create(&reply).Error; err != nil {
			return err
		}

		nextStatus := inquiry.Status
		if inquiry.Status == "resolved" {
			nextStatus = "pending"
		}
		if err := tx.Model(&inquiry).Updates(map[string]any{"status": nextStatus, "updated_at": time.Now()}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{
		ID:                inquiry.ID,
		ThreadID:          threadID,
		ThreadURL:         h.buildContactLink(threadID),
		NotificationLabel: "お問い合わせスレッドへの追加返信",
		Category:          inquiry.Category,
		Subject:           inquiry.Subject,
		Message:           message,
		ContactName:       inquiry.ContactName,
		ContactEmail:      inquiry.ContactEmail,
	})

	writeJSON(w, http.StatusOK, map[string]any{"id": replyID})
}

func (h *Handler) patchInquiryStatus(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := routeParam(r, "id")
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

	result := h.store.DB.WithContext(r.Context()).Model(&inquiryModel{}).Where("id = ?", id).Updates(map[string]any{"status": status, "updated_at": time.Now()})
	if result.Error != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to update inquiry"})
		return
	}
	if result.RowsAffected == 0 {
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
	id := routeParam(r, "id")
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

	senderName := "admin"
	if strings.TrimSpace(user.Email) != "" {
		senderName = user.Email
	}
	replyID := fmt.Sprintf("%d", time.Now().UnixNano())

	var inquiry inquiryModel
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&inquiry, "id = ?", id).Error; err != nil {
			return err
		}

		nextStatus := inquiry.Status
		if inquiry.Status == "pending" {
			nextStatus = "in_progress"
		}

		reply := inquiryReplyModel{
			ID:           replyID,
			InquiryID:    inquiry.ID,
			ThreadID:     inquiry.ThreadID,
			SenderType:   "admin",
			SenderName:   senderName,
			SenderEmail:  user.Email,
			Message:      message,
		}
		if err := tx.Create(&reply).Error; err != nil {
			return err
		}

		if err := tx.Model(&inquiry).Updates(map[string]any{"status": nextStatus, "updated_at": time.Now()}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	h.sendInquiryReply(r.Context(), mail.InquiryReplyData{
		Name:         inquiry.ContactName,
		Subject:      inquiry.Subject,
		Message:      message,
		ThreadURL:    h.buildContactLink(inquiry.ThreadID),
		ContactEmail: inquiry.ContactEmail,
	})

	h.logAdmin(r.Context(), "reply", "inquiry", id, "info", user, map[string]any{"messageLength": len(message)})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) notifyInquiryCreated(ctx context.Context, data mail.InquiryNotificationData) {
	if strings.TrimSpace(data.NotificationLabel) == "" {
		data.NotificationLabel = "新しいお問い合わせ"
	}
	if h.mailer != nil {
		subjectAdmin, bodyAdmin, err := mail.BuildInquiryNotification(data)
		if err != nil {
			log.Printf("mail template error (inquiry->admin): %v", err)
		} else if err := h.mailer.SendText(ctx, h.mailTo, subjectAdmin, bodyAdmin); err != nil {
			log.Printf("SES notify error (inquiry->admin): %v", err)
		}
	}

	if h.discord != nil {
		body, err := mail.BuildInquiryDiscordNotification(data)
		if err != nil {
			log.Printf("discord template error (inquiry->admin): %v", err)
		} else {
			log.Printf("discord notify start (inquiry->admin): thread_id=%s label=%s", data.ThreadID, data.NotificationLabel)
			if err := h.discord.Send(ctx, body); err != nil {
				log.Printf("discord notify error (inquiry->admin): %v", err)
			} else {
				log.Printf("discord notify success (inquiry->admin): thread_id=%s", data.ThreadID)
			}
		}
	}
}

func (h *Handler) sendInquiryReceipt(ctx context.Context, data mail.InquiryReceiptData) {
	if h.mailer == nil {
		return
	}
	subject, body, err := mail.BuildInquiryReceipt(data)
	if err != nil {
		log.Printf("mail template error (inquiry receipt): %v", err)
		return
	}
	if err := h.mailer.SendText(ctx, []string{data.ContactEmail}, subject, body); err != nil {
		log.Printf("SES notify error (inquiry receipt): %v", err)
	}
}

func (h *Handler) sendInquiryReply(ctx context.Context, data mail.InquiryReplyData) {
	if h.mailer == nil {
		return
	}
	subject, body, err := mail.BuildInquiryReply(data)
	if err != nil {
		log.Printf("mail template error (reply): %v", err)
		return
	}
	if err := h.mailer.SendText(ctx, []string{data.ContactEmail}, subject, body); err != nil {
		log.Printf("SES notify error (reply): %v", err)
	}
}

// admin logs
