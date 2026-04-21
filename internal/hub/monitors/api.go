package monitors

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/henrygd/beszel/internal/entities/monitor"
	"github.com/pocketbase/pocketbase/core"
)

// APIHandler handles monitor API endpoints
type APIHandler struct {
	app       core.App
	scheduler *Scheduler
}

// NewAPIHandler creates a new monitor API handler
func NewAPIHandler(app core.App, scheduler *Scheduler) *APIHandler {
	return &APIHandler{
		app:       app,
		scheduler: scheduler,
	}
}

// RegisterRoutes registers monitor API routes
func (h *APIHandler) RegisterRoutes(se *core.ServeEvent) {
	api := se.Router.Group("/api/beszel/monitors")

	// Require auth for all routes
	api.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("Authentication required", nil)
		}
		return e.Next()
	})

	// CRUD endpoints
	api.GET("", h.listMonitors)
	api.POST("", h.createMonitor)
	api.GET("/:id", h.getMonitor)
	api.PATCH("/:id", h.updateMonitor)
	api.DELETE("/:id", h.deleteMonitor)

	// Action endpoints
	api.POST("/:id/check", h.manualCheck)
	api.POST("/:id/pause", h.pauseMonitor)
	api.POST("/:id/resume", h.resumeMonitor)
	api.GET("/:id/stats", h.getStats)
	api.GET("/:id/heartbeats", h.getHeartbeats)
}

// MonitorResponse represents a monitor in API responses
type MonitorResponse struct {
	ID                     string             `json:"id"`
	Name                   string             `json:"name"`
	Type                   string             `json:"type"`
	URL                    string             `json:"url,omitempty"`
	Hostname               string             `json:"hostname,omitempty"`
	Port                   int                `json:"port,omitempty"`
	Method                 string             `json:"method,omitempty"`
	Interval               int                `json:"interval"`
	Timeout                int                `json:"timeout"`
	Retries                int                `json:"retries"`
	Status                 string             `json:"status"`
	Active                 bool               `json:"active"`
	Description            string             `json:"description,omitempty"`
	LastCheck              *time.Time         `json:"last_check,omitempty"`
	UptimeStats            map[string]float64 `json:"uptime_stats,omitempty"`
	Tags                   []string           `json:"tags,omitempty"`
	Keyword                string             `json:"keyword,omitempty"`
	JSONQuery              string             `json:"json_query,omitempty"`
	ExpectedValue          string             `json:"expected_value,omitempty"`
	InvertKeyword          bool               `json:"invert_keyword"`
	DNSResolveServer       string             `json:"dns_resolve_server,omitempty"`
	DNSResolverMode        string             `json:"dns_resolver_mode,omitempty"`
	CertExpiryNotification bool               `json:"cert_expiry_notification"`
	CertExpiryDays         int                `json:"cert_expiry_days,omitempty"`
	IgnoreTLSError         bool               `json:"ignore_tls_error"`
	Created                time.Time          `json:"created"`
	Updated                time.Time          `json:"updated"`
}

// CreateMonitorRequest represents a request to create a monitor
type CreateMonitorRequest struct {
	Name                   string   `json:"name"`
	Type                   string   `json:"type"`
	URL                    string   `json:"url,omitempty"`
	Hostname               string   `json:"hostname,omitempty"`
	Port                   int      `json:"port,omitempty"`
	Method                 string   `json:"method,omitempty"`
	Headers                string   `json:"headers,omitempty"`
	Body                   string   `json:"body,omitempty"`
	Interval               int      `json:"interval"`
	Timeout                int      `json:"timeout"`
	Retries                int      `json:"retries,omitempty"`
	RetryInterval          int      `json:"retry_interval,omitempty"`
	MaxRedirects           int      `json:"max_redirects,omitempty"`
	Keyword                string   `json:"keyword,omitempty"`
	JSONQuery              string   `json:"json_query,omitempty"`
	ExpectedValue          string   `json:"expected_value,omitempty"`
	InvertKeyword          bool     `json:"invert_keyword,omitempty"`
	DNSResolveServer       string   `json:"dns_resolve_server,omitempty"`
	DNSResolverMode        string   `json:"dns_resolver_mode,omitempty"`
	Description            string   `json:"description,omitempty"`
	Tags                   []string `json:"tags,omitempty"`
	CertExpiryNotification bool     `json:"cert_expiry_notification,omitempty"`
	CertExpiryDays         int      `json:"cert_expiry_days,omitempty"`
	IgnoreTLSError         bool     `json:"ignore_tls_error,omitempty"`
}

