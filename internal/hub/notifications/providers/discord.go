package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/henrygd/beszel/internal/entities/notification"
)

type DiscordProvider struct {
	settings notification.DiscordSettings
}

func NewDiscordProvider(settings notification.DiscordSettings) *DiscordProvider {
	return &DiscordProvider{settings: settings}
}

func (p *DiscordProvider) Validate() error {
	if p.settings.WebhookURL == "" {
		return fmt.Errorf("Discord webhook URL is required")
	}
	return nil
}

func (p *DiscordProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	color := 0x00ff00 // Green for UP
	if msg.Status == "DOWN" {
		color = 0xff0000 // Red for DOWN
	}

	embed := map[string]interface{}{
		"title":       msg.Title,
		"description": msg.Body,
		"color":       color,
		"timestamp":   msg.Timestamp.Format(time.RFC3339),
		"fields": []map[string]interface{}{
			{
				"name":   "Monitor",
				"value":  msg.MonitorName,
				"inline": true,
			},
			{
				"name":   "Status",
				"value":  msg.Status,
				"inline": true,
			},
		},
	}

	if msg.MonitorURL != "" {
		embed["fields"] = append(embed["fields"].([]map[string]interface{}), map[string]interface{}{
			"name":   "URL",
			"value":  msg.MonitorURL,
			"inline": false,
		})
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{embed},
	}

	if p.settings.Username != "" {
		payload["username"] = p.settings.Username
	}
	if p.settings.AvatarURL != "" {
		payload["avatar_url"] = p.settings.AvatarURL
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
		return fmt.Errorf("discord webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("discord webhook returned status %d", resp.StatusCode)
	}

	return nil
}
