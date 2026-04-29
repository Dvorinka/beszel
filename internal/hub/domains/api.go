package domains

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/henrygd/beszel/internal/entities/domain"
	"github.com/henrygd/beszel/internal/hub/domains/whois"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// APIHandler handles domain API requests
type APIHandler struct {
	app       core.App
	scheduler *Scheduler
}

// NewAPIHandler creates a new domain API handler
func NewAPIHandler(app core.App, scheduler *Scheduler) *APIHandler {
	return &APIHandler{
		app:       app,
		scheduler: scheduler,
	}
}

// RegisterRoutes registers domain API routes
func (h *APIHandler) RegisterRoutes(se *core.ServeEvent) {
	api := se.Router.Group("/api/beszel/domains")
	api.Bind(apis.RequireAuth())

	api.GET("/", h.listDomains)
	api.POST("/", h.createDomain)
	api.POST("/lookup", h.lookupDomain)
	api.GET("/{id}", h.getDomain)
	api.PATCH("/{id}", h.updateDomain)
	api.DELETE("/{id}", h.deleteDomain)
	api.POST("/{id}/refresh", h.refreshDomain)
	api.GET("/{id}/history", h.getDomainHistory)
	api.GET("/{id}/stats", h.getDomainStats)
	api.POST("/{id}/pause", h.pauseDomain)
	api.POST("/{id}/resume", h.resumeDomain)
}

// listDomains lists all domains for the authenticated user
func (h *APIHandler) listDomains(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	records, err := h.app.FindAllRecords("domains",
		dbx.NewExp("user = {:user}", dbx.Params{"user": authRecord.Id}),
	)
	if err != nil {
		return e.InternalServerError("failed to fetch domains", err)
	}

	domains := make([]map[string]interface{}, 0, len(records))
	for _, record := range records {
		domains = append(domains, h.recordToResponse(record))
	}

	return e.JSON(http.StatusOK, domains)
}

// lookupDomain performs a WHOIS lookup without saving
func (h *APIHandler) lookupDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	var req struct {
		DomainName string `json:"domain_name"`
	}
	if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
		return e.BadRequestError("invalid request body", err)
	}

	if req.DomainName == "" {
		return e.BadRequestError("domain_name is required", nil)
	}

	// Clean domain
	domainName := cleanDomain(req.DomainName)

	// Perform lookup
	lookupSvc := whois.NewLookupService("")
	ctx := e.Request.Context()
	domainData, err := lookupSvc.LookupDomain(ctx, domainName)
	if err != nil {
		return e.InternalServerError("lookup failed", err)
	}

	return e.JSON(http.StatusOK, domainData)
}

