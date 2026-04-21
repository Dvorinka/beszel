package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/henrygd/beszel/internal/entities/notification"
)

type SlackProvider struct {
	settings notification.SlackSettings
}

func NewSlackProvider(settings notification.SlackSettings) *SlackProvider {
	return &SlackProvider{settings: settings}
}

func (p *SlackProvider) Validate() error {
	if p.settings.WebhookURL == "" {
		return fmt.Errorf("Slack webhook URL is required")
	}
	return nil
}

func (p *SlackProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	color := "good" // Green for UP
	if msg.Status == "DOWN" {
		color = "danger" // Red for DOWN
	}

	fields := []map[string]string{
		{
			"title": "Monitor",
			"value": msg.MonitorName,
			"short": "true",
		},
		{
			"title": "Status",
			"value": msg.Status,
			"short": "true",
		},
	}

	if msg.MonitorURL != "" {
		fields = append(fields, map[string]string{
			"title": "URL",
			"value": msg.MonitorURL,
			"short": "false",
		})
	}

	payload := map[string]interface{}{
		"attachments": []map[string]interface{}{
			{
				"color":     color,
				"title":     msg.Title,
				"text":      msg.Body,
				"fields":    fields,
				"timestamp": msg.Timestamp.Unix(),
			},
		},
	}

	if p.settings.Username != "" {
		payload["username"] = p.settings.Username
	}
	if p.settings.Channel != "" {
		payload["channel"] = p.settings.Channel
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", p.settings.WebhookURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("slack webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("slack webhook returned status %d", resp.StatusCode)
	}

	return nil
}
