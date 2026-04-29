import { pb } from "./api.ts"

export type MonitorType =
	| "http"
	| "https"
	| "tcp"
	| "ping"
	| "dns"
	| "keyword"
	| "json-query"
	| "docker"
	| "push"
	| "manual"
	| "system-service"
	| "real-browser"
	| "grpc-keyword"
	| "mqtt"
	| "rabbitmq"
	| "kafka-producer"
	| "smtp"
	| "snmp"
	| "sip-options"
	| "tailscale-ping"
	| "websocket-upgrade"
	| "globalping"
	| "mysql"
	| "mongodb"
	| "redis"
	| "postgresql"
	| "sqlserver"
	| "oracledb"
	| "radius"
	| "gamedig"
	| "steam"

export type MonitorStatus = "up" | "down" | "pending" | "paused" | "maintenance"

export interface Monitor {
	id: string
	name: string
	type: MonitorType
	url?: string
	hostname?: string
	port?: number
	method?: string
	interval: number
	timeout: number
	retries: number
	status: MonitorStatus
	active: boolean
	description?: string
	last_check?: string
	uptime_stats?: Record<string, number>
	tags?: string[]
	keyword?: string
	json_query?: string
	expected_value?: string
	invert_keyword?: boolean
	dns_resolve_server?: string
	dns_resolver_mode?: string
	cert_expiry_notification?: boolean
	cert_expiry_days?: number
	ignore_tls_error?: boolean
	// Notification settings
	notify_on_down?: boolean
	notify_on_recover?: boolean
	notify_on_response_time?: boolean
	response_time_threshold?: number
	notify_on_uptime_drop?: boolean
	uptime_threshold?: number
	notify_repeated_failures?: boolean
	consecutive_failures?: number
	quiet_hours_enabled?: boolean
	quiet_hours_start?: string
	quiet_hours_end?: string
	status_pages?: string[]
	created: string
	updated: string
}

export interface Heartbeat {
	id: string
	monitor: string
	status: MonitorStatus
	ping: number
	msg: string
	cert_expiry?: number
	cert_valid?: boolean
	time: string
}

export interface UptimeStats {
	total: number
	up: number
	down: number
	uptime_24h: number
	uptime_7d: number
	uptime_30d: number
}

export interface CreateMonitorRequest {
	name: string
	type: MonitorType
	url?: string
	hostname?: string
	port?: number
	method?: string
	headers?: string
	body?: string
	interval?: number
	timeout?: number
	retries?: number
	retry_interval?: number
	max_redirects?: number
	keyword?: string
	json_query?: string
	expected_value?: string
	invert_keyword?: boolean
	dns_resolve_server?: string
	dns_resolver_mode?: string
	description?: string
	tags?: string[]
	cert_expiry_notification?: boolean
	cert_expiry_days?: number
	ignore_tls_error?: boolean
	// Notification settings
	notify_on_down?: boolean
	notify_on_recover?: boolean
	notify_on_response_time?: boolean
	response_time_threshold?: number
	notify_on_uptime_drop?: boolean
	uptime_threshold?: number
	notify_repeated_failures?: boolean
	consecutive_failures?: number
	quiet_hours_enabled?: boolean
	quiet_hours_start?: string
	quiet_hours_end?: string
	// Database / network extra fields
	db_username?: string
	db_password?: string
	db_name?: string
	mqtt_topic?: string
	grpc_keyword?: string
}

export interface UpdateMonitorRequest {
	name?: string
	url?: string
	hostname?: string
	port?: number
	method?: string
	headers?: string
	body?: string
	interval?: number
	timeout?: number
	retries?: number
	retry_interval?: number
	max_redirects?: number
	keyword?: string
	json_query?: string
	expected_value?: string
	invert_keyword?: boolean
	dns_resolve_server?: string
	dns_resolver_mode?: string
	active?: boolean
	description?: string
	tags?: string[]
	cert_expiry_notification?: boolean
	cert_expiry_days?: number
	ignore_tls_error?: boolean
	// Notification settings
	notify_on_down?: boolean
	notify_on_recover?: boolean
	notify_on_response_time?: boolean
	response_time_threshold?: number
	notify_on_uptime_drop?: boolean
	uptime_threshold?: number
	notify_repeated_failures?: boolean
	consecutive_failures?: number
	quiet_hours_enabled?: boolean
	quiet_hours_start?: string
	quiet_hours_end?: string
	// Database / network extra fields
	db_username?: string
	db_password?: string
	db_name?: string
	mqtt_topic?: string
	grpc_keyword?: string
}

