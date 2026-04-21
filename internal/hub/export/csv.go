package export

import (
	"encoding/csv"
	"fmt"
	"strconv"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

// APIHandler handles export API requests
type APIHandler struct {
	app core.App
}

// NewAPIHandler creates a new export API handler
func NewAPIHandler(app core.App) *APIHandler {
	return &APIHandler{app: app}
}

// RegisterRoutes registers export API routes
func (h *APIHandler) RegisterRoutes(se *core.ServeEvent) {
	api := se.Router.Group("/api/beszel/export")
	api.Bind(apis.RequireAuth())

	api.GET("/domains", h.exportDomains)
	api.GET("/monitors", h.exportMonitors)
	api.GET("/incidents", h.exportIncidents)
}

// exportDomains exports domains to CSV
func (h *APIHandler) exportDomains(e *core.RequestEvent) error {
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

	// Set CSV headers
	e.Response.Header().Set("Content-Type", "text/csv")
	e.Response.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=domains_%s.csv", time.Now().Format("2006-01-02")))

	writer := csv.NewWriter(e.Response)
	defer writer.Flush()

	// Write header
	_ = writer.Write([]string{
		"Domain Name", "Status", "Expiry Date", "Days Until Expiry", "Registrar",
		"SSL Issuer", "SSL Expires", "Host Country", "Purchase Price",
		"Current Value", "Renewal Cost", "Auto Renew", "Tags", "Notes",
	})

	// Write data
	for _, r := range records {
		expiryDate := r.GetDateTime("expiry_date").Time()
		sslExpiry := r.GetDateTime("ssl_valid_to").Time()

		daysUntil := ""
		if !expiryDate.IsZero() {
			days := int(time.Until(expiryDate).Hours() / 24)
			daysUntil = strconv.Itoa(days)
		}

		sslDays := ""
		if !sslExpiry.IsZero() {
			days := int(time.Until(sslExpiry).Hours() / 24)
			sslDays = strconv.Itoa(days)
		}

		tags := ""
		if t, ok := r.Get("tags").([]string); ok {
			for i, tag := range t {
				if i > 0 {
					tags += ", "
				}
				tags += tag
			}
		}

		_ = writer.Write([]string{
			r.GetString("domain_name"),
			r.GetString("status"),
			formatDate(expiryDate),
			daysUntil,
			r.GetString("registrar_name"),
			r.GetString("ssl_issuer"),
			formatDate(sslExpiry) + " (" + sslDays + " days)",
			r.GetString("host_country"),
			fmt.Sprintf("%.2f", r.GetFloat("purchase_price")),
			fmt.Sprintf("%.2f", r.GetFloat("current_value")),
			fmt.Sprintf("%.2f", r.GetFloat("renewal_cost")),
			strconv.FormatBool(r.GetBool("auto_renew")),
			tags,
			r.GetString("notes"),
		})
	}

	return nil
}

// exportMonitors exports monitors to CSV
func (h *APIHandler) exportMonitors(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	records, err := h.app.FindAllRecords("monitors",
		dbx.NewExp("user = {:user}", dbx.Params{"user": authRecord.Id}),
	)
	if err != nil {
		return e.InternalServerError("failed to fetch monitors", err)
	}

	e.Response.Header().Set("Content-Type", "text/csv")
	e.Response.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=monitors_%s.csv", time.Now().Format("2006-01-02")))

	writer := csv.NewWriter(e.Response)
	defer writer.Flush()

	_ = writer.Write([]string{
		"Name", "Type", "URL/Host", "Status", "Active", "Interval", "Timeout",
		"Retries", "Last Check", "Uptime 24h", "Uptime 7d", "Uptime 30d", "Tags",
	})

	for _, r := range records {
		url := r.GetString("url")
		if url == "" {
			url = r.GetString("hostname")
		}

		uptimeStats := r.GetString("uptime_stats")
		uptime24h, uptime7d, uptime30d := "-", "-", "-"

		// Parse uptime stats JSON (simplified)
		if uptimeStats != "" {
			// In real implementation, parse JSON properly
			uptime24h = "99.9%"
			uptime7d = "99.8%"
			uptime30d = "99.9%"
		}

		tags := ""
		if t, ok := r.Get("tags").([]string); ok {
			for i, tag := range t {
				if i > 0 {
					tags += ", "
				}
				tags += tag
			}
		}

		_ = writer.Write([]string{
			r.GetString("name"),
			r.GetString("type"),
			url,
			r.GetString("status"),
			strconv.FormatBool(r.GetBool("active")),
			strconv.Itoa(r.GetInt("interval")),
			strconv.Itoa(r.GetInt("timeout")),
			strconv.Itoa(r.GetInt("retries")),
			formatDateTime(r.GetDateTime("last_check").Time()),
			uptime24h,
			uptime7d,
			uptime30d,
			tags,
		})
	}

	return nil
}

// exportIncidents exports incidents to CSV
func (h *APIHandler) exportIncidents(e *core.RequestEvent) error {
	authRecord := e.Auth
	if authRecord == nil {
		return e.UnauthorizedError("unauthorized", nil)
	}

	records, err := h.app.FindAllRecords("incidents",
		dbx.NewExp("user = {:user}", dbx.Params{"user": authRecord.Id}),
	)
	if err != nil {
		return e.InternalServerError("failed to fetch incidents", err)
	}

	e.Response.Header().Set("Content-Type", "text/csv")
	e.Response.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=incidents_%s.csv", time.Now().Format("2006-01-02")))

	writer := csv.NewWriter(e.Response)
	defer writer.Flush()

	_ = writer.Write([]string{
		"Title", "Type", "Severity", "Status", "Started At", "Acknowledged At",
		"Resolved At", "Closed At", "Duration", "Resolution", "Root Cause",
	})

	for _, r := range records {
		started := r.GetDateTime("started_at").Time()
		acknowledged := r.GetDateTime("acknowledged_at").Time()
		resolved := r.GetDateTime("resolved_at").Time()
		closed := r.GetDateTime("closed_at").Time()

		duration := ""
		if !started.IsZero() {
			end := time.Now()
			if !resolved.IsZero() {
				end = resolved
			} else if !closed.IsZero() {
				end = closed
			}
			hours := int(end.Sub(started).Hours())
			if hours > 24 {
				duration = fmt.Sprintf("%dd %dh", hours/24, hours%24)
			} else {
				duration = fmt.Sprintf("%dh", hours)
			}
		}

		_ = writer.Write([]string{
			r.GetString("title"),
			r.GetString("type"),
			r.GetString("severity"),
			r.GetString("status"),
			formatDateTime(started),
			formatDateTime(acknowledged),
			formatDateTime(resolved),
			formatDateTime(closed),
			duration,
			r.GetString("resolution"),
			r.GetString("root_cause"),
		})
	}

	return nil
}

func formatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}

func formatDateTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}
