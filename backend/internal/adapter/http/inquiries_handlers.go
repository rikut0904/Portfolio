package httpapi

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"portfolio-backend/internal/domain/inquiry"
	"portfolio-backend/internal/infrastructure/auth"
	"portfolio-backend/internal/infrastructure/gcalendar"
	"portfolio-backend/internal/infrastructure/mail"
)

func normalize(v any) string { s, _ := v.(string); return strings.TrimSpace(s) }
func (h *InquiryHandler) buildContactLink(threadID string) string {
	if strings.TrimSpace(threadID) == "" || h.appBaseURL == "" {
		return ""
	}
	return h.appBaseURL + "/contact/" + strings.TrimSpace(threadID)
}
func buildGoogleCalendarTemplateURL(summary, description string, start, end time.Time) string {
	if start.IsZero() || end.IsZero() || !end.After(start) {
		return ""
	}
	values := url.Values{}
	values.Set("action", "TEMPLATE")
	values.Set("text", strings.TrimSpace(summary))
	values.Set("details", strings.TrimSpace(description))
	values.Set("dates", start.UTC().Format("20060102T150405Z")+"/"+end.UTC().Format("20060102T150405Z"))
	return "https://calendar.google.com/calendar/render?" + values.Encode()
}

func (h *InquiryHandler) createInquiry(w http.ResponseWriter, r *http.Request) error {
	var body inquiry.InquiryPayload
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	body.Category, body.Subject, body.Message, body.ContactName, body.ContactEmail = normalize(body.Category), normalize(body.Subject), normalize(body.Message), normalize(body.ContactName), normalize(body.ContactEmail)
	if body.Subject == "" || body.Message == "" || body.ContactEmail == "" {
		return NewAppError(http.StatusBadRequest, "subject, message, contactEmail are required", nil)
	}
	var start, end time.Time
	calendarURL := ""
	if body.Category == "mtg" {
		if h.calendar == nil || !h.calendar.Enabled() {
			return NewAppError(http.StatusServiceUnavailable, "Google Calendar is not configured", nil)
		}
		var err error
		start, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedStart))
		if err != nil {
			return NewAppError(http.StatusBadRequest, "requestedStart must be RFC3339", err)
		}
		end, err = time.Parse(time.RFC3339, strings.TrimSpace(body.RequestedEnd))
		if err != nil {
			return NewAppError(http.StatusBadRequest, "requestedEnd must be RFC3339", err)
		}
		if !end.After(start) {
			return NewAppError(http.StatusBadRequest, "requestedEnd must be after requestedStart", nil)
		}
	}
	created, err := h.usecase.Create(r.Context(), body)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create inquiry", err)
	}
	if body.Category == "mtg" {
		summary := "MTG"
		if body.ContactName != "" {
			summary = body.ContactName + "-MTG"
		}
		description := strings.Join([]string{"MTG詳細", body.Message}, "\n")
		event, eventErr := h.calendar.CreateEvent(r.Context(), gcalendar.CreateEventInput{Summary: summary, Description: description, Start: start, End: end})
		if eventErr != nil {
			log.Printf("Warning: failed to create calendar event: %v", eventErr)
		} else {
			h.calendarCache.clearEvents()
			calendarURL = buildGoogleCalendarTemplateURL(summary, description, start, end)
			if calendarURL == "" {
				calendarURL = event.HTMLLink
			}
		}
	}
	threadURL := h.buildContactLink(created.ThreadID)
	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{ID: created.ID, ThreadID: created.ThreadID, ThreadURL: threadURL, NotificationLabel: "新しいお問い合わせ", Category: created.Category, Subject: created.Subject, Message: created.Message, ContactName: created.ContactName, ContactEmail: created.ContactEmail})
	h.sendInquiryReceipt(r.Context(), mail.InquiryReceiptData{Name: created.ContactName, Category: created.Category, Subject: created.Subject, Message: created.Message, ThreadURL: threadURL, CalendarURL: calendarURL, ContactEmail: created.ContactEmail})
	writeJSON(w, http.StatusCreated, map[string]any{"id": created.ID, "threadId": created.ThreadID, "threadUrl": threadURL})
	return nil
}

