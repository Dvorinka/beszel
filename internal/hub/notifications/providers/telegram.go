package providers

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/henrygd/beszel/internal/entities/notification"
)

type TelegramProvider struct {
	settings notification.TelegramSettings
}

func NewTelegramProvider(settings notification.TelegramSettings) *TelegramProvider {
	return &TelegramProvider{settings: settings}
}

func (p *TelegramProvider) Validate() error {
	if p.settings.BotToken == "" {
		return fmt.Errorf("Telegram bot token is required")
	}
	if p.settings.ChatID == "" {
		return fmt.Errorf("Telegram chat ID is required")
	}
	return nil
}

func (p *TelegramProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	icon := "✅"
	if msg.Status == "DOWN" {
		icon = "❌"
	}

	text := fmt.Sprintf("%s *%s*\n\n"+
		"*Monitor:* %s\n"+
		"*Status:* %s\n"+
		"*Time:* %s",
		icon,
		msg.Title,
		msg.MonitorName,
		msg.Status,
		msg.Timestamp.Format("2006-01-02 15:04:05"),
	)

	if msg.MonitorURL != "" {
		text += fmt.Sprintf("\n*URL:* %s", msg.MonitorURL)
	}

	if msg.Ping > 0 {
		text += fmt.Sprintf("\n*Response Time:* %dms", msg.Ping)
	}

	if msg.Message != "" {
		text += fmt.Sprintf("\n\n*Message:* %s", msg.Message)
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", p.settings.BotToken)

	data := url.Values{}
	data.Set("chat_id", p.settings.ChatID)
	data.Set("text", text)
	data.Set("parse_mode", "Markdown")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.PostForm(apiURL, data)
	if err != nil {
		return fmt.Errorf("telegram API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("telegram API returned status %d", resp.StatusCode)
	}

	return nil
}
