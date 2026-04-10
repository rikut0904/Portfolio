package mail

import (
	"embed"
	"fmt"
	"strings"
)

type InquiryNotificationData struct {
	ID                string
	ThreadID          string
	ThreadURL         string
	NotificationLabel string
	Category          string
	Subject           string
	Message           string
	ContactName       string
	ContactEmail      string
}

type InquiryReceiptData struct {
	Name         string
	Category     string
	Subject      string
	Message      string
	ThreadURL    string
	ContactEmail string
}

type InquiryReplyData struct {
	Name         string
	Subject      string
	Message      string
	ThreadURL    string
	ContactEmail string
}

//go:embed templates/**/*.md
var templateFS embed.FS

func BuildInquiryNotification(data InquiryNotificationData) (subject, body string, err error) {
	return renderEmailTemplate(
		"templates/inquiries/admin-notification.md",
		map[string]string{
			"GREETING":           greeting(data.ContactName),
			"INQUIRY_ID":         data.ID,
			"THREAD_ID":          fallbackText(data.ThreadID),
			"THREAD_URL":         fallbackText(data.ThreadURL),
			"NOTIFICATION_LABEL": fallbackText(data.NotificationLabel),
			"CATEGORY":           fallbackText(data.Category),
			"SUBJECT":            fallbackText(data.Subject),
			"CONTACT_NAME":       fallbackText(data.ContactName),
			"CONTACT_EMAIL":      fallbackText(data.ContactEmail),
			"MESSAGE":            fallbackText(data.Message),
		},
		"【Portfolio】お問い合わせ通知",
		"新しいお問い合わせを受け付けました。",
	)
}

func BuildInquiryReceipt(data InquiryReceiptData) (subject, body string, err error) {
	return renderEmailTemplate(
		"templates/inquiries/receipt.md",
		map[string]string{
			"GREETING":      greeting(data.Name),
			"CATEGORY":      fallbackText(data.Category),
			"SUBJECT":       fallbackText(data.Subject),
			"MESSAGE":       fallbackText(data.Message),
			"THREAD_URL":    fallbackText(data.ThreadURL),
			"CONTACT_EMAIL": fallbackText(data.ContactEmail),
		},
		"【Portfolio】お問い合わせを受け付けました",
		"お問い合わせを受け付けました。",
	)
}

func BuildInquiryReply(data InquiryReplyData) (subject, body string, err error) {
	return renderEmailTemplate(
		"templates/inquiries/reply.md",
		map[string]string{
			"GREETING":      greeting(data.Name),
			"SUBJECT":       fallbackText(data.Subject),
			"REPLY_MESSAGE": fallbackText(data.Message),
			"THREAD_URL":    fallbackText(data.ThreadURL),
			"CONTACT_EMAIL": fallbackText(data.ContactEmail),
		},
		"【Portfolio】お問い合わせへの返信",
		"お問い合わせへの返信です。",
	)
}

func BuildInquiryDiscordNotification(data InquiryNotificationData) (body string, err error) {
	_, body, err = renderMarkdownTemplate(
		"templates/discord/inquiry-notification.md",
		map[string]string{
			"INQUIRY_ID":         data.ID,
			"THREAD_ID":          fallbackText(data.ThreadID),
			"THREAD_URL":         fallbackText(data.ThreadURL),
			"NOTIFICATION_LABEL": fallbackText(data.NotificationLabel),
			"CATEGORY":           fallbackText(data.Category),
			"SUBJECT":            fallbackText(data.Subject),
			"CONTACT_NAME":       fallbackText(data.ContactName),
			"CONTACT_EMAIL":      fallbackText(data.ContactEmail),
			"MESSAGE":            fallbackText(data.Message),
		},
		"【お問い合わせ連絡】{{SUBJECT}}",
		"新しいお問い合わせが届きました。",
	)
	return body, err
}

func greeting(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	return name + " 様\n\n"
}

func fallbackText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}

func renderEmailTemplate(path string, values map[string]string, fallbackSubject string, fallbackBody string) (string, string, error) {
	template, err := readTemplate(path)
	if err != nil {
		return "", "", err
	}
	subjectTemplate, bodyTemplate := parseTemplateSections(template)
	if strings.TrimSpace(subjectTemplate) == "" {
		subjectTemplate = fallbackSubject
	}
	if strings.TrimSpace(bodyTemplate) == "" {
		bodyTemplate = fallbackBody
	}

	subject := sanitizeSubject(applyTemplateValues(subjectTemplate, values))
	body := normalizeMarkdownForTextEmail(applyTemplateValues(bodyTemplate, values))
	return subject, body, nil
}

func renderMarkdownTemplate(path string, values map[string]string, fallbackSubject string, fallbackBody string) (string, string, error) {
	template, err := readTemplate(path)
	if err != nil {
		return "", "", err
	}
	subjectTemplate, bodyTemplate := parseTemplateSections(template)
	if strings.TrimSpace(subjectTemplate) == "" {
		subjectTemplate = fallbackSubject
	}
	if strings.TrimSpace(bodyTemplate) == "" {
		bodyTemplate = fallbackBody
	}
	subject := sanitizeSubject(applyTemplateValues(subjectTemplate, values))
	body := strings.TrimSpace(applyTemplateValues(bodyTemplate, values))
	return subject, body, nil
}

func readTemplate(path string) (string, error) {
	data, err := templateFS.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("read template %s: %w", path, err)
	}
	return string(data), nil
}

func parseTemplateSections(template string) (string, string) {
	lines := strings.Split(strings.ReplaceAll(template, "\r\n", "\n"), "\n")
	section := ""
	subjectLines := make([]string, 0)
	bodyLines := make([]string, 0)

	for _, line := range lines {
		if strings.HasPrefix(line, "## ") {
			switch strings.TrimSpace(strings.TrimPrefix(line, "## ")) {
			case "件名":
				section = "subject"
			case "本文":
				section = "body"
			default:
				section = ""
			}
			continue
		}

		switch section {
		case "subject":
			subjectLines = append(subjectLines, line)
		case "body":
			bodyLines = append(bodyLines, line)
		}
	}

	return strings.TrimSpace(strings.Join(subjectLines, "\n")), strings.TrimSpace(strings.Join(bodyLines, "\n"))
}

func applyTemplateValues(template string, values map[string]string) string {
	result := template
	for key, value := range values {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	return result
}

func sanitizeSubject(subject string) string {
	subject = strings.ReplaceAll(subject, "\n", " ")
	subject = strings.ReplaceAll(subject, "\r", " ")
	subject = strings.TrimSpace(subject)
	runes := []rune(subject)
	if len(runes) > 120 {
		subject = string(runes[:120])
	}
	return subject
}

func normalizeMarkdownForTextEmail(body string) string {
	body = strings.ReplaceAll(body, "\r\n", "\n")
	body = strings.ReplaceAll(body, "\r", "\n")
	body = strings.NewReplacer(
		"**", "",
		"__", "",
		"`", "",
	).Replace(body)

	lines := strings.Split(body, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimRight(line, " \t")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}