func inquiryMap(item inquiry.Inquiry, replies []inquiry.Reply, threadURL string) map[string]any {
	return map[string]any{"id": item.ID, "threadId": item.ThreadID, "threadUrl": threadURL, "category": item.Category, "subject": item.Subject, "message": item.Message, "contactName": item.ContactName, "contactEmail": item.ContactEmail, "status": item.Status, "replies": replies, "createdAt": item.CreatedAt, "updatedAt": item.UpdatedAt}
}
func (h *InquiryHandler) getInquiries(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	items, err := h.usecase.List(r.Context())
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiries", err)
	}
	h.logAdmin(r.Context(), "read", "inquiries", "", "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"contacts": items, "inquiries": items})
	return nil
}
func (h *InquiryHandler) getInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	item, replies, err := h.usecase.GetByID(r.Context(), routeParam(r, "id"))
	if err != nil {
		if errors.Is(err, inquiry.ErrNotFound) {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry", err)
	}
	h.logAdmin(r.Context(), "read", "inquiry", item.ID, "info", user, nil)
	detail := inquiryMap(item, replies, h.buildContactLink(item.ThreadID))
	writeJSON(w, http.StatusOK, map[string]any{"contact": detail, "inquiry": detail})
	return nil
}
func (h *InquiryHandler) getInquiryThread(w http.ResponseWriter, r *http.Request) error {
	threadID := strings.TrimSpace(routeParam(r, "threadId"))
	if threadID == "" {
		return NewAppError(http.StatusBadRequest, "threadId is required", nil)
	}
	item, replies, err := h.usecase.GetByThreadID(r.Context(), threadID)
	if err != nil {
		if errors.Is(err, inquiry.ErrNotFound) {
			return NewAppError(http.StatusNotFound, "Not found", err)
		}
		return NewAppError(http.StatusInternalServerError, "Failed to fetch inquiry thread", err)
	}
	detail := inquiryMap(item, replies, h.buildContactLink(item.ThreadID))
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
	item, _, err := h.usecase.GetByThreadID(r.Context(), threadID)
	if err != nil {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	reply, err := h.usecase.ReplyFromUser(r.Context(), threadID, message)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create reply", err)
	}
	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{ID: item.ID, ThreadID: threadID, ThreadURL: h.buildContactLink(threadID), NotificationLabel: "お問い合わせスレッドへの追加返信", Category: item.Category, Subject: item.Subject, Message: message, ContactName: item.ContactName, ContactEmail: item.ContactEmail})
	writeJSON(w, http.StatusOK, map[string]any{"id": reply.ID})
	return nil
}
func (h *InquiryHandler) patchInquiryStatus(w http.ResponseWriter, r *http.Request, user *auth.Claims) error {
	var body map[string]any
	if err := decodeBody(r, &body); err != nil {
		return NewAppError(http.StatusBadRequest, "Invalid request body", err)
	}
	status := normalize(body["status"])
	if status != "pending" && status != "in_progress" && status != "resolved" {
		return NewAppError(http.StatusBadRequest, "Invalid status", nil)
	}
	id := routeParam(r, "id")
	if err := h.usecase.UpdateStatus(r.Context(), id, status); err != nil {
		return NewAppError(http.StatusNotFound, "Not found", err)
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
	item, _, err := h.usecase.GetByID(r.Context(), id)
	if err != nil {
		return NewAppError(http.StatusNotFound, "Not found", err)
	}
	reply, err := h.usecase.ReplyFromAdmin(r.Context(), id, message, user.Email)
	if err != nil {
		return NewAppError(http.StatusInternalServerError, "Failed to create reply", err)
	}
	h.sendInquiryReply(r.Context(), mail.InquiryReplyData{Name: item.ContactName, Subject: item.Subject, Message: message, ThreadURL: h.buildContactLink(item.ThreadID), ContactEmail: item.ContactEmail})
	h.logAdmin(r.Context(), "reply", "inquiry", id, "info", user, map[string]any{"messageLength": len(message)})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": reply.ID})
	return nil
}

func (h *InquiryHandler) notifyInquiryCreated(ctx context.Context, data mail.InquiryNotificationData) {
	if strings.TrimSpace(data.NotificationLabel) == "" {
		data.NotificationLabel = "新しいお問い合わせ"
	}
	if h.mailer != nil {
		subject, body, err := mail.BuildInquiryNotification(data)
		if err != nil {
			log.Printf("mail template error: %v", err)
		} else if err := h.mailer.SendText(ctx, h.mailTo, subject, body); err != nil {
			log.Printf("SES notify error: %v", err)
		}
	}
	if h.discord != nil {
		body, err := mail.BuildInquiryDiscordNotification(data)
		if err != nil {
			log.Printf("discord template error: %v", err)
		} else if err := h.discord.Send(ctx, body); err != nil {
			log.Printf("discord notify error: %v", err)
		}
	}
}
func (h *InquiryHandler) sendInquiryReceipt(ctx context.Context, data mail.InquiryReceiptData) {
	if h.mailer == nil {
		return
	}
	subject, body, err := mail.BuildInquiryReceipt(data)
	if err != nil {
		log.Printf("mail template error: %v", err)
		return
	}
	if err := h.mailer.SendText(ctx, []string{data.ContactEmail}, subject, body); err != nil {
		log.Printf("SES notify error: %v", err)
	}
}
func (h *InquiryHandler) sendInquiryReply(ctx context.Context, data mail.InquiryReplyData) {
	if h.mailer == nil {
		return
	}
	subject, body, err := mail.BuildInquiryReply(data)
	if err != nil {
		log.Printf("mail template error: %v", err)
		return
	}
	if err := h.mailer.SendText(ctx, []string{data.ContactEmail}, subject, body); err != nil {
		log.Printf("SES notify error: %v", err)
	}
}
