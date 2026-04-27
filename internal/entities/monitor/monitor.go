package monitor

import "time"

// Status constants for monitors
type Status string

const (
	StatusUp          Status = "up"
	StatusDown        Status = "down"
	StatusPending     Status = "pending"
	StatusPaused      Status = "paused"
	StatusMaintenance Status = "maintenance"
)

// Monitor types
const (
	TypeHTTP          = "http"
	TypeHTTPS         = "https"
	TypeTCP           = "tcp"
	TypePing          = "ping"
	TypeDNS           = "dns"
	TypeKeyword       = "keyword"
	TypeJSONQuery     = "json-query"
	TypeDocker        = "docker"
	TypePush          = "push"
	TypeManual        = "manual"
	TypeSystemService = "system-service"
	TypeRealBrowser   = "real-browser"
	TypeGRPCKeyword   = "grpc-keyword"
	TypeMQTT          = "mqtt"
	TypeRabbitMQ      = "rabbitmq"
	TypeKafka         = "kafka-producer"
	TypeSMTP          = "smtp"
	TypeSNMP          = "snmp"
	TypeSIP           = "sip-options"
	TypeTailscalePing = "tailscale-ping"
	TypeWebSocket     = "websocket-upgrade"
	TypeGlobalping    = "globalping"
	TypeMySQL         = "mysql"
	TypeMongoDB       = "mongodb"
	TypeRedis         = "redis"
	TypePostgreSQL    = "postgresql"
	TypeSQLServer     = "sqlserver"
	TypeOracleDB      = "oracledb"
	TypeRADIUS        = "radius"
	TypeGameDig       = "gamedig"
	TypeSteam         = "steam"
)

// HTTPMethod constants
const (
	MethodGET     = "GET"
	MethodPOST    = "POST"
	MethodPUT     = "PUT"
	MethodDELETE  = "DELETE"
	MethodHEAD    = "HEAD"
	MethodOPTIONS = "OPTIONS"
	MethodPATCH   = "PATCH"
)

// Monitor represents a website/service monitor configuration
type Monitor struct {
	ID                     string             `json:"id" db:"id"`
	Name                   string             `json:"name" db:"name"`
	Type                   string             `json:"type" db:"type"`
	URL                    string             `json:"url" db:"url"`
	Hostname               string             `json:"hostname" db:"hostname"`
	Port                   int                `json:"port" db:"port"`
	Method                 string             `json:"method" db:"method"`
	Headers                string             `json:"headers" db:"headers"`
	Body                   string             `json:"body" db:"body"`
	Interval               int                `json:"interval" db:"interval"`
	Timeout                int                `json:"timeout" db:"timeout"`
	Retries                int                `json:"retries" db:"retries"`
	RetryInterval          int                `json:"retry_interval" db:"retry_interval"`
	MaxRedirects           int                `json:"max_redirects" db:"max_redirects"`
	Keyword                string             `json:"keyword" db:"keyword"`
	JSONQuery              string             `json:"json_query" db:"json_query"`
	ExpectedValue          string             `json:"expected_value" db:"expected_value"`
	InvertKeyword          bool               `json:"invert_keyword" db:"invert_keyword"`
	DNSResolveServer       string             `json:"dns_resolve_server" db:"dns_resolve_server"`
	DNSResolverMode        string             `json:"dns_resolver_mode" db:"dns_resolver_mode"`
	Status                 Status             `json:"status" db:"status"`
	Active                 bool               `json:"active" db:"active"`
	UserID                 string             `json:"user" db:"user"`
	Tags                   []string           `json:"tags" db:"tags"`
	Created                time.Time          `json:"created" db:"created"`
	Updated                time.Time          `json:"updated" db:"updated"`
	LastCheck              time.Time          `json:"last_check" db:"last_check"`
	UptimeStats            map[string]float64 `json:"uptime_stats" db:"uptime_stats"`
	Description            string             `json:"description" db:"description"`
	CertExpiryNotification bool               `json:"cert_expiry_notification" db:"cert_expiry_notification"`
	CertExpiryDays         int                `json:"cert_expiry_days" db:"cert_expiry_days"`
	ProxyID                string             `json:"proxy" db:"proxy"`
	IgnoreTLSError         bool               `json:"ignore_tls_error" db:"ignore_tls_error"`
}

// Heartbeat represents a single monitor check result
type Heartbeat struct {
	ID         string    `json:"id" db:"id"`
	MonitorID  string    `json:"monitor" db:"monitor"`
	Status     Status    `json:"status" db:"status"`
	Ping       int       `json:"ping" db:"ping"`
	Msg        string    `json:"msg" db:"msg"`
	Time       time.Time `json:"time" db:"time"`
	CertExpiry int       `json:"cert_expiry" db:"cert_expiry"`
	CertValid  bool      `json:"cert_valid" db:"cert_valid"`
}

// UptimeStats holds calculated uptime statistics
type UptimeStats struct {
	Total     int     `json:"total"`
	Up        int     `json:"up"`
	Down      int     `json:"down"`
	Uptime24h float64 `json:"uptime_24h"`
	Uptime7d  float64 `json:"uptime_7d"`
	Uptime30d float64 `json:"uptime_30d"`
}

// CheckResult holds the result of a monitor check
type CheckResult struct {
	Status     Status
	Ping       int
	Msg        string
	CertExpiry int
	CertValid  bool
	Error      error
}

// CheckRequest holds parameters for a monitor check
type CheckRequest struct {
	Monitor *Monitor
	Timeout time.Duration
}

// ToPublicJSON returns a monitor object suitable for public display
func (m *Monitor) ToPublicJSON() map[string]interface{} {
	return map[string]interface{}{
		"id":     m.ID,
		"name":   m.Name,
		"type":   m.Type,
		"status": m.Status,
		"uptime": m.UptimeStats,
	}
}

// IsUp returns true if monitor status is up
func (m *Monitor) IsUp() bool {
	return m.Status == StatusUp
}

// IsDown returns true if monitor status is down
func (m *Monitor) IsDown() bool {
	return m.Status == StatusDown
}

// GetUptimePercent calculates uptime percentage for given time range
func (m *Monitor) GetUptimePercent(hours int) float64 {
	key := "uptime_24h"
	if hours == 168 {
		key = "uptime_7d"
	} else if hours == 720 {
		key = "uptime_30d"
	}
	if val, ok := m.UptimeStats[key]; ok {
		return val
	}
	return 100.0
}
