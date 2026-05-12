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

	"github.com/jackc/pgx/v5"
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
	var inquiriesExists bool
	var repliesExists bool
	var hasThreadID bool
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT
			to_regclass('public.inquiries') IS NOT NULL,
			to_regclass('public.inquiry_replies') IS NOT NULL,
			EXISTS (
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
				  AND table_name = 'inquiries'
				  AND column_name = 'thread_id'
			)
	`).Scan(&inquiriesExists, &repliesExists, &hasThreadID)
	if err != nil || !inquiriesExists || !repliesExists || !hasThreadID {
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

func (h *Handler) fetchInquiryReplies(ctx context.Context, inquiryID string) ([]inquiryReplyItem, error) {
	rows, err := h.store.Pool.Query(ctx, `
		SELECT id, inquiry_id, thread_id, sender_type, sender_name, sender_email, message, created_at
		FROM inquiry_replies
		WHERE inquiry_id = $1
		ORDER BY created_at ASC, id ASC
	`, inquiryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	replies := make([]inquiryReplyItem, 0)
	for rows.Next() {
		var item inquiryReplyItem
		var createdAt time.Time
		if err := rows.Scan(
			&item.ID,
			&item.InquiryID,
			&item.ThreadID,
			&item.SenderType,
			&item.SenderName,
			&item.SenderEmail,
			&item.Message,
			&createdAt,
		); err != nil {
			return nil, err
		}
		item.CreatedAt = toISO(createdAt)
		replies = append(replies, item)
	}

	return replies, rows.Err()
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
	var id string
	var threadID string
	err := h.store.Pool.QueryRow(r.Context(), `
		INSERT INTO inquiries (category, subject, message, contact_name, contact_email, thread_id, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,gen_random_uuid()::text,'pending',NOW(),NOW())
		RETURNING id, thread_id
	`, category, subject, message, contactName, contactEmail).Scan(&id, &threadID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create inquiry"})
		return
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
			log.Printf("failed to create mtg calendar event: inquiry=%s err=%v", id, err)
			if _, deleteErr := h.store.Pool.Exec(r.Context(), `DELETE FROM inquiries WHERE id=$1`, id); deleteErr != nil {
				log.Printf("failed to rollback inquiry after calendar creation error: inquiry=%s err=%v", id, deleteErr)
			}
			writeJSON(w, http.StatusBadGateway, map[string]any{"error": "Failed to reserve the requested time on Google Calendar"})
			return
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
	threadURL := h.buildContactLink(threadID)
	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{
		ID:                id,
		ThreadID:          threadID,
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

	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "threadId": threadID, "threadUrl": threadURL})
}

func (h *Handler) getInquiries(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	rows, err := h.store.Pool.Query(r.Context(), `
		SELECT id, thread_id, category, subject, message, contact_name, contact_email, status, created_at, updated_at
		FROM inquiries ORDER BY created_at DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiries"})
		return
	}
	defer rows.Close()
	inquiries := make([]map[string]any, 0)
	for rows.Next() {
		var id, threadID, category, subject, message, contactName, contactEmail, status string
		var ct, ut time.Time
		if err := rows.Scan(&id, &threadID, &category, &subject, &message, &contactName, &contactEmail, &status, &ct, &ut); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to fetch inquiries"})
			return
		}
		inquiries = append(inquiries, map[string]any{"id": id, "threadId": threadID, "category": category, "subject": subject, "message": message, "contactName": contactName, "contactEmail": contactEmail, "status": status, "createdAt": toISO(ct), "updatedAt": toISO(ut)})
	}
	h.logAdmin(r.Context(), "read", "inquiries", "", "info", user, nil)
	writeJSON(w, http.StatusOK, map[string]any{"contacts": inquiries, "inquiries": inquiries})
}

