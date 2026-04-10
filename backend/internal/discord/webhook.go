package discord

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	webhookURLs []string
	httpClient  *http.Client
}

func New(webhookURLs []string) *Client {
	normalized := normalizeWebhookURLs(webhookURLs)
	if len(normalized) == 0 {
		return nil
	}
	return &Client{
		webhookURLs: normalized,
		httpClient:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Send(ctx context.Context, content string) error {
	if c == nil {
		return nil
	}
	content = truncate(strings.TrimSpace(content), 2000)
	if content == "" {
		return nil
	}

	payload, err := json.Marshal(map[string]string{"content": content})
	if err != nil {
		return errors.New("discord webhook failed")
	}

	var errs []error
	for _, webhookURL := range c.webhookURLs {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewBuffer(payload))
		if err != nil {
			errs = append(errs, errors.New("discord webhook failed"))
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		res, err := c.httpClient.Do(req)
		if err != nil {
			errs = append(errs, errors.New("discord webhook failed"))
			continue
		}
		res.Body.Close()
		if res.StatusCode < 200 || res.StatusCode >= 300 {
			errs = append(errs, errors.New("discord webhook failed"))
		}
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

func normalizeWebhookURLs(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		cleaned := strings.Trim(strings.TrimSpace(value), "\"'")
		if cleaned == "" || !isAllowedWebhookURL(cleaned) {
			continue
		}
		if _, exists := seen[cleaned]; exists {
			continue
		}
		seen[cleaned] = struct{}{}
		result = append(result, cleaned)
	}
	return result
}

func isAllowedWebhookURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed == nil {
		return false
	}
	if !strings.EqualFold(parsed.Scheme, "https") {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(parsed.Hostname())) {
	case "discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com":
	default:
		return false
	}
	return strings.HasPrefix(parsed.EscapedPath(), "/api/webhooks/")
}

func truncate(content string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	runes := []rune(content)
	if len(runes) <= maxRunes {
		return content
	}
	const suffix = "\n...(省略)"
	suffixRunes := []rune(suffix)
	if len(suffixRunes) >= maxRunes {
		return string(runes[:maxRunes])
	}
	return string(runes[:maxRunes-len(suffixRunes)]) + suffix
}
