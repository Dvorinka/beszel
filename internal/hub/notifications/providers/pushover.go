package providers

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/henrygd/beszel/internal/entities/notification"
)

type PushoverProvider struct {
	settings notification.PushoverSettings
}

func NewPushoverProvider(settings notification.PushoverSettings) *PushoverProvider {
	return &PushoverProvider{settings: settings}
}

func (p *PushoverProvider) Validate() error {
	if p.settings.AppToken == "" {
		return fmt.Errorf("Pushover app token is required")
	}
	if p.settings.UserKey == "" {
		return fmt.Errorf("Pushover user key is required")
	}
	return nil
}

func (p *PushoverProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	data := url.Values{}
	data.Set("token", p.settings.AppToken)
	data.Set("user", p.settings.UserKey)
	data.Set("title", msg.Title)
	data.Set("message", msg.Body)
	data.Set("priority", fmt.Sprintf("%d", p.settings.Priority))

	if p.settings.Device != "" {
		data.Set("device", p.settings.Device)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.PostForm("https://api.pushover.net/1/messages.json", data)
	if err != nil {
		return fmt.Errorf("pushover API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("pushover API returned status %d", resp.StatusCode)
	}

	return nil
}