// UpdateMonitorRequest represents a request to update a monitor
type UpdateMonitorRequest struct {
	Name                   *string  `json:"name,omitempty"`
	URL                    *string  `json:"url,omitempty"`
	Hostname               *string  `json:"hostname,omitempty"`
	Port                   *int     `json:"port,omitempty"`
	Method                 *string  `json:"method,omitempty"`
	Headers                *string  `json:"headers,omitempty"`
	Body                   *string  `json:"body,omitempty"`
	Interval               *int     `json:"interval,omitempty"`
	Timeout                *int     `json:"timeout,omitempty"`
	Retries                *int     `json:"retries,omitempty"`
	RetryInterval          *int     `json:"retry_interval,omitempty"`
	MaxRedirects           *int     `json:"max_redirects,omitempty"`
	Keyword                *string  `json:"keyword,omitempty"`
	JSONQuery              *string  `json:"json_query,omitempty"`
	ExpectedValue          *string  `json:"expected_value,omitempty"`
	InvertKeyword          *bool    `json:"invert_keyword,omitempty"`
	DNSResolveServer       *string  `json:"dns_resolve_server,omitempty"`
	DNSResolverMode        *string  `json:"dns_resolver_mode,omitempty"`
	Active                 *bool    `json:"active,omitempty"`
	Description            *string  `json:"description,omitempty"`
	Tags                   []string `json:"tags,omitempty"`
	CertExpiryNotification *bool    `json:"cert_expiry_notification,omitempty"`
	CertExpiryDays         *int     `json:"cert_expiry_days,omitempty"`
	IgnoreTLSError         *bool    `json:"ignore_tls_error,omitempty"`
}

// listMonitors returns all monitors for the authenticated user
func (h *APIHandler) listMonitors(e *core.RequestEvent) error {
	userID := e.Auth.Id

	records, err := h.app.FindRecordsByFilter(
		"monitors",
		"user = {:userId}",
		"-created",
		0,
		0,
		map[string]any{"userId": userID},
	)
	if err != nil {
		return e.InternalServerError("Failed to fetch monitors", err)
	}

	monitors := make([]MonitorResponse, 0, len(records))
	for _, record := range records {
		monitors = append(monitors, recordToResponse(record))
	}

	return e.JSON(http.StatusOK, map[string]interface{}{
		"monitors": monitors,
	})
}

// getMonitor returns a single monitor by ID
func (h *APIHandler) getMonitor(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	return e.JSON(http.StatusOK, recordToResponse(record))
}

// createMonitor creates a new monitor
func (h *APIHandler) createMonitor(e *core.RequestEvent) error {
	var req CreateMonitorRequest
	if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	// Validate required fields
	if req.Name == "" || req.Type == "" {
		return e.BadRequestError("Name and type are required", nil)
	}

	// Set defaults
	if req.Interval == 0 {
		req.Interval = 60
	}
	if req.Timeout == 0 {
		req.Timeout = 30
	}
	if req.Retries == 0 {
		req.Retries = 1
	}

	// Get collection
	collection, err := h.app.FindCollectionByNameOrId("monitors")
	if err != nil {
		return e.InternalServerError("Failed to get collection", err)
	}

	// Create record
	record := core.NewRecord(collection)
	record.Set("name", req.Name)
	record.Set("type", req.Type)
	record.Set("url", req.URL)
	record.Set("hostname", req.Hostname)
	record.Set("port", req.Port)
	record.Set("method", req.Method)
	record.Set("headers", req.Headers)
	record.Set("body", req.Body)
	record.Set("interval", req.Interval)
	record.Set("timeout", req.Timeout)
	record.Set("retries", req.Retries)
	record.Set("retry_interval", req.RetryInterval)
	record.Set("max_redirects", req.MaxRedirects)
	record.Set("keyword", req.Keyword)
	record.Set("json_query", req.JSONQuery)
	record.Set("expected_value", req.ExpectedValue)
	record.Set("invert_keyword", req.InvertKeyword)
	record.Set("dns_resolve_server", req.DNSResolveServer)
	record.Set("dns_resolver_mode", req.DNSResolverMode)
	record.Set("status", string(monitor.StatusPending))
	record.Set("active", true)
	record.Set("user", e.Auth.Id)
	record.Set("description", req.Description)
	record.Set("tags", req.Tags)
	record.Set("cert_expiry_notification", req.CertExpiryNotification)
	record.Set("cert_expiry_days", req.CertExpiryDays)
	record.Set("ignore_tls_error", req.IgnoreTLSError)
	record.Set("uptime_stats", map[string]float64{})

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("Failed to create monitor", err)
	}

	// Add to scheduler
	h.scheduler.AddMonitor(record)

	return e.JSON(http.StatusCreated, recordToResponse(record))
}