// createDomain creates a new domain entry
func (h *APIHandler) createDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	var req struct {
		DomainName      string   `json:"domain_name"`
		AutoLookup      bool     `json:"auto_lookup"`
		Tags            []string `json:"tags"`
		Notes           string   `json:"notes"`
		PurchasePrice   float64  `json:"purchase_price"`
		CurrentValue    float64  `json:"current_value"`
		RenewalCost     float64  `json:"renewal_cost"`
		AutoRenew       bool     `json:"auto_renew"`
		AlertDaysBefore int      `json:"alert_days_before"`
		SSLAlertEnabled bool     `json:"ssl_alert_enabled"`
		SSLAlertDays    int      `json:"ssl_alert_days"`
		MonitorType     string   `json:"monitor_type"`
		NotifyOnExpiry  bool     `json:"notify_on_expiry"`
		NotifyOnSSL     bool     `json:"notify_on_ssl_expiry"`
		NotifyOnDNS     bool     `json:"notify_on_dns_change"`
		NotifyOnReg     bool     `json:"notify_on_registrar_change"`
	}
	if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
		return e.BadRequestError("invalid request body", err)
	}

	if req.DomainName == "" {
		return e.BadRequestError("domain_name is required", nil)
	}

	// Clean domain
	domainName := cleanDomain(req.DomainName)

	// Check if domain already exists for this user
	existing, _ := h.app.FindFirstRecordByFilter("domains",
		"domain_name = {:domain} && user = {:user}",
		dbx.Params{"domain": domainName, "user": authRecord.Id})
	if existing != nil {
		return e.BadRequestError("domain already exists", nil)
	}

	collection, err := h.app.FindCollectionByNameOrId("domains")
	if err != nil {
		return e.InternalServerError("failed to find collection", err)
	}

	// Set defaults
	if req.AlertDaysBefore <= 0 {
		req.AlertDaysBefore = 30
	}

	record := core.NewRecord(collection)
	record.Set("domain_name", domainName)
	record.Set("status", domain.DomainStatusUnknown)
	record.Set("active", true)
	record.Set("tags", req.Tags)
	record.Set("notes", req.Notes)
	record.Set("purchase_price", req.PurchasePrice)
	record.Set("current_value", req.CurrentValue)
	record.Set("renewal_cost", req.RenewalCost)
	record.Set("auto_renew", req.AutoRenew)
	record.Set("alert_days_before", req.AlertDaysBefore)
	record.Set("ssl_alert_enabled", req.SSLAlertEnabled)
	record.Set("ssl_alert_days", req.SSLAlertDays)
	record.Set("monitor_type", req.MonitorType)
	record.Set("notify_on_expiry", req.NotifyOnExpiry)
	record.Set("notify_on_ssl_expiry", req.NotifyOnSSL)
	record.Set("notify_on_dns_change", req.NotifyOnDNS)
	record.Set("notify_on_registrar_change", req.NotifyOnReg)
	record.Set("user", authRecord.Id)

	// Auto-lookup if requested
	if req.AutoLookup {
		lookupSvc := whois.NewLookupService("")
		ctx := e.Request.Context()
		domainData, err := lookupSvc.LookupDomain(ctx, domainName)
		if err == nil && domainData != nil {
			h.applyLookupData(record, domainData)
		}
	}

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("failed to create domain", err)
	}

	return e.JSON(http.StatusCreated, h.recordToResponse(record))
}

// getDomain gets a single domain
func (h *APIHandler) getDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	return e.JSON(http.StatusOK, h.recordToResponse(record))
}

// updateDomain updates a domain
func (h *APIHandler) updateDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	var req map[string]interface{}
	if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
		return e.BadRequestError("invalid request body", err)
	}

	// Update allowed fields
	if tags, ok := req["tags"]; ok {
		record.Set("tags", tags)
	}
	if notes, ok := req["notes"]; ok {
		record.Set("notes", notes)
	}
	if price, ok := req["purchase_price"]; ok {
		record.Set("purchase_price", price)
	}
	if value, ok := req["current_value"]; ok {
		record.Set("current_value", value)
	}
	if renewal, ok := req["renewal_cost"]; ok {
		record.Set("renewal_cost", renewal)
	}
	if autoRenew, ok := req["auto_renew"]; ok {
		record.Set("auto_renew", autoRenew)
	}
	if active, ok := req["active"]; ok {
		record.Set("active", active)
	}
	if alertDays, ok := req["alert_days_before"]; ok {
		record.Set("alert_days_before", alertDays)
	}
	if sslAlert, ok := req["ssl_alert_enabled"]; ok {
		record.Set("ssl_alert_enabled", sslAlert)
	}
	for _, field := range []string{
		"ssl_alert_days",
		"monitor_type",
		"notify_on_expiry",
		"notify_on_ssl_expiry",
		"notify_on_dns_change",
		"notify_on_registrar_change",
		"notify_on_value_change",
		"value_change_threshold",
		"quiet_hours_enabled",
		"quiet_hours_start",
		"quiet_hours_end",
	} {
		if value, ok := req[field]; ok {
			record.Set(field, value)
		}
	}

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("failed to update domain", err)
	}

	return e.JSON(http.StatusOK, h.recordToResponse(record))
}

// deleteDomain deletes a domain
func (h *APIHandler) deleteDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	if err := h.app.Delete(record); err != nil {
		return e.InternalServerError("failed to delete domain", err)
	}

	return e.NoContent(http.StatusNoContent)
}

// refreshDomain triggers a manual refresh
func (h *APIHandler) refreshDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	if h.scheduler != nil {
		if err := h.scheduler.RefreshDomain(id); err != nil {
			return e.InternalServerError("failed to refresh domain", err)
		}
	}

	updatedRecord, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.InternalServerError("failed to fetch refreshed domain", err)
	}

	return e.JSON(http.StatusOK, h.recordToResponse(updatedRecord))
}

