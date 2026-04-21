import { pb } from "./api"

export interface Incident {
	id: string
	title: string
	description?: string
	type: "monitor_down" | "monitor_up" | "domain_expiring" | "domain_expired" | "ssl_expiring" | "system_offline" | "system_online"
	severity: "critical" | "high" | "medium" | "low"
	status: "open" | "acknowledged" | "resolved" | "closed"
	monitor?: string
	domain?: string
	system?: string
	assigned_to?: string
	started_at: string
	acknowledged_at?: string
	resolved_at?: string
	closed_at?: string
	resolution?: string
	root_cause?: string
	created: string
	updated: string
}

export interface IncidentUpdate {
	id: string
	message: string
	update_type: "note" | "status_change" | "assignment"
	old_status?: string
	new_status?: string
	created_by: string
	created_at: string
}

export interface IncidentStats {
	total_incidents: number
	open_incidents: number
	acknowledged_incidents: number
	resolved_incidents: number
	mttr_hours: number
}

export interface CalendarEvent {
	id: string
	title: string
	date: string
	type: "domain_expiry" | "ssl_expiry" | "incident"
	color: string
}

export interface CreateIncidentRequest {
	title: string
	description?: string
	type: string
	severity: string
	monitor?: string
	domain?: string
	system?: string
}

export interface ResolveIncidentRequest {
	resolution?: string
	root_cause?: string
}

const API_BASE = "/api/beszel/incidents"

export async function getIncidents(filters?: { status?: string; severity?: string }): Promise<Incident[]> {
	const params = new URLSearchParams()
	if (filters?.status) params.set("status", filters.status)
	if (filters?.severity) params.set("severity", filters.severity)
	
	const response = await fetch(`${API_BASE}?${params}`, {
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to fetch incidents: ${response.statusText}`)
	return response.json()
}

export async function getIncident(id: string): Promise<Incident> {
	const response = await fetch(`${API_BASE}/${id}`, {
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to fetch incident: ${response.statusText}`)
	return response.json()
}

export async function createIncident(data: CreateIncidentRequest): Promise<Incident> {
	const response = await fetch(API_BASE, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify(data),
	})
	if (!response.ok) throw new Error(`Failed to create incident: ${response.statusText}`)
	return response.json()
}

export async function acknowledgeIncident(id: string): Promise<Incident> {
	const response = await fetch(`${API_BASE}/${id}/acknowledge`, {
		method: "POST",
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to acknowledge: ${response.statusText}`)
	return response.json()
}

export async function resolveIncident(id: string, data?: ResolveIncidentRequest): Promise<Incident> {
	const response = await fetch(`${API_BASE}/${id}/resolve`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify(data || {}),
	})
	if (!response.ok) throw new Error(`Failed to resolve: ${response.statusText}`)
	return response.json()
}

export async function closeIncident(id: string): Promise<Incident> {
	const response = await fetch(`${API_BASE}/${id}/close`, {
		method: "POST",
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to close: ${response.statusText}`)
	return response.json()
}

export async function getIncidentUpdates(id: string): Promise<IncidentUpdate[]> {
	const response = await fetch(`${API_BASE}/${id}/updates`, {
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to fetch updates: ${response.statusText}`)
	return response.json()
}

export async function addIncidentUpdate(id: string, message: string): Promise<void> {
	const response = await fetch(`${API_BASE}/${id}/updates`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify({ message }),
	})
	if (!response.ok) throw new Error(`Failed to add update: ${response.statusText}`)
}

export async function getIncidentStats(): Promise<IncidentStats> {
	const response = await fetch(`${API_BASE}/stats`, {
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to fetch stats: ${response.statusText}`)
	return response.json()
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
	const response = await fetch(`${API_BASE}/calendar`, {
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
	})
	if (!response.ok) throw new Error(`Failed to fetch calendar: ${response.statusText}`)
	return response.json()
}

export function getSeverityColor(severity: string): string {
	switch (severity) {
		case "critical": return "bg-red-600"
		case "high": return "bg-orange-500"
		case "medium": return "bg-yellow-500"
		case "low": return "bg-blue-500"
		default: return "bg-gray-500"
	}
}

export function getStatusColor(status: string): string {
	switch (status) {
		case "open": return "bg-red-500"
		case "acknowledged": return "bg-yellow-500"
		case "resolved": return "bg-green-500"
		case "closed": return "bg-gray-500"
		default: return "bg-gray-500"
	}
}

export function formatDuration(startedAt: string): string {
	const start = new Date(startedAt)
	const now = new Date()
	const diff = now.getTime() - start.getTime()
	
	const hours = Math.floor(diff / (1000 * 60 * 60))
	const days = Math.floor(hours / 24)
	
	if (days > 0) return `${days}d ${hours % 24}h`
	if (hours > 0) return `${hours}h`
	return "< 1h"
}
