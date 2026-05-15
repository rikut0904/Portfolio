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
	"portfolio-backend/internal/infrastructure/persistence/postgres"

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

func (h *InquiryHandler) buildContactLink(threadID string) string {
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

func (h *InquiryHandler) fetchInquiryReplies(ctx context.Context, inquiryID string) ([]inquiryReplyItem, error) {
	var models []postgres.InquiryReplyModel
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

func (h *InquiryHandler) createInquiry(w http.ResponseWriter, r *http.Request) error {
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
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	category := strings.TrimSpace(body.Category)
	subject := strings.TrimSpace(body.Subject)
	message := strings.TrimSpace(body.Message)
	contactName := strings.TrimSpace(body.ContactName)
	contactEmail := strings.TrimSpace(body.ContactEmail)
	if subject == "" || message == "" || contactEmail == "" {
		return NewAppError(http.StatusBadRequest, "subject, message, contactEmail are required", nil)
	}
	var requestedStart time.Time
	var requestedEnd time.Time
	calendarEventURL := ""
	if category == "mtg" {
		if h.calendar == nil || !h.calendar.Enabled() {
			return NewAppError(http.StatusServiceUnavailable, "Google Calendar is not configured", nil)
		}
		var err error
		requestedStart, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedStart))
		if err != nil {
			return NewAppError(http.StatusBadRequest, "requestedStart must be RFC3339", err)
		}
		requestedEnd, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedEnd))
		if err != nil {
			return NewAppError(http.StatusBadRequest, "requestedEnd must be RFC3339", err)
		}
		if !requestedEnd.After(requestedStart) {
			return NewAppError(http.StatusBadRequest, "requestedEnd must be after requestedStart", nil)
		}
	}

	inquiry := postgres.InquiryModel{
		Category:     category,
		Subject:      subject,
		Message:      message,
		ContactName:  contactName,
		ContactEmail: contactEmail,
		Status:       "pending",
	}

	// 1. Database Transaction (Save inquiry only)
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&inquiry).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		log.Printf("failed to create inquiry: %v", err)
		if err.Error() == "conflict" {
			return NewAppError(http.StatusConflict, "Section with this ID already exists", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to create inquiry", err)
	}

	// 2. External API Call (Google Calendar) - OUTSIDE Transaction
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
			// Log error but don't fail the whole request since DB record is already saved
			log.Printf("Warning: failed to create calendar event: %v", err)
		} else {
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
	}

	// 3. Post-processing (Notifications, etc.)
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
	return nil
}

func (h *InquiryHandler) getInquiries(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var models []postgres.InquiryModel
	err := h.store.DB.WithContext(r.Context()).Order("created_at DESC").Find(&models).Error
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiries", err)
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
	return nil
}

func (h *InquiryHandler) getInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var m postgres.InquiryModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry", err)
	}

	replies, err := h.fetchInquiryReplies(r.Context(), id)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry", err)
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
	return nil
}

func (h *InquiryHandler) getInquiryThread(w http.ResponseWriter, r *http.Request) error {
	threadID := strings.TrimSpace(routeParam(r, "threadId"))
	if threadID == "" {
		return NewAppError(http.StatusBadRequest, "threadId is required", nil)
	}

	var m postgres.InquiryModel
	err := h.store.DB.WithContext(r.Context()).First(&m, "thread_id = ?", threadID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry", err)
	}

	replies, err := h.fetchInquiryReplies(r.Context(), m.ID)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry", err)
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
	return nil
}

func (h *InquiryHandler) replyInquiryThread(w http.ResponseWriter, r *http.Request) error {
	threadID := strings.TrimSpace(routeParam(r, "threadId"))
	if threadID == "" {
		return NewAppError(http.StatusBadRequest, "threadId is required", nil)
	}

	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	message := normalize(body["message"])
	if message == "" {
		return NewAppError(http.StatusBadRequest, "message is required", nil)
	}

	replyID := fmt.Sprintf("%d", time.Now().UnixNano())

	var inquiry postgres.InquiryModel
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&inquiry, "thread_id = ?", threadID).Error; err != nil {
			return err
		}

		reply := postgres.InquiryReplyModel{
			ID:          replyID,
			InquiryID:   inquiry.ID,
			ThreadID:    threadID,
			SenderType:  "user",
			SenderName:  inquiry.ContactName,
			SenderEmail: inquiry.ContactEmail,
			Message:     message,
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
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to create reply", err)
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
	return nil
}

func (h *InquiryHandler) patchInquiryStatus(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	status := normalize(body["status"])
	if status != "pending" && status != "in_progress" && status != "resolved" {
		return NewAppError(http.StatusBadRequest, "Invalid status", nil)
	}

	result := h.store.DB.WithContext(r.Context()).Model(&postgres.InquiryModel{}).Where("id = ?", id).Updates(map[string]any{"status": status, "updated_at": time.Now()})
	if result.Error != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to update inquiry", result.Error)
	}
	if result.RowsAffected == 0 {
		return NewAppError(http.StatusNotFound, "Not found", nil)
	}
	h.logAdmin(r.Context(), "update", "inquiry", id, "info", user, map[string]any{"status": status})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	return nil
}

func (h *InquiryHandler) replyInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	id := routeParam(r, "id")
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	message := normalize(body["message"])
	if message == "" {
		return NewAppError(http.StatusBadRequest, "message is required", nil)
	}

	senderName := "admin"
	if strings.TrimSpace(user.Email) != "" {
		senderName = user.Email
	}
	replyID := fmt.Sprintf("%d", time.Now().UnixNano())

	var inquiry postgres.InquiryModel
	err := h.store.DB.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&inquiry, "id = ?", id).Error; err != nil {
			return err
		}

		nextStatus := inquiry.Status
		if inquiry.Status == "pending" {
			nextStatus = "in_progress"
		}

		reply := postgres.InquiryReplyModel{
			ID:          replyID,
			InquiryID:   inquiry.ID,
			ThreadID:    inquiry.ThreadID,
			SenderType:  "admin",
			SenderName:  senderName,
			SenderEmail: user.Email,
			Message:     message,
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
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to create reply", err)
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
	return nil
}

func (h *InquiryHandler) notifyInquiryCreated(ctx context.Context, data mail.InquiryNotificationData) {
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

func (h *InquiryHandler) sendInquiryReceipt(ctx context.Context, data mail.InquiryReceiptData) {
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

func (h *InquiryHandler) sendInquiryReply(ctx context.Context, data mail.InquiryReplyData) {
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
