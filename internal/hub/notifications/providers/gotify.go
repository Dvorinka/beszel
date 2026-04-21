package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/henrygd/beszel/internal/entities/notification"
)

type GotifyProvider struct {
	settings notification.GotifySettings
}

func NewGotifyProvider(settings notification.GotifySettings) *GotifyProvider {
	return &GotifyProvider{settings: settings}
}

func (p *GotifyProvider) Validate() error {
	if p.settings.ServerURL == "" {
		return fmt.Errorf("Gotify server URL is required")
	}
	if p.settings.AppToken == "" {
		return fmt.Errorf("Gotify app token is required")
	}
	return nil
}

func (p *GotifyProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	payload := map[string]interface{}{
		"title":    msg.Title,
		"message":  msg.Body,
		"priority": p.settings.Priority,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	apiURL := fmt.Sprintf("%s/message?token=%s", p.settings.ServerURL, p.settings.AppToken)

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gotify request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("gotify returned status %d", resp.StatusCode)
	}

	return nil
}
