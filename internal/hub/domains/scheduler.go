package domains

import (
	"context"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/henrygd/beszel/internal/entities/domain"
	"github.com/henrygd/beszel/internal/hub/domains/whois"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// AlertCallback is a function that sends alerts
type AlertCallback func(userID, title, message, link, linkText string)

// Scheduler manages periodic domain checks for expiry and SSL
type Scheduler struct {
	app           core.App
	whois         *whois.LookupService
	ticker        *time.Ticker
	stopChan      chan struct{}
	wg            sync.WaitGroup
	alertCallback AlertCallback
	limit         chan struct{}
}

// NewScheduler creates a new domain scheduler
func NewScheduler(app core.App) *Scheduler {
	return &Scheduler{
		app:      app,
		whois:    whois.NewLookupService(""), // API key can be configured via env
		stopChan: make(chan struct{}),
		limit:    make(chan struct{}, 4),
	}
}

// SetAlertCallback sets the callback function for sending alerts
func (s *Scheduler) SetAlertCallback(callback AlertCallback) {
	s.alertCallback = callback
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
			s.limit <- struct{}{}
			defer func() { <-s.limit }()
			s.checkDomain(r)
		}(record)
	}
}

// checkDomain checks a single domain
func (s *Scheduler) checkDomain(record *core.Record) error {
	domainName := record.GetString("domain_name")

	userID := record.GetString("user")

	log.Printf("[domain-scheduler] Checking domain: %s for user %s", domainName, userID)

	// Perform WHOIS and DNS lookup
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	newData, err := s.whois.LookupDomain(ctx, domainName)
	if err != nil {
		log.Printf("[domain-scheduler] WHOIS lookup failed for %s: %v", domainName, err)
		// Don't return early - try DNS resolution independently to verify domain is alive
		newData = &domain.Domain{DomainName: domainName}
	}

	// Independent DNS resolution check: if WHOIS failed, try to resolve the domain directly
	if err != nil {
		ips, lookupErr := net.LookupHost(domainName)
		if lookupErr == nil && len(ips) > 0 {
			newData.IPv4Addresses = []string{}
			newData.IPv6Addresses = []string{}
			for _, ip := range ips {
				if strings.Contains(ip, ":") {
					newData.IPv6Addresses = append(newData.IPv6Addresses, ip)
				} else {
					newData.IPv4Addresses = append(newData.IPv4Addresses, ip)
				}
			}
			log.Printf("[domain-scheduler] DNS resolution succeeded for %s despite WHOIS failure", domainName)
		}
	}

	oldRecord := record.Fresh()

	// Update record (only overwrite if new data is present to preserve valid data on partial lookups)
	if newData.ExpiryDate != nil {
		record.Set("expiry_date", *newData.ExpiryDate)
	}
	if newData.CreationDate != nil {
		record.Set("creation_date", *newData.CreationDate)
	}
	if newData.UpdatedDate != nil {
		record.Set("updated_date", *newData.UpdatedDate)
	}
	if newData.RegistrarName != "" {
		record.Set("registrar_name", newData.RegistrarName)
	}
	if newData.RegistrarID != "" {
		record.Set("registrar_id", newData.RegistrarID)
	}
	if newData.RegistrarURL != "" {
		record.Set("registrar_url", newData.RegistrarURL)
	}
	if newData.RegistryDomainID != "" {
		record.Set("registry_domain_id", newData.RegistryDomainID)
	}
	record.Set("dnssec", newData.DNSSEC)
	if len(newData.NameServers) > 0 {
		record.Set("name_servers", newData.NameServers)
	}
	if len(newData.MXRecords) > 0 {
		record.Set("mx_records", newData.MXRecords)
	}
	if len(newData.TXTRecords) > 0 {
		record.Set("txt_records", newData.TXTRecords)
	}
	if len(newData.IPv4Addresses) > 0 {
		record.Set("ipv4_addresses", newData.IPv4Addresses)
	}
	if len(newData.IPv6Addresses) > 0 {
		record.Set("ipv6_addresses", newData.IPv6Addresses)
	}

	// Update SSL info - only overwrite if new data is present to avoid losing valid SSL data on lookup failure
	if newData.SSLIssuer != "" {
		record.Set("ssl_issuer", newData.SSLIssuer)
	}
	if newData.SSLIssuerCountry != "" {
		record.Set("ssl_issuer_country", newData.SSLIssuerCountry)
	}
	if newData.SSLSubject != "" {
		record.Set("ssl_subject", newData.SSLSubject)
	}
	if newData.SSLValidFrom != nil && !newData.SSLValidFrom.IsZero() {
		record.Set("ssl_valid_from", *newData.SSLValidFrom)
	}
	if newData.SSLValidTo != nil && !newData.SSLValidTo.IsZero() {
		record.Set("ssl_valid_to", *newData.SSLValidTo)
	}
	if newData.SSLFingerprint != "" {
		record.Set("ssl_fingerprint", newData.SSLFingerprint)
	}
	if newData.SSLKeySize > 0 {
		record.Set("ssl_key_size", newData.SSLKeySize)
	}
	if newData.SSLSignatureAlgo != "" {
		record.Set("ssl_signature_algo", newData.SSLSignatureAlgo)
	}
	if newData.HostCountry != "" {
		record.Set("host_country", newData.HostCountry)
	}
	if newData.HostRegion != "" {
		record.Set("host_region", newData.HostRegion)
	}
	if newData.HostCity != "" {
		record.Set("host_city", newData.HostCity)
	}
	if newData.HostISP != "" {
		record.Set("host_isp", newData.HostISP)
	}
	if newData.HostOrg != "" {
		record.Set("host_org", newData.HostOrg)
	}
	if newData.HostAS != "" {
		record.Set("host_as", newData.HostAS)
	}
	if newData.HostLat != 0 {
		record.Set("host_lat", newData.HostLat)
	}
	if newData.HostLon != 0 {
		record.Set("host_lon", newData.HostLon)
	}
	if newData.RegistrantName != "" {
		record.Set("registrant_name", newData.RegistrantName)
	}
	if newData.RegistrantOrg != "" {
		record.Set("registrant_org", newData.RegistrantOrg)
	}
	if newData.RegistrantStreet != "" {
		record.Set("registrant_street", newData.RegistrantStreet)
	}
	if newData.RegistrantCity != "" {
		record.Set("registrant_city", newData.RegistrantCity)
	}
	if newData.RegistrantState != "" {
		record.Set("registrant_state", newData.RegistrantState)
	}
	if newData.RegistrantCountry != "" {
		record.Set("registrant_country", newData.RegistrantCountry)
	}
	if newData.RegistrantPostal != "" {
		record.Set("registrant_postal", newData.RegistrantPostal)
	}
	if newData.AbuseEmail != "" {
		record.Set("abuse_email", newData.AbuseEmail)
	}
	if newData.AbusePhone != "" {
		record.Set("abuse_phone", newData.AbusePhone)
	}
	record.Set("last_checked", time.Now())

	// Update status - fallback to existing record expiry if new lookup didn't return one
	status := record.GetString("status")
	if status == "" {
		status = domain.DomainStatusActive
	}

	expiryDate := newData.ExpiryDate
	if expiryDate == nil {
		existingExpiry := record.GetDateTime("expiry_date")
		if !existingExpiry.IsZero() {
			t := existingExpiry.Time()
			expiryDate = &t
		}
	}

	if expiryDate != nil {
		daysUntil := int(time.Until(*expiryDate).Hours() / 24)
		if daysUntil < 0 {
			status = domain.DomainStatusExpired
		} else if daysUntil <= 30 {
			status = domain.DomainStatusExpiring
		} else {
			status = domain.DomainStatusActive
		}
	} else {
		// No expiry date from WHOIS - determine status from DNS resolution.
		hasDNS := len(newData.IPv4Addresses) > 0 || len(newData.IPv6Addresses) > 0 || len(newData.NameServers) > 0
		if hasDNS {
			// DNS resolves means the domain is active and functioning.
			// If we previously had a valid status (active/expiring), keep it.
			// If status was unknown or empty, upgrade to active since DNS proves the domain exists.
			if status == domain.DomainStatusUnknown || status == "" {
				status = domain.DomainStatusActive
			}
			// Otherwise keep the existing valid status (active/expiring)
		} else {
			// No DNS resolution and no expiry date - we can't determine the domain's state
			status = domain.DomainStatusUnknown
		}
	}
	record.Set("status", status)

	history := s.trackChanges(oldRecord, newData, status)

	if err := s.app.Save(record); err != nil {
		log.Printf("[domain-scheduler] Failed to update %s: %v", domainName, err)
		return err
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

	// Discover and save subdomains
	s.discoverSubdomains(record, domainName, userID)

	log.Printf("[domain-scheduler] Updated domain: %s (status: %s)", domainName, status)
	return nil
}

// discoverSubdomains discovers and saves subdomains for a domain
func (s *Scheduler) discoverSubdomains(record *core.Record, domainName, userID string) {
	// Common subdomains to check
	commonSubdomains := []string{
		"www", "mail", "ftp", "api", "blog", "shop", "admin", "app", "cdn",
		"static", "dev", "staging", "test", "demo", "docs", "support", "help",
		"status", "monitor", "grafana", "prometheus", "db", "cache", "redis",
		"queue", "worker", "backup", "media", "assets", "download", "upload",
		"git", "gitlab", "github", "jenkins", "ci", "cd", "vpn", "ssh",
		"smtp", "imap", "mx", "webmail", "email", "analytics", "stats",
		"search", "login", "auth", "sso", "oauth", "account", "user",
	}

	// Get existing subdomains to avoid duplicates
	existing, _ := s.app.FindAllRecords("subdomains",
		dbx.NewExp("domain = {:domain}", dbx.Params{"domain": record.Id}),
	)
	existingMap := make(map[string]bool)
	for _, sub := range existing {
		existingMap[sub.GetString("subdomain_name")] = true
	}

	collection, err := s.app.FindCollectionByNameOrId("subdomains")
	if err != nil {
		return
	}

	for _, sub := range commonSubdomains {
		if existingMap[sub] {
			continue
		}

		fullDomain := sub + "." + domainName
		ips, err := net.LookupHost(fullDomain)
		if err != nil || len(ips) == 0 {
			continue
		}

		// Found a valid subdomain
		subRecord := core.NewRecord(collection)
		subRecord.Set("domain", record.Id)
		subRecord.Set("subdomain_name", sub)
		subRecord.Set("status", "active")
		subRecord.Set("ip_addresses", strings.Join(ips, ","))
		subRecord.Set("last_checked", time.Now())
		subRecord.Set("user", userID)

		if err := s.app.Save(subRecord); err != nil {
			log.Printf("[domain-scheduler] Failed to save subdomain %s: %v", fullDomain, err)
		} else {
			log.Printf("[domain-scheduler] Discovered subdomain: %s", fullDomain)
		}
	}
}

// trackChanges compares old and new data and returns history entries
func (s *Scheduler) trackChanges(oldRecord *core.Record, newData *domain.Domain, finalStatus string) []domain.DomainHistory {
	var history []domain.DomainHistory
	now := time.Now()
	hasPreviousCheck := !oldRecord.GetDateTime("last_checked").IsZero()

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
	if hasPreviousCheck && finalStatus != oldStatus {
		history = append(history, domain.DomainHistory{
			ChangeType: domain.ChangeTypeStatus,
			FieldName:  "status",
			OldValue:   oldStatus,
			NewValue:   finalStatus,
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
	userID := record.GetString("user")
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

	// Send notification via alert callback if available
	if s.alertCallback != nil && userID != "" {
		link := fmt.Sprintf("/domain/%s", record.Id)
		linkText := "View Domain"
		s.alertCallback(userID, title, body, link, linkText)
	}
}

// triggerSSLNotification sends notification for SSL expiry
func (s *Scheduler) triggerSSLNotification(record *core.Record, daysUntil int) {
	domainName := record.GetString("domain_name")
	userID := record.GetString("user")

	title := fmt.Sprintf("SSL Certificate Expiring: %s", domainName)
	body := fmt.Sprintf("The SSL certificate for %s expires in %d days.", domainName, daysUntil)

	log.Printf("[domain-scheduler] %s: %s", title, body)

	// Send notification via alert callback if available
	if s.alertCallback != nil && userID != "" {
		link := fmt.Sprintf("/domain/%s", record.Id)
		linkText := "View Domain"
		s.alertCallback(userID, title, body, link, linkText)
	}
}

// RefreshDomain manually refreshes a single domain
func (s *Scheduler) RefreshDomain(domainID string) error {
	record, err := s.app.FindRecordById("domains", domainID)
	if err != nil {
		return err
	}

	s.limit <- struct{}{}
	defer func() { <-s.limit }()
	return s.checkDomain(record)
}

// CheckAllDomains manually triggers a check of all active domains
func (s *Scheduler) CheckAllDomains() {
	s.checkDomains()
}
