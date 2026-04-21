package domains

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/henrygd/beszel/internal/entities/domain"
	"github.com/henrygd/beszel/internal/hub/domains/whois"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Scheduler manages periodic domain checks for expiry and SSL
type Scheduler struct {
	app      core.App
	whois    *whois.LookupService
	ticker   *time.Ticker
	stopChan chan struct{}
	wg       sync.WaitGroup
}

// NewScheduler creates a new domain scheduler
func NewScheduler(app core.App) *Scheduler {
	return &Scheduler{
		app:      app,
		whois:    whois.NewLookupService(""), // API key can be configured via env
		stopChan: make(chan struct{}),
	}
}

// Start begins the domain check scheduler
func (s *Scheduler) Start() {
	log.Println("[domain-scheduler] Starting domain scheduler")

	// Check domains daily
	s.ticker = time.NewTicker(24 * time.Hour)

	// Run initial check immediately
	go s.checkDomains()

	// Schedule periodic checks
	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.checkDomains()
			case <-s.stopChan:
				return
			}
		}
	}()
}

// Stop halts the domain scheduler
func (s *Scheduler) Stop() {
	log.Println("[domain-scheduler] Stopping domain scheduler")
	if s.ticker != nil {
		s.ticker.Stop()
	}
	close(s.stopChan)
	s.wg.Wait()
}

// checkDomains checks all active domains for expiry and updates info
func (s *Scheduler) checkDomains() {
	log.Println("[domain-scheduler] Checking domains")

	// Find all active domains
	records, err := s.app.FindAllRecords("domains",
		dbx.NewExp("active = true"),
	)
	if err != nil {
		log.Printf("[domain-scheduler] Failed to fetch domains: %v", err)
		return
	}

	for _, record := range records {
		s.wg.Add(1)
		go func(r *core.Record) {
			defer s.wg.Done()
			s.checkDomain(r)
		}(record)
	}
}

// checkDomain checks a single domain
func (s *Scheduler) checkDomain(record *core.Record) {
	domainName := record.GetString("domain_name")
	userID := record.GetString("user")

	log.Printf("[domain-scheduler] Checking domain: %s", domainName)

	// Perform WHOIS and DNS lookup
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	newData, err := s.whois.LookupDomain(ctx, domainName)
	if err != nil {
		log.Printf("[domain-scheduler] Failed to lookup %s: %v", domainName, err)
		return
	}

	// Track changes
	history := s.trackChanges(record, newData)

	// Update record
	record.Set("expiry_date", newData.ExpiryDate)
	record.Set("creation_date", newData.CreationDate)
	record.Set("updated_date", newData.UpdatedDate)
	record.Set("registrar_name", newData.RegistrarName)
	record.Set("registrar_id", newData.RegistrarID)
	record.Set("registrar_url", newData.RegistrarURL)
	record.Set("dnssec", newData.DNSSEC)
	record.Set("name_servers", newData.NameServers)
	record.Set("mx_records", newData.MXRecords)
	record.Set("txt_records", newData.TXTRecords)
	record.Set("ipv4_addresses", newData.IPv4Addresses)
	record.Set("ipv6_addresses", newData.IPv6Addresses)
	record.Set("ssl_issuer", newData.SSLIssuer)
	record.Set("ssl_valid_to", newData.SSLValidTo)
	record.Set("host_country", newData.HostCountry)
	record.Set("host_isp", newData.HostISP)
	record.Set("last_checked", time.Now())

	// Update status
	status := domain.DomainStatusActive
	if newData.ExpiryDate != nil {
		if newData.IsExpired() {
			status = domain.DomainStatusExpired
		} else if newData.IsExpiring() {
			status = domain.DomainStatusExpiring
		}
	} else {
		status = domain.DomainStatusUnknown
	}
	record.Set("status", status)

	if err := s.app.Save(record); err != nil {
		log.Printf("[domain-scheduler] Failed to update %s: %v", domainName, err)
		return
	}

	// Save history entries
	for _, h := range history {
		s.saveHistory(h, record.Id, userID)
	}

	// Trigger notifications for expiring domains
	if status == domain.DomainStatusExpiring || status == domain.DomainStatusExpired {
		s.triggerNotification(record, status)
	}

	// Check SSL expiry
	if newData.SSLAlertEnabled && newData.SSLValidTo != nil {
		sslDays := newData.SSLDaysUntilExpiry()
		if sslDays <= newData.AlertDaysBefore {
			s.triggerSSLNotification(record, sslDays)
		}
	}

	log.Printf("[domain-scheduler] Updated domain: %s (status: %s)", domainName, status)
}