// updateMonitor updates an existing monitor
func (h *APIHandler) updateMonitor(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	var req UpdateMonitorRequest
	if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	// Update fields
	if req.Name != nil {
		record.Set("name", *req.Name)
	}
	if req.URL != nil {
		record.Set("url", *req.URL)
	}
	if req.Hostname != nil {
		record.Set("hostname", *req.Hostname)
	}
	if req.Port != nil {
		record.Set("port", *req.Port)
	}
	if req.Method != nil {
		record.Set("method", *req.Method)
	}
	if req.Headers != nil {
		record.Set("headers", *req.Headers)
	}
	if req.Body != nil {
		record.Set("body", *req.Body)
	}
	if req.Interval != nil {
		record.Set("interval", *req.Interval)
	}
	if req.Timeout != nil {
		record.Set("timeout", *req.Timeout)
	}
	if req.Retries != nil {
		record.Set("retries", *req.Retries)
	}
	if req.RetryInterval != nil {
		record.Set("retry_interval", *req.RetryInterval)
	}
	if req.MaxRedirects != nil {
		record.Set("max_redirects", *req.MaxRedirects)
	}
	if req.Keyword != nil {
		record.Set("keyword", *req.Keyword)
	}
	if req.JSONQuery != nil {
		record.Set("json_query", *req.JSONQuery)
	}
	if req.ExpectedValue != nil {
		record.Set("expected_value", *req.ExpectedValue)
	}
	if req.InvertKeyword != nil {
		record.Set("invert_keyword", *req.InvertKeyword)
	}
	if req.DNSResolveServer != nil {
		record.Set("dns_resolve_server", *req.DNSResolveServer)
	}
	if req.DNSResolverMode != nil {
		record.Set("dns_resolver_mode", *req.DNSResolverMode)
	}
	if req.Active != nil {
		record.Set("active", *req.Active)
	}
	if req.Description != nil {
		record.Set("description", *req.Description)
	}
	if req.Tags != nil {
		record.Set("tags", req.Tags)
	}
	if req.CertExpiryNotification != nil {
		record.Set("cert_expiry_notification", *req.CertExpiryNotification)
	}
	if req.CertExpiryDays != nil {
		record.Set("cert_expiry_days", *req.CertExpiryDays)
	}
	if req.IgnoreTLSError != nil {
		record.Set("ignore_tls_error", *req.IgnoreTLSError)
	}

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("Failed to update monitor", err)
	}

	// Update scheduler
	h.scheduler.UpdateMonitor(record)

	return e.JSON(http.StatusOK, recordToResponse(record))
}

// deleteMonitor deletes a monitor
func (h *APIHandler) deleteMonitor(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	// Remove from scheduler first
	h.scheduler.RemoveMonitor(id)

	if err := h.app.Delete(record); err != nil {
		return e.InternalServerError("Failed to delete monitor", err)
	}

	return e.JSON(http.StatusOK, map[string]string{"message": "Monitor deleted"})
}

// manualCheck runs a manual check for a monitor
func (h *APIHandler) manualCheck(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	result, err := h.scheduler.RunManualCheck(id)
	if err != nil {
		return e.InternalServerError("Check failed", err)
	}

	return e.JSON(http.StatusOK, map[string]interface{}{
		"status": result.Status,
		"ping":   result.Ping,
		"msg":    result.Msg,
	})
}

// pauseMonitor pauses a monitor
func (h *APIHandler) pauseMonitor(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	record.Set("active", false)
	record.Set("status", string(monitor.StatusPaused))

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("Failed to pause monitor", err)
	}

	h.scheduler.UpdateMonitor(record)

	return e.JSON(http.StatusOK, recordToResponse(record))
}

