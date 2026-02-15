package mail

import (
	"context"
	"fmt"
	"strings"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type Config struct {
	From             string
	Region           string
	AccessKeyID      string
	SecretAccessKey  string
	ConfigurationSet string
	RetryMax         int
	RetryInterval    time.Duration
}

type Client struct {
	from             string
	configurationSet string
	ses              *sesv2.Client
	retryMax         int
	retryInterval    time.Duration
}

func New(ctx context.Context, cfg Config) (*Client, error) {
	from := strings.TrimSpace(cfg.From)
	if from == "" {
		return nil, nil
	}
	region := strings.TrimSpace(cfg.Region)
	if region == "" {
		return nil, fmt.Errorf("AWS_REGION is required when MAIL_FROM is set")
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(region)}
	if strings.TrimSpace(cfg.AccessKeyID) != "" && strings.TrimSpace(cfg.SecretAccessKey) != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			strings.TrimSpace(cfg.AccessKeyID),
			strings.TrimSpace(cfg.SecretAccessKey),
			"",
		)))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	retryMax := cfg.RetryMax
	if retryMax < 1 {
		retryMax = 1
	}
	retryInterval := cfg.RetryInterval
	if retryInterval <= 0 {
		retryInterval = 500 * time.Millisecond
	}

	return &Client{
		from:             from,
		configurationSet: strings.TrimSpace(cfg.ConfigurationSet),
		ses:              sesv2.NewFromConfig(awsCfg),
		retryMax:         retryMax,
		retryInterval:    retryInterval,
	}, nil
}

func (c *Client) SendText(ctx context.Context, to []string, subject, body string) error {
	if c == nil {
		return nil
	}
	recipients := make([]string, 0, len(to))
	for _, t := range to {
		v := strings.TrimSpace(t)
		if v == "" {
			continue
		}
		recipients = append(recipients, v)
	}
	if len(recipients) == 0 {
		return nil
	}

	input := &sesv2.SendEmailInput{
		FromEmailAddress: &c.from,
		Destination: &types.Destination{
			ToAddresses: recipients,
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{Data: &subject},
				Body: &types.Body{
					Text: &types.Content{Data: &body},
				},
			},
		},
	}
	if c.configurationSet != "" {
		input.ConfigurationSetName = &c.configurationSet
	}

	var lastErr error
	for attempt := 1; attempt <= c.retryMax; attempt++ {
		_, err := c.ses.SendEmail(ctx, input)
		if err == nil {
			return nil
		}
		lastErr = err
		if attempt == c.retryMax {
			break
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("ses send email canceled: %w", ctx.Err())
		case <-time.After(c.retryInterval):
		}
	}

	return fmt.Errorf("ses send email after %d attempts: %w", c.retryMax, lastErr)
}