// trackChanges compares old and new data and returns history entries
func (s *Scheduler) trackChanges(oldRecord *core.Record, newData *domain.Domain) []domain.DomainHistory {
	var history []domain.DomainHistory
	now := time.Now()

	// Check expiry date change
	oldExpiry := oldRecord.GetDateTime("expiry_date").Time()
	if newData.ExpiryDate != nil && !oldExpiry.IsZero() && !newData.ExpiryDate.Equal(oldExpiry) {
		history = append(history, domain.DomainHistory{
			ChangeType: domain.ChangeTypeExpiry,
			FieldName:  "expiry_date",
			OldValue:   oldExpiry.Format("2006-01-02"),
			NewValue:   newData.ExpiryDate.Format("2006-01-02"),
			CreatedAt:  now,
		})
	}

	// Check registrar change
	oldRegistrar := oldRecord.GetString("registrar_name")
	if newData.RegistrarName != "" && newData.RegistrarName != oldRegistrar {
		history = append(history, domain.DomainHistory{
			ChangeType: domain.ChangeTypeRegistrar,
			FieldName:  "registrar_name",
			OldValue:   oldRegistrar,
			NewValue:   newData.RegistrarName,
			CreatedAt:  now,
		})
	}

	// Check status change
	oldStatus := oldRecord.GetString("status")
	newStatus := newData.GetStatus()
	if newStatus != oldStatus {
		history = append(history, domain.DomainHistory{
			ChangeType: domain.ChangeTypeStatus,
			FieldName:  "status",
			OldValue:   oldStatus,
			NewValue:   newStatus,
			CreatedAt:  now,
		})
	}

	// Check SSL expiry change
	oldSSLExpiry := oldRecord.GetDateTime("ssl_valid_to").Time()
	if newData.SSLValidTo != nil && !oldSSLExpiry.IsZero() && !newData.SSLValidTo.Equal(oldSSLExpiry) {
		history = append(history, domain.DomainHistory{
			ChangeType: domain.ChangeTypeSSL,
			FieldName:  "ssl_valid_to",
			OldValue:   oldSSLExpiry.Format("2006-01-02"),
			NewValue:   newData.SSLValidTo.Format("2006-01-02"),
			CreatedAt:  now,
		})
	}

	return history
}

// saveHistory saves a history entry to the database
func (s *Scheduler) saveHistory(h domain.DomainHistory, domainID, userID string) {
	collection, err := s.app.FindCollectionByNameOrId("domain_history")
	if err != nil {
		return
	}

	record := core.NewRecord(collection)
	record.Set("domain", domainID)
	record.Set("change_type", h.ChangeType)
	record.Set("field_name", h.FieldName)
	record.Set("old_value", h.OldValue)
	record.Set("new_value", h.NewValue)
	record.Set("user", userID)
	record.Set("created_at", h.CreatedAt)

	if err := s.app.Save(record); err != nil {
		log.Printf("[domain-scheduler] Failed to save history: %v", err)
	}
}

// triggerNotification sends notification for domain events
func (s *Scheduler) triggerNotification(record *core.Record, status string) {
	domainName := record.GetString("domain_name")
	daysUntil := 0

	if expiry := record.GetDateTime("expiry_date"); !expiry.IsZero() {
		daysUntil = int(time.Until(expiry.Time()).Hours() / 24)
	}

	var title, body string
	switch status {
	case domain.DomainStatusExpired:
		title = fmt.Sprintf("Domain Expired: %s", domainName)
		body = fmt.Sprintf("The domain %s has expired.", domainName)
	case domain.DomainStatusExpiring:
		title = fmt.Sprintf("Domain Expiring Soon: %s", domainName)
		body = fmt.Sprintf("The domain %s expires in %d days.", domainName, daysUntil)
	}

	log.Printf("[domain-scheduler] %s: %s", title, body)

	// TODO: Integrate with notification system
	// This would call the notification dispatcher similar to monitor alerts
}

// triggerSSLNotification sends notification for SSL expiry
func (s *Scheduler) triggerSSLNotification(record *core.Record, daysUntil int) {
	domainName := record.GetString("domain_name")

	title := fmt.Sprintf("SSL Certificate Expiring: %s", domainName)
	body := fmt.Sprintf("The SSL certificate for %s expires in %d days.", domainName, daysUntil)

	log.Printf("[domain-scheduler] %s: %s", title, body)

	// TODO: Integrate with notification system
}

// RefreshDomain manually refreshes a single domain
func (s *Scheduler) RefreshDomain(domainID string) error {
	record, err := s.app.FindRecordById("domains", domainID)
	if err != nil {
		return err
	}

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		s.checkDomain(record)
	}()

	return nil
}

// CheckAllDomains manually triggers a check of all active domains
func (s *Scheduler) CheckAllDomains() {
	s.checkDomains()
}
