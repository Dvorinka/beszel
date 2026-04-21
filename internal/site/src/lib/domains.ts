import { pb } from "./api"

export interface Domain {
	id: string
	domain_name: string
	status: "active" | "expiring" | "expired" | "unknown" | "paused"
	active: boolean
	expiry_date?: string
	creation_date?: string
	updated_date?: string
	days_until_expiry?: number
	registrar_name?: string
	registrar_id?: string
	registrar_url?: string
	name_servers?: string[]
	mx_records?: string[]
	txt_records?: string[]
	ipv4_addresses?: string[]
	ipv6_addresses?: string[]
	ssl_issuer?: string
	ssl_valid_to?: string
	ssl_days_until?: number
	host_country?: string
	host_isp?: string
	purchase_price?: number
	current_value?: number
	renewal_cost?: number
	auto_renew: boolean
	alert_days_before: number
	ssl_alert_enabled: boolean
	tags?: string[]
	notes?: string
	favicon_url?: string
	last_checked?: string
	created: string
	updated: string
}

export interface DomainHistory {
	id: string
	change_type: "expiry" | "ssl" | "dns" | "registrar" | "ip" | "host" | "status"
	field_name: string
	old_value: string
	new_value: string
	created_at: string
}

export interface CreateDomainRequest {
	domain_name: string
	auto_lookup?: boolean
	tags?: string[]
	notes?: string
	purchase_price?: number
	current_value?: number
	renewal_cost?: number
	auto_renew?: boolean
	alert_days_before?: number
	ssl_alert_enabled?: boolean
}

export interface UpdateDomainRequest {
	tags?: string[]
	notes?: string
	purchase_price?: number
	current_value?: number
	renewal_cost?: number
	auto_renew?: boolean
	active?: boolean
	alert_days_before?: number
	ssl_alert_enabled?: boolean
}

export interface DomainLookupResult {
	domain_name: string
	status: string
	active: boolean
	expiry_date?: string
	creation_date?: string
	updated_date?: string
	registrar_name?: string
	registrar_id?: string
	registrar_url?: string
	dnssec?: string
	name_servers?: string[]
	mx_records?: string[]
	txt_records?: string[]
	ipv4_addresses?: string[]
	ipv6_addresses?: string[]
	ssl_issuer?: string
	ssl_valid_to?: string
	host_country?: string
	host_isp?: string
	favicon_url?: string
	last_checked?: string
}

const API_BASE = "/api/beszel/domains"

export async function getDomains(): Promise<Domain[]> {
	const response = await fetch(API_BASE, {
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`,
		},
	})
	if (!response.ok) {
		throw new Error(`Failed to fetch domains: ${response.statusText}`)
	}
	return response.json()
}

export async function lookupDomain(domainName: string): Promise<DomainLookupResult> {
	const response = await fetch(`${API_BASE}/lookup`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify({ domain_name: domainName }),
	})
	if (!response.ok) {
		throw new Error(`Failed to lookup domain: ${response.statusText}`)
	}
	return response.json()
}

export async function createDomain(data: CreateDomainRequest): Promise<Domain> {
	const response = await fetch(API_BASE, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		throw new Error(`Failed to create domain: ${response.statusText}`)
	}
	return response.json()
}

export async function getDomain(id: string): Promise<Domain> {
	const response = await fetch(`${API_BASE}/${id}`, {
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`,
		},
	})
	if (!response.ok) {
		throw new Error(`Failed to fetch domain: ${response.statusText}`)
	}
	return response.json()
}

export async function updateDomain(id: string, data: UpdateDomainRequest): Promise<Domain> {
	const response = await fetch(`${API_BASE}/${id}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${pb.authStore.token}`,
		},
		body: JSON.stringify(data),
	})
	if (!response.ok) {
		throw new Error(`Failed to update domain: ${response.statusText}`)
	}
	return response.json()
}

export async function deleteDomain(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/${id}`, {
		method: "DELETE",
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`,
		},
	})
	if (!response.ok) {
		throw new Error(`Failed to delete domain: ${response.statusText}`)
	}
}

export async function refreshDomain(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/${id}/refresh`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`,
		},
	})
	if (!response.ok) {
		throw new Error(`Failed to refresh domain: ${response.statusText}`)
	}
}

export async function getDomainHistory(id: string): Promise<DomainHistory[]> {
	const response = await fetch(`${API_BASE}/${id}/history`, {
		headers: {
			Authorization: `Bearer ${pb.authStore.token}`,
		},
	})
	if (!response.ok) {
		throw new Error(`Failed to fetch domain history: ${response.statusText}`)
	}
	return response.json()
}

export function getDomainFaviconUrl(domainName: string): string {
	return `https://www.google.com/s2/favicons?domain=${domainName}&sz=128`
}

export function getStatusBadgeColor(status: string): string {
	switch (status) {
		case "active":
			return "bg-green-500"
		case "expiring":
			return "bg-yellow-500"
		case "expired":
			return "bg-red-500"
		case "unknown":
			return "bg-gray-500"
		case "paused":
			return "bg-blue-500"
		default:
			return "bg-gray-500"
	}
}

export function getStatusLabel(status: string): string {
	switch (status) {
		case "active":
			return "Active"
		case "expiring":
			return "Expiring Soon"
		case "expired":
			return "Expired"
		case "unknown":
			return "Unknown"
		case "paused":
			return "Paused"
		default:
			return status
	}
}

export function formatDate(dateString?: string): string {
	if (!dateString) return "Unknown"
	const date = new Date(dateString)
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

export function formatDays(days?: number): string {
	if (days === undefined || days === null) return "Unknown"
	if (days < 0) return "Expired"
	if (days === 0) return "Today"
	if (days === 1) return "1 day"
	return `${days} days`
}

export function cleanDomain(domain: string): string {
	return domain
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.replace(/[\/\?#:].*$/, "")
		.toLowerCase()
		.trim()
}