// getDomainHistory gets the change history for a domain
func (h *APIHandler) getDomainHistory(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")

	// Verify domain ownership
	domain, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}
	if domain.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	// Fetch history
	records, err := h.app.FindAllRecords("domain_history",
		dbx.NewExp("domain = {:domain}", dbx.Params{"domain": id}),
	)
	if err != nil {
		return e.InternalServerError("failed to fetch history", err)
	}

	history := make([]map[string]interface{}, 0, len(records))
	for _, record := range records {
		history = append(history, map[string]interface{}{
			"id":          record.Id,
			"change_type": record.GetString("change_type"),
			"field_name":  record.GetString("field_name"),
			"old_value":   record.GetString("old_value"),
			"new_value":   record.GetString("new_value"),
			"created_at":  record.GetDateTime("created_at").String(),
		})
	}

	return e.JSON(http.StatusOK, history)
}

// getDomainStats gets domain health statistics
func (h *APIHandler) getDomainStats(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")

	// Verify domain ownership
	domain, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}
	if domain.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	// Calculate stats from domain history
	stats := h.calculateDomainStats(id)

	return e.JSON(http.StatusOK, stats)
}

// calculateDomainStats calculates health statistics from domain history
func (h *APIHandler) calculateDomainStats(domainID string) map[string]interface{} {
	// Get history for the last 30 days
	since := time.Now().AddDate(0, 0, -30)
	records, _ := h.app.FindRecordsByFilter(
		"domain_history",
		"domain = {:domain} && created_at >= {:since}",
		"-created_at",
		0, 0,
		dbx.Params{
			"domain": domainID,
			"since":  since.Format("2006-01-02 15:04:05"),
		},
	)

	totalChanges := len(records)
	expiryChanges := 0
	sslChanges := 0
	statusChanges := 0

	for _, record := range records {
		switch record.GetString("change_type") {
		case "expiry":
			expiryChanges++
		case "ssl":
			sslChanges++
		case "status":
			statusChanges++
		}
	}

	// Get incidents count
	incidentRecords, _ := h.app.FindRecordsByFilter(
		"incidents",
		"domain = {:domain}",
		"-created",
		0, 0,
		dbx.Params{"domain": domainID},
	)

	return map[string]interface{}{
		"total_changes":   totalChanges,
		"expiry_changes":  expiryChanges,
		"ssl_changes":     sslChanges,
		"status_changes":  statusChanges,
		"incidents_count": len(incidentRecords),
		"period_days":     30,
	}
}

// pauseDomain pauses domain monitoring
func (h *APIHandler) pauseDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	record.Set("active", false)
	record.Set("status", "paused")

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("failed to pause domain", err)
	}

	return e.JSON(http.StatusOK, h.recordToResponse(record))
}

// resumeDomain resumes domain monitoring
func (h *APIHandler) resumeDomain(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	id := e.Request.PathValue("id")
	record, err := h.app.FindRecordById("domains", id)
	if err != nil {
		return e.NotFoundError("domain not found", err)
	}

	if record.GetString("user") != authRecord.Id {
		return e.ForbiddenError("not authorized", nil)
	}

	record.Set("active", true)
	// Reset status - scheduler will update on next check
	record.Set("status", "unknown")

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("failed to resume domain", err)
	}

	// Trigger immediate refresh
	if h.scheduler != nil {
		h.scheduler.RefreshDomain(id)
	}

	return e.JSON(http.StatusOK, h.recordToResponse(record))
}