// resumeMonitor resumes a paused monitor
func (h *APIHandler) resumeMonitor(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	record.Set("active", true)
	record.Set("status", string(monitor.StatusPending))

	if err := h.app.Save(record); err != nil {
		return e.InternalServerError("Failed to resume monitor", err)
	}

	h.scheduler.UpdateMonitor(record)

	return e.JSON(http.StatusOK, recordToResponse(record))
}

// getStats returns uptime statistics for a monitor
func (h *APIHandler) getStats(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	stats24h, _ := h.scheduler.GetUptimeStats(id, 24)
	stats7d, _ := h.scheduler.GetUptimeStats(id, 168)
	stats30d, _ := h.scheduler.GetUptimeStats(id, 720)

	return e.JSON(http.StatusOK, map[string]interface{}{
		"uptime_24h": stats24h,
		"uptime_7d":  stats7d,
		"uptime_30d": stats30d,
	})
}

// getHeartbeats returns recent heartbeats for a monitor
func (h *APIHandler) getHeartbeats(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	if id == "" {
		return e.BadRequestError("Monitor ID is required", nil)
	}

	record, err := h.app.FindRecordById("monitors", id)
	if err != nil {
		return e.NotFoundError("Monitor not found", err)
	}

	// Verify ownership
	if record.GetString("user") != e.Auth.Id {
		return e.ForbiddenError("Access denied", nil)
	}

	// Get limit from query, default 100
	limit := 100

	records, err := h.app.FindRecordsByFilter(
		"monitor_heartbeats",
		"monitor = {:monitorId}",
		"-time",
		0,
		limit,
		map[string]any{"monitorId": id},
	)
	if err != nil {
		return e.InternalServerError("Failed to fetch heartbeats", err)
	}

	heartbeats := make([]map[string]interface{}, 0, len(records))
	for _, hb := range records {
		heartbeats = append(heartbeats, map[string]interface{}{
			"id":          hb.Id,
			"status":      hb.GetString("status"),
			"ping":        hb.GetInt("ping"),
			"msg":         hb.GetString("msg"),
			"cert_expiry": hb.GetInt("cert_expiry"),
			"cert_valid":  hb.GetBool("cert_valid"),
			"time":        hb.Get("time"),
		})
	}

	return e.JSON(http.StatusOK, map[string]interface{}{
		"heartbeats": heartbeats,
	})
}

// recordToResponse converts a PocketBase record to MonitorResponse
func recordToResponse(record *core.Record) MonitorResponse {
	resp := MonitorResponse{
		ID:                     record.Id,
		Name:                   record.GetString("name"),
		Type:                   record.GetString("type"),
		URL:                    record.GetString("url"),
		Hostname:               record.GetString("hostname"),
		Port:                   record.GetInt("port"),
		Method:                 record.GetString("method"),
		Interval:               record.GetInt("interval"),
		Timeout:                record.GetInt("timeout"),
		Retries:                record.GetInt("retries"),
		Status:                 record.GetString("status"),
		Active:                 record.GetBool("active"),
		Description:            record.GetString("description"),
		Keyword:                record.GetString("keyword"),
		JSONQuery:              record.GetString("json_query"),
		ExpectedValue:          record.GetString("expected_value"),
		InvertKeyword:          record.GetBool("invert_keyword"),
		DNSResolveServer:       record.GetString("dns_resolve_server"),
		DNSResolverMode:        record.GetString("dns_resolver_mode"),
		CertExpiryNotification: record.GetBool("cert_expiry_notification"),
		CertExpiryDays:         record.GetInt("cert_expiry_days"),
		IgnoreTLSError:         record.GetBool("ignore_tls_error"),
		Created:                record.GetDateTime("created").Time(),
		Updated:                record.GetDateTime("updated").Time(),
	}

	// Handle last_check
	if lc := record.Get("last_check"); lc != nil {
		if t, ok := lc.(time.Time); ok {
			resp.LastCheck = &t
		}
	}

	// Handle uptime_stats
	if stats := record.Get("uptime_stats"); stats != nil {
		if s, ok := stats.(map[string]float64); ok {
			resp.UptimeStats = s
		}
	}

	// Handle tags
	if tags := record.Get("tags"); tags != nil {
		if t, ok := tags.([]string); ok {
			resp.Tags = t
		}
	}

	return resp
}
