package mail

import (
	"bytes"
	"fmt"
	"text/template"
)

type InquiryNotificationData struct {
	ID           string
	Category     string
	Subject      string
	Message      string
	ContactName  string
	ContactEmail string
}

type InquiryAutoReplyData struct {
	Subject string
}

type InquiryReplyData struct {
	Message string
}

var (
	inquiryNotificationSubjectTpl = template.Must(template.New("inquiry_notification_subject").Parse(`[Portfolio] New Inquiry: {{ .Subject }}`))
	inquiryNotificationBodyTpl    = template.Must(template.New("inquiry_notification_body").Parse(`New inquiry received

ID: {{ .ID }}
Category: {{ .Category }}
Subject: {{ .Subject }}
Name: {{ .ContactName }}
Email: {{ .ContactEmail }}

Message:
{{ .Message }}
`))

	inquiryAutoReplySubjectTpl = template.Must(template.New("inquiry_auto_reply_subject").Parse(`[Portfolio] お問い合わせを受け付けました`))
	inquiryAutoReplyBodyTpl    = template.Must(template.New("inquiry_auto_reply_body").Parse(`お問い合わせありがとうございます。

件名: {{ .Subject }}

内容を確認し、追ってご連絡いたします。
`))

	inquiryReplySubjectTpl = template.Must(template.New("inquiry_reply_subject").Parse(`[Portfolio] お問い合わせへの返信`))
	inquiryReplyBodyTpl    = template.Must(template.New("inquiry_reply_body").Parse(`お問い合わせへの返信です。

{{ .Message }}
`))
)

func renderTemplate(t *template.Template, data any) (string, error) {
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func BuildInquiryNotification(data InquiryNotificationData) (subject, body string, err error) {
	subject, err = renderTemplate(inquiryNotificationSubjectTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render notification subject: %w", err)
	}
	body, err = renderTemplate(inquiryNotificationBodyTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render notification body: %w", err)
	}
	return subject, body, nil
}

func BuildInquiryAutoReply(data InquiryAutoReplyData) (subject, body string, err error) {
	subject, err = renderTemplate(inquiryAutoReplySubjectTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render auto-reply subject: %w", err)
	}
	body, err = renderTemplate(inquiryAutoReplyBodyTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render auto-reply body: %w", err)
	}
	return subject, body, nil
}

func BuildInquiryReply(data InquiryReplyData) (subject, body string, err error) {
	subject, err = renderTemplate(inquiryReplySubjectTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render reply subject: %w", err)
	}
	body, err = renderTemplate(inquiryReplyBodyTpl, data)
	if err != nil {
		return "", "", fmt.Errorf("render reply body: %w", err)
	}
	return subject, body, nil
}