func (h *Handler) getInquiry(w http.ResponseWriter, r *http.Request, user *auth.Claims) {
	if !h.ensureInquiriesTable(w, r) {
		return
	}
	id := routeParam(r, "id")
	var threadID, category, subject, message, contactName, contactEmail, status string
	var ct, ut time.Time
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT thread_id, category, subject, message, contact_name, contact_email, status, created_at, updated_at
		FROM inquiries WHERE id=$1
	`, id).Scan(&threadID, &category, &subject, &message, &contactName, &contactEmail, &status, &ct, &ut)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
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
	detail := map[string]any{"id": id, "threadId": threadID, "threadUrl": h.buildContactLink(threadID), "category": category, "subject": subject, "message": message, "contactName": contactName, "contactEmail": contactEmail, "status": status, "replies": replies, "createdAt": toISO(ct), "updatedAt": toISO(ut)}
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

	var id, category, subject, message, contactName, contactEmail, status string
	var ct, ut time.Time
	err := h.store.Pool.QueryRow(r.Context(), `
		SELECT id, category, subject, message, contact_name, contact_email, status, created_at, updated_at
		FROM inquiries WHERE thread_id=$1
	`, threadID).Scan(&id, &category, &subject, &message, &contactName, &contactEmail, &status, &ct, &ut)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
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

	detail := map[string]any{
		"id":           id,
		"threadId":     threadID,
		"threadUrl":    h.buildContactLink(threadID),
		"category":     category,
		"subject":      subject,
		"message":      message,
		"contactName":  contactName,
		"contactEmail": contactEmail,
		"status":       status,
		"replies":      replies,
		"createdAt":    toISO(ct),
		"updatedAt":    toISO(ut),
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
	tx, err := h.store.Pool.Begin(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	defer tx.Rollback(r.Context())

	var inquiryID string
	var category string
	var subject string
	var currentStatus string
	var contactName string
	var contactEmail string
	err = tx.QueryRow(r.Context(), `
		SELECT id, category, subject, status, contact_name, contact_email
		FROM inquiries
		WHERE thread_id=$1
		FOR UPDATE
	`, threadID).Scan(&inquiryID, &category, &subject, &currentStatus, &contactName, &contactEmail)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "Not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	_, err = tx.Exec(r.Context(), `
		INSERT INTO inquiry_replies (id, inquiry_id, thread_id, sender_type, sender_name, sender_email, message, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
	`, replyID, inquiryID, threadID, "user", contactName, contactEmail, message)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	nextStatus := currentStatus
	if currentStatus == "resolved" {
		nextStatus = "pending"
	}
	_, err = tx.Exec(r.Context(), `
		UPDATE inquiries
		SET status = $1,
		    updated_at = NOW()
		WHERE id = $2
	`, nextStatus, inquiryID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	h.notifyInquiryCreated(r.Context(), mail.InquiryNotificationData{
		ID:                inquiryID,
		ThreadID:          threadID,
		ThreadURL:         h.buildContactLink(threadID),
		NotificationLabel: "お問い合わせスレッドへの追加返信",
		Category:          category,
		Subject:           subject,
		Message:           message,
		ContactName:       contactName,
		ContactEmail:      contactEmail,
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
	var inquirySubject string
	var threadID string
	var contactName string
	var contactEmail string
	err = tx.QueryRow(r.Context(), `SELECT status, subject, thread_id, contact_name, contact_email FROM inquiries WHERE id=$1 FOR UPDATE`, id).Scan(&currentStatus, &inquirySubject, &threadID, &contactName, &contactEmail)
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
		INSERT INTO inquiry_replies (id, inquiry_id, thread_id, sender_type, sender_name, sender_email, message, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
	`, reply["id"], id, threadID, "admin", reply["senderName"], user.Email, message)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	_, err = tx.Exec(r.Context(), `
		UPDATE inquiries
		SET status = $1,
		    updated_at = NOW()
		WHERE id=$2
	`, nextStatus, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "Failed to create reply"})
		return
	}

	h.sendInquiryReply(r.Context(), mail.InquiryReplyData{
		Name:         contactName,
		Subject:      inquirySubject,
		Message:      message,
		ThreadURL:    h.buildContactLink(threadID),
		ContactEmail: contactEmail,
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
