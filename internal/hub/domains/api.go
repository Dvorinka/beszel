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
	record.Set("user", authRecord.Id)

	// Auto-lookup if requested
	if req.AutoLookup {
		lookupSvc := whois.NewLookupService("")
		ctx := e.Request.Context()
		domainData, err := lookupSvc.LookupDomain(ctx, domainName)
		if err == nil && domainData != nil {
			record.Set("expiry_date", domainData.ExpiryDate)
			record.Set("creation_date", domainData.CreationDate)
			record.Set("updated_date", domainData.UpdatedDate)
			record.Set("registrar_name", domainData.RegistrarName)
			record.Set("registrar_id", domainData.RegistrarID)
			record.Set("registrar_url", domainData.RegistrarURL)
			record.Set("dnssec", domainData.DNSSEC)
			record.Set("name_servers", domainData.NameServers)
			record.Set("mx_records", domainData.MXRecords)
			record.Set("txt_records", domainData.TXTRecords)
			record.Set("ipv4_addresses", domainData.IPv4Addresses)
			record.Set("ipv6_addresses", domainData.IPv6Addresses)
			record.Set("ssl_issuer", domainData.SSLIssuer)
			record.Set("ssl_valid_to", domainData.SSLValidTo)
			record.Set("host_country", domainData.HostCountry)
			record.Set("host_isp", domainData.HostISP)
			record.Set("favicon_url", domainData.FaviconURL)
			record.Set("last_checked", time.Now())
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

	// Trigger refresh via scheduler
	if h.scheduler != nil {
		h.scheduler.RefreshDomain(id)
	}

	return e.JSON(http.StatusOK, map[string]string{"status": "refreshing"})
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

	return map[string]interface{}{
		"id":                record.Id,
		"domain_name":       record.GetString("domain_name"),
		"status":            record.GetString("status"),
		"active":            record.GetBool("active"),
		"expiry_date":       expiryDate,
		"creation_date":     record.GetDateTime("creation_date").String(),
		"updated_date":      record.GetDateTime("updated_date").String(),
		"days_until_expiry": daysUntilExpiry,
		"registrar_name":    record.GetString("registrar_name"),
		"registrar_id":      record.GetString("registrar_id"),
		"name_servers":      record.Get("name_servers"),
		"ipv4_addresses":    record.Get("ipv4_addresses"),
		"ssl_issuer":        record.GetString("ssl_issuer"),
		"ssl_valid_to":      sslValidTo,
		"ssl_days_until":    sslDaysUntil,
		"host_country":      record.GetString("host_country"),
		"host_isp":          record.GetString("host_isp"),
		"purchase_price":    record.GetFloat("purchase_price"),
		"current_value":     record.GetFloat("current_value"),
		"renewal_cost":      record.GetFloat("renewal_cost"),
		"auto_renew":        record.GetBool("auto_renew"),
		"alert_days_before": record.GetInt("alert_days_before"),
		"ssl_alert_enabled": record.GetBool("ssl_alert_enabled"),
		"tags":              record.Get("tags"),
		"notes":             record.GetString("notes"),
		"favicon_url":       record.GetString("favicon_url"),
		"last_checked":      record.GetDateTime("last_checked").String(),
		"created":           record.GetDateTime("created").String(),
		"updated":           record.GetDateTime("updated").String(),
	}
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