// recordToResponse converts a record to API response
func (h *APIHandler) recordToResponse(record *core.Record) map[string]interface{} {
	expiryDate := record.GetDateTime("expiry_date").Time()
	sslValidTo := record.GetDateTime("ssl_valid_to").Time()

	// Calculate days until expiry
	daysUntilExpiry := -1
	if !expiryDate.IsZero() {
		daysUntilExpiry = int(time.Until(expiryDate).Hours() / 24)
	}

	sslDaysUntil := -1
	if !sslValidTo.IsZero() {
		sslDaysUntil = int(time.Until(sslValidTo).Hours() / 24)
	}

	resp := map[string]interface{}{
		"id":                         record.Id,
		"domain_name":                record.GetString("domain_name"),
		"status":                     record.GetString("status"),
		"active":                     record.GetBool("active"),
		"days_until_expiry":          daysUntilExpiry,
		"registrar_name":             record.GetString("registrar_name"),
		"registrar_id":               record.GetString("registrar_id"),
		"registrar_url":              record.GetString("registrar_url"),
		"registry_domain_id":         record.GetString("registry_domain_id"),
		"dnssec":                     record.GetString("dnssec"),
		"name_servers":               record.Get("name_servers"),
		"mx_records":                 record.Get("mx_records"),
		"txt_records":                record.Get("txt_records"),
		"ipv4_addresses":             record.Get("ipv4_addresses"),
		"ipv6_addresses":             record.Get("ipv6_addresses"),
		"ssl_issuer":                 record.GetString("ssl_issuer"),
		"ssl_issuer_country":         record.GetString("ssl_issuer_country"),
		"ssl_subject":                record.GetString("ssl_subject"),
		"ssl_days_until":             sslDaysUntil,
		"ssl_fingerprint":            record.GetString("ssl_fingerprint"),
		"ssl_key_size":               record.GetInt("ssl_key_size"),
		"ssl_signature_algo":         record.GetString("ssl_signature_algo"),
		"host_country":               record.GetString("host_country"),
		"host_region":                record.GetString("host_region"),
		"host_city":                  record.GetString("host_city"),
		"host_isp":                   record.GetString("host_isp"),
		"host_org":                   record.GetString("host_org"),
		"host_as":                    record.GetString("host_as"),
		"host_lat":                   record.GetFloat("host_lat"),
		"host_lon":                   record.GetFloat("host_lon"),
		"purchase_price":             record.GetFloat("purchase_price"),
		"current_value":              record.GetFloat("current_value"),
		"renewal_cost":               record.GetFloat("renewal_cost"),
		"auto_renew":                 record.GetBool("auto_renew"),
		"alert_days_before":          record.GetInt("alert_days_before"),
		"ssl_alert_enabled":          record.GetBool("ssl_alert_enabled"),
		"ssl_alert_days":             record.GetInt("ssl_alert_days"),
		"monitor_type":               record.GetString("monitor_type"),
		"notify_on_expiry":           record.GetBool("notify_on_expiry"),
		"notify_on_ssl_expiry":       record.GetBool("notify_on_ssl_expiry"),
		"notify_on_dns_change":       record.GetBool("notify_on_dns_change"),
		"notify_on_registrar_change": record.GetBool("notify_on_registrar_change"),
		"notify_on_value_change":     record.GetBool("notify_on_value_change"),
		"value_change_threshold":     record.GetFloat("value_change_threshold"),
		"quiet_hours_enabled":        record.GetBool("quiet_hours_enabled"),
		"quiet_hours_start":          record.GetString("quiet_hours_start"),
		"quiet_hours_end":            record.GetString("quiet_hours_end"),
		"registrant_name":            record.GetString("registrant_name"),
		"registrant_org":             record.GetString("registrant_org"),
		"registrant_country":         record.GetString("registrant_country"),
		"registrant_city":            record.GetString("registrant_city"),
		"registrant_state":           record.GetString("registrant_state"),
		"abuse_email":                record.GetString("abuse_email"),
		"abuse_phone":                record.GetString("abuse_phone"),
		"tags":                       record.Get("tags"),
		"notes":                      record.GetString("notes"),
		"favicon_url":                record.GetString("favicon_url"),
		"created":                    record.GetDateTime("created").String(),
		"updated":                    record.GetDateTime("updated").String(),
	}

	if !expiryDate.IsZero() {
		resp["expiry_date"] = expiryDate.Format("2006-01-02T15:04:05Z")
	}
	creationDate := record.GetDateTime("creation_date").Time()
	if !creationDate.IsZero() {
		resp["creation_date"] = creationDate.Format("2006-01-02T15:04:05Z")
	}
	updatedDate := record.GetDateTime("updated_date").Time()
	if !updatedDate.IsZero() {
		resp["updated_date"] = updatedDate.Format("2006-01-02T15:04:05Z")
	}
	sslValidFrom := record.GetDateTime("ssl_valid_from").Time()
	if !sslValidFrom.IsZero() {
		resp["ssl_valid_from"] = sslValidFrom.Format("2006-01-02T15:04:05Z")
	}
	if !sslValidTo.IsZero() {
		resp["ssl_valid_to"] = sslValidTo.Format("2006-01-02T15:04:05Z")
	}
	lastChecked := record.GetDateTime("last_checked").Time()
	if !lastChecked.IsZero() {
		resp["last_checked"] = lastChecked.Format("2006-01-02T15:04:05Z")
	}

	return resp
}

