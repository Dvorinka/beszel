package providers

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/henrygd/beszel/internal/entities/notification"
)

// EmailProvider implements email notifications via SMTP
type EmailProvider struct {
	settings notification.EmailSettings
}

// NewEmailProvider creates a new email provider
func NewEmailProvider(settings notification.EmailSettings) *EmailProvider {
	return &EmailProvider{settings: settings}
}

// Validate checks if the email settings are valid
func (p *EmailProvider) Validate() error {
	if p.settings.SMTPHost == "" {
		return fmt.Errorf("SMTP host is required")
	}
	if p.settings.SMTPPort == 0 {
		return fmt.Errorf("SMTP port is required")
	}
	if p.settings.FromEmail == "" {
		return fmt.Errorf("from email is required")
	}
	if p.settings.ToEmail == "" {
		return fmt.Errorf("to email is required")
	}
	return nil
}

// Send sends an email notification
func (p *EmailProvider) Send(msg *notification.NotificationMessage) error {
	if err := p.Validate(); err != nil {
		return err
	}

	subject := fmt.Sprintf("[%s] %s - %s", msg.Status, msg.MonitorName, msg.Title)
	body := p.formatBody(msg)

	// Build email content
	email := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		p.settings.FromEmail,
		p.settings.ToEmail,
		subject,
		body,
	)

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%d", p.settings.SMTPHost, p.settings.SMTPPort)

	var auth smtp.Auth
	if p.settings.SMTPUser != "" {
		auth = smtp.PlainAuth("", p.settings.SMTPUser, p.settings.SMTPPassword, p.settings.SMTPHost)
	}

	// Send email
	if p.settings.UseTLS {
		return p.sendTLS(addr, auth, email)
	}

	return smtp.SendMail(
		addr,
		auth,
		p.settings.FromEmail,
		[]string{p.settings.ToEmail},
		[]byte(email),
	)
}

// sendTLS sends email using TLS
func (p *EmailProvider) sendTLS(addr string, auth smtp.Auth, email string) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: p.settings.SMTPHost})
	if err != nil {
		return fmt.Errorf("failed to connect via TLS: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, p.settings.SMTPHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	if err := client.Mail(p.settings.FromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}
	if err := client.Rcpt(p.settings.ToEmail); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = w.Write([]byte(email))
	if err != nil {
		w.Close()
		return fmt.Errorf("failed to write email: %w", err)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("failed to close data writer: %w", err)
	}

	return client.Quit()
}

// formatBody formats the email body
func (p *EmailProvider) formatBody(msg *notification.NotificationMessage) string {
	var b strings.Builder

	b.WriteString(fmt.Sprintf("Monitor: %s\n", msg.MonitorName))
	if msg.MonitorURL != "" {
		b.WriteString(fmt.Sprintf("URL: %s\n", msg.MonitorURL))
	}
	b.WriteString(fmt.Sprintf("Status: %s\n", msg.Status))
	b.WriteString(fmt.Sprintf("Time: %s\n", msg.Timestamp.Format("2006-01-02 15:04:05")))

	if msg.Ping > 0 {
		b.WriteString(fmt.Sprintf("Response Time: %dms\n", msg.Ping))
	}

	if msg.Message != "" {
		b.WriteString(fmt.Sprintf("\nMessage: %s\n", msg.Message))
	}

	b.WriteString(fmt.Sprintf("\n%s\n", msg.Body))

	return b.String()
}