export interface CheckResult {
	status: MonitorStatus
	ping: number
	msg: string
	heartbeat_id?: string
	time?: string
}

// API Functions
export async function listMonitors(): Promise<Monitor[]> {
	const response = await pb.send<{ monitors: Monitor[] }>("/api/beszel/monitors", {})
	return response.monitors
}

export function getMonitor(id: string): Promise<Monitor> {
	return pb.send<Monitor>(`/api/beszel/monitors/${id}`, {})
}

export function createMonitor(data: CreateMonitorRequest): Promise<Monitor> {
	return pb.send<Monitor>("/api/beszel/monitors", {
		method: "POST",
		body: JSON.stringify(data),
	})
}

export function updateMonitor(id: string, data: UpdateMonitorRequest): Promise<Monitor> {
	return pb.send<Monitor>(`/api/beszel/monitors/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	})
}

export async function deleteMonitor(id: string): Promise<void> {
	await pb.send(`/api/beszel/monitors/${id}`, {
		method: "DELETE",
	})
}

export function manualCheck(id: string): Promise<CheckResult> {
	return pb.send<CheckResult>(`/api/beszel/monitors/${id}/check`, {
		method: "POST",
	})
}

export function pauseMonitor(id: string): Promise<Monitor> {
	return pb.send<Monitor>(`/api/beszel/monitors/${id}/pause`, {
		method: "POST",
	})
}

export function resumeMonitor(id: string): Promise<Monitor> {
	return pb.send<Monitor>(`/api/beszel/monitors/${id}/resume`, {
		method: "POST",
	})
}

export function getMonitorStats(id: string): Promise<{
	uptime_24h: UptimeStats
	uptime_7d: UptimeStats
	uptime_30d: UptimeStats
	uptime_percent_24h: number
	uptime_percent_7d: number
	uptime_percent_30d: number
	avg_ping_24h: number
}> {
	return pb.send(`/api/beszel/monitors/${id}/stats`, {})
}

export function getMonitorHeartbeats(id: string): Promise<{ heartbeats: Heartbeat[] }> {
	return pb.send(`/api/beszel/monitors/${id}/heartbeats`, {})
}

// Helper functions
export function getMonitorTypeLabel(type: MonitorType): string {
	const labels: Record<MonitorType, string> = {
		http: "HTTP",
		https: "HTTPS",
		tcp: "TCP Port",
		ping: "Ping",
		dns: "DNS",
		keyword: "HTTP Keyword",
		"json-query": "HTTP JSON",
		docker: "Docker Container",
		push: "Push",
		manual: "Manual",
		"system-service": "System Service",
		"real-browser": "Browser Engine (Beta)",
		"grpc-keyword": "gRPC Keyword",
		mqtt: "MQTT",
		rabbitmq: "RabbitMQ",
		"kafka-producer": "Kafka Producer",
		smtp: "SMTP",
		snmp: "SNMP",
		"sip-options": "SIP Options Ping",
		"tailscale-ping": "Tailscale Ping",
		"websocket-upgrade": "WebSocket Upgrade",
		globalping: "Globalping",
		mysql: "MySQL / MariaDB",
		mongodb: "MongoDB",
		redis: "Redis",
		postgresql: "PostgreSQL",
		sqlserver: "Microsoft SQL Server",
		oracledb: "Oracle DB",
		radius: "RADIUS",
		gamedig: "GameDig",
		steam: "Steam API",
	}
	return labels[type] || type
}

export function getMonitorStatusColor(status: MonitorStatus): string {
	switch (status) {
		case "up":
			return "bg-green-500"
		case "down":
			return "bg-red-500"
		case "paused":
			return "bg-yellow-500"
		case "maintenance":
			return "bg-blue-500"
		default:
			return "bg-gray-400"
	}
}

export function getMonitorStatusIcon(status: MonitorStatus): string {
	switch (status) {
		case "up":
			return "check-circle"
		case "down":
			return "x-circle"
		case "paused":
			return "pause-circle"
		case "maintenance":
			return "wrench"
		default:
			return "help-circle"
	}
}

export function formatUptime(uptime: number): string {
	if (uptime === undefined || uptime === null) return "N/A"
	return `${uptime.toFixed(2)}%`
}

export function formatPing(ping: number): string {
	if (ping === undefined || ping === null) return "N/A"
	if (ping < 1000) return `${ping}ms`
	return `${(ping / 1000).toFixed(2)}s`
}