func (h *APIHandler) applyLookupData(record *core.Record, domainData *domain.Domain) {
	if domainData.ExpiryDate != nil {
		record.Set("expiry_date", *domainData.ExpiryDate)
	}
	if domainData.CreationDate != nil {
		record.Set("creation_date", *domainData.CreationDate)
	}
	if domainData.UpdatedDate != nil {
		record.Set("updated_date", *domainData.UpdatedDate)
	}
	record.Set("registrar_name", domainData.RegistrarName)
	record.Set("registrar_id", domainData.RegistrarID)
	record.Set("registrar_url", domainData.RegistrarURL)
	record.Set("registry_domain_id", domainData.RegistryDomainID)
	record.Set("dnssec", domainData.DNSSEC)
	record.Set("name_servers", domainData.NameServers)
	record.Set("mx_records", domainData.MXRecords)
	record.Set("txt_records", domainData.TXTRecords)
	record.Set("ipv4_addresses", domainData.IPv4Addresses)
	record.Set("ipv6_addresses", domainData.IPv6Addresses)
	record.Set("ssl_issuer", domainData.SSLIssuer)
	record.Set("ssl_issuer_country", domainData.SSLIssuerCountry)
	record.Set("ssl_subject", domainData.SSLSubject)
	if domainData.SSLValidFrom != nil {
		record.Set("ssl_valid_from", *domainData.SSLValidFrom)
	}
	if domainData.SSLValidTo != nil {
		record.Set("ssl_valid_to", *domainData.SSLValidTo)
	}
	record.Set("ssl_fingerprint", domainData.SSLFingerprint)
	record.Set("ssl_key_size", domainData.SSLKeySize)
	record.Set("ssl_signature_algo", domainData.SSLSignatureAlgo)
	record.Set("host_country", domainData.HostCountry)
	record.Set("host_region", domainData.HostRegion)
	record.Set("host_city", domainData.HostCity)
	record.Set("host_isp", domainData.HostISP)
	record.Set("host_org", domainData.HostOrg)
	record.Set("host_as", domainData.HostAS)
	record.Set("host_lat", domainData.HostLat)
	record.Set("host_lon", domainData.HostLon)
	record.Set("registrant_name", domainData.RegistrantName)
	record.Set("registrant_org", domainData.RegistrantOrg)
	record.Set("registrant_street", domainData.RegistrantStreet)
	record.Set("registrant_city", domainData.RegistrantCity)
	record.Set("registrant_state", domainData.RegistrantState)
	record.Set("registrant_country", domainData.RegistrantCountry)
	record.Set("registrant_postal", domainData.RegistrantPostal)
	record.Set("abuse_email", domainData.AbuseEmail)
	record.Set("abuse_phone", domainData.AbusePhone)
	record.Set("favicon_url", domainData.FaviconURL)
	record.Set("last_checked", time.Now())
}

// cleanDomain cleans and normalizes a domain name
func cleanDomain(domain string) string {
	// Remove protocol
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	// Remove www prefix
	domain = strings.TrimPrefix(domain, "www.")
	// Remove path and query
	if idx := strings.IndexAny(domain, "/?#"); idx != -1 {
		domain = domain[:idx]
	}
	// Remove port
	if idx := strings.Index(domain, ":"); idx != -1 {
		domain = domain[:idx]
	}
	return strings.ToLower(strings.TrimSpace(domain))
}
