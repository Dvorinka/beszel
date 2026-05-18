import type { Domain } from "@/lib/domains"
import { formatDate, formatDays } from "@/lib/domains"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
	Globe,
	Shield,
	Server,
	MapPin,
	FileText,
	Building2,
	User,
	Eye,
	EyeOff,
	Mail,
	Network,
	Search,
	Code2,
	AlertTriangle,
	CheckCircle2,
	Clock,
	ExternalLink,
	Info,
} from "lucide-react"

// --- Reusable section wrapper inspired by domainstack.io ---

function SectionCard({
	title,
	description,
	icon: Icon,
	children,
	accent = "slate",
}: {
	title: string
	description?: string
	icon: React.ElementType
	children: React.ReactNode
	accent?: "blue" | "green" | "orange" | "purple" | "slate" | "red" | "yellow"
}) {
	const accentBorder = {
		blue: "border-t-blue-500/40",
		green: "border-t-green-500/40",
		orange: "border-t-orange-500/40",
		purple: "border-t-purple-500/40",
		slate: "border-t-slate-500/30",
		red: "border-t-red-500/40",
		yellow: "border-t-yellow-500/40",
	}
	const accentIcon = {
		blue: "text-blue-500",
		green: "text-green-500",
		orange: "text-orange-500",
		purple: "text-purple-500",
		slate: "text-slate-500",
		red: "text-red-500",
		yellow: "text-yellow-500",
	}

	return (
		<Card className={cn("overflow-hidden rounded-xl border-t-2", accentBorder[accent])}>
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2.5">
					<Icon className={cn("h-5 w-5", accentIcon[accent])} />
					<div>
						<CardTitle className="text-base">{title}</CardTitle>
						{description && <CardDescription className="text-xs">{description}</CardDescription>}
					</div>
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	)
}

function KV({
	label,
	value,
	suffix,
	leading,
}: {
	label: string
	value?: string | null
	suffix?: React.ReactNode
	leading?: React.ReactNode
}) {
	if (!value && value !== "0") return null
	return (
		<div className="flex h-14 min-w-0 items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2">
			<div className="flex min-w-0 flex-col">
				<div className="text-[10px] leading-none tracking-wider uppercase text-foreground/60">{label}</div>
				<div className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-foreground/90 mt-1">
					{leading ? <span className="shrink-0">{leading}</span> : null}
					<span className="truncate">{value}</span>
					{suffix ? <span className="shrink-0">{suffix}</span> : null}
				</div>
			</div>
		</div>
	)
}

function KVGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 | 4 }) {
	const colClass =
		cols === 4
			? "lg:grid-cols-4 md:grid-cols-2"
			: cols === 3
				? "sm:grid-cols-3"
				: cols === 1
					? "grid-cols-1"
					: "sm:grid-cols-2"
	return <div className={cn("grid grid-cols-1 gap-2", colClass)}>{children}</div>
}

function DnsGroup({
	type,
	records,
	ttl,
}: {
	type: string
	records: Array<{ value: string; ttl?: string | number }>
	ttl?: string | number
}) {
	if (!records?.length) return null
	return (
		<div className="space-y-1.5">
			<div className="flex items-center gap-2 mb-2">
				<Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0.5">
					{type}
				</Badge>
				<span className="text-xs text-muted-foreground">
					{records.length} record{records.length !== 1 ? "s" : ""}
				</span>
			</div>
			<div className="space-y-1">
				{records.map((rec, i) => (
					<div key={i} className="flex items-center gap-2 rounded-md border bg-background/40 px-2.5 py-1.5 text-sm">
						<code className="text-xs font-mono text-foreground/80 truncate flex-1">{rec.value}</code>
						{(rec.ttl || ttl) && (
							<span className="text-[10px] text-muted-foreground shrink-0">TTL {rec.ttl || ttl}</span>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

function MapEmbed({ lat, lon, title }: { lat: number; lon: number; title?: string }) {
	const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.8}%2C${lat - 0.8}%2C${lon + 0.8}%2C${lat + 0.8}&layer=mapnik&marker=${lat}%2C${lon}`
	return (
		<div className="relative h-[200px] w-full overflow-hidden rounded-lg border mt-2">
			<iframe title={title || "Location map"} src={mapUrl} className="h-full w-full border-0" loading="lazy" />
			<a
				href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`}
				target="_blank"
				rel="noopener noreferrer"
				className="absolute bottom-2 right-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm hover:bg-white border"
			>
				Open Map
			</a>
		</div>
	)
}

function StatusDot({ status }: { status: string }) {
	const colors: Record<string, string> = {
		up: "bg-green-500",
		down: "bg-red-500",
		paused: "bg-gray-400",
		active: "bg-green-500",
		expiring: "bg-yellow-500",
		expired: "bg-red-500",
		unknown: "bg-gray-400",
	}
	return <div className={cn("h-2.5 w-2.5 rounded-full", colors[status] || "bg-yellow-500")} />
}

function CertificateCard({
	cert,
	index,
	total,
}: {
	cert: NonNullable<Domain["certificates"]> extends Array<infer T> ? T : never
	index: number
	total: number
}) {
	const label = index === 0 ? "Leaf" : index === total - 1 ? "Root" : "Intermediate"
	return (
		<div className="rounded-lg border p-3 space-y-2">
			<div className="flex items-center gap-2 flex-wrap">
				<Badge variant={index === 0 ? "default" : "secondary"} className="text-[10px]">
					{label}
				</Badge>
				{cert.ca_provider && (
					<Badge variant="outline" className="text-[10px]">
						{cert.ca_provider}
					</Badge>
				)}
			</div>
			<div className="text-sm space-y-1">
				<p>
					<span className="text-muted-foreground text-xs">Subject:</span>{" "}
					<span className="font-medium">{cert.subject}</span>
				</p>
				<p>
					<span className="text-muted-foreground text-xs">Issuer:</span> {cert.issuer}
				</p>
			</div>
			{cert.alt_names && cert.alt_names.length > 0 && (
				<div>
					<p className="text-[10px] text-muted-foreground mb-1">SANs ({cert.alt_names.length})</p>
					<div className="flex flex-wrap gap-1">
						{cert.alt_names.slice(0, 6).map((name, j) => (
							<code key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
								{name}
							</code>
						))}
						{cert.alt_names.length > 6 && (
							<span className="text-[10px] text-muted-foreground">+{cert.alt_names.length - 6}</span>
						)}
					</div>
				</div>
			)}
			<div className="text-[10px] text-muted-foreground pt-1 border-t">
				{cert.valid_from} → {cert.valid_to}
			</div>
		</div>
	)
}

// --- Main exported sections ---

export function RegistrationSection({ domain }: { domain: Domain }) {
	return (
		<SectionCard title="Registration" description="Registrar and registrant details" icon={Building2} accent="blue">
			<KVGrid>
				<KV
					label="Registrar"
					value={domain.registrar_name || "Unknown"}
					leading={<Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
				/>
				<KV
					label="Registrant"
					value={
						domain.privacy_enabled
							? "Hidden (Privacy Protected)"
							: domain.registrant_name || domain.registrant_org || "Unknown"
					}
					leading={
						domain.privacy_enabled ? (
							<EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
						) : (
							<User className="h-3.5 w-3.5 text-muted-foreground" />
						)
					}
					suffix={
						domain.privacy_enabled !== undefined && (
							<Badge variant={domain.privacy_enabled ? "default" : "outline"} className="text-[10px]">
								{domain.privacy_enabled ? "Privacy On" : "Privacy Off"}
							</Badge>
						)
					}
				/>
				<KV label="Created" value={formatDate(domain.creation_date) || "Unknown"} />
				<KV
					label="Expires"
					value={formatDate(domain.expiry_date) || "Unknown"}
					suffix={
						domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 ? (
							<Badge
								variant={
									domain.days_until_expiry <= 7
										? "destructive"
										: domain.days_until_expiry <= 30
											? "outline"
											: "secondary"
								}
								className="text-[10px]"
							>
								{formatDays(domain.days_until_expiry)}
							</Badge>
						) : null
					}
				/>
				{domain.registrar_id && <KV label="Registrar IANA ID" value={domain.registrar_id} />}
				{domain.whois_server && <KV label="WHOIS Server" value={domain.whois_server} />}
			</KVGrid>
			{domain.whois_status && (
				<div className="mt-3 pt-3 border-t">
					<p className="text-[10px] uppercase tracking-wider text-foreground/60 mb-2">EPP Status Codes</p>
					<div className="flex flex-wrap gap-1.5">
						{domain.whois_status.split(", ").map((s, i) => (
							<Badge key={i} variant="secondary" className="text-[10px]">
								{s}
							</Badge>
						))}
					</div>
				</div>
			)}
		</SectionCard>
	)
}

export function HostingSection({ domain }: { domain: Domain }) {
	const location = [domain.host_city, domain.host_region, domain.host_country].filter(Boolean).join(", ") || null
	const hasCoords = domain.host_lat !== undefined && domain.host_lon !== undefined

	return (
		<SectionCard title="Hosting & Email" description="Providers and IP geolocation" icon={Server} accent="green">
			<KVGrid>
				{domain.dns_provider && (
					<KV
						label="DNS"
						value={domain.dns_provider}
						leading={<Network className="h-3.5 w-3.5 text-muted-foreground" />}
					/>
				)}
				{domain.hosting_provider && (
					<KV
						label="Hosting"
						value={domain.hosting_provider}
						leading={<Server className="h-3.5 w-3.5 text-muted-foreground" />}
					/>
				)}
				{domain.email_provider && (
					<KV
						label="Email"
						value={domain.email_provider}
						leading={<Mail className="h-3.5 w-3.5 text-muted-foreground" />}
					/>
				)}
				{domain.ca_provider && (
					<KV
						label="Certificate Authority"
						value={domain.ca_provider}
						leading={<Shield className="h-3.5 w-3.5 text-muted-foreground" />}
					/>
				)}
				{location && (
					<KV
						label="Location"
						value={location}
						leading={
							<span className="text-sm">
								{domain.host_country_code ? (
									<span title={domain.host_country_code}>
										{String.fromCodePoint(
											...domain.host_country_code
												.toUpperCase()
												.split("")
												.map((c) => 127397 + c.charCodeAt(0))
										)}
									</span>
								) : (
									<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
								)}
							</span>
						}
					/>
				)}
			</KVGrid>
			{hasCoords && domain.host_lat && domain.host_lon && (
				<MapEmbed lat={domain.host_lat} lon={domain.host_lon} title={`Map for ${domain.domain_name}`} />
			)}
			{/* IP Addresses */}
			<div className="mt-3 pt-3 border-t">
				<p className="text-[10px] uppercase tracking-wider text-foreground/60 mb-2">IP Addresses</p>
				<div className="space-y-1">
					{domain.ipv4_addresses?.map((ip) => (
						<div key={ip} className="flex items-center gap-2">
							<Badge variant="outline" className="text-[10px] font-mono">
								IPv4
							</Badge>
							<code className="text-sm font-mono">{ip}</code>
						</div>
					))}
					{domain.ipv6_addresses?.map((ip) => (
						<div key={ip} className="flex items-center gap-2">
							<Badge variant="outline" className="text-[10px] font-mono">
								IPv6
							</Badge>
							<code className="text-sm font-mono break-all">{ip}</code>
						</div>
					))}
					{!domain.ipv4_addresses?.length && !domain.ipv6_addresses?.length && (
						<p className="text-sm text-muted-foreground">No IP addresses found</p>
					)}
				</div>
			</div>
		</SectionCard>
	)
}

export function DnsSection({ domain }: { domain: Domain }) {
	const aRecords =
		domain.dns_a_records?.map((v) => ({ value: v })) || domain.ipv4_addresses?.map((v) => ({ value: v })) || []
	const aaaaRecords =
		domain.dns_aaaa_records?.map((v) => ({ value: v })) || domain.ipv6_addresses?.map((v) => ({ value: v })) || []
	const mxRecords =
		domain.dns_mx_records?.map((v) => ({ value: v })) || domain.mx_records?.map((v) => ({ value: v })) || []
	const nsRecords =
		domain.dns_ns_records?.map((v) => ({ value: v })) || domain.name_servers?.map((v) => ({ value: v })) || []
	const txtRecords =
		domain.dns_txt_records?.map((v) => ({ value: v })) || domain.txt_records?.map((v) => ({ value: v })) || []

	if (
		!aRecords.length &&
		!aaaaRecords.length &&
		!mxRecords.length &&
		!nsRecords.length &&
		!txtRecords.length &&
		!domain.cname_record &&
		!domain.srv_records?.length
	) {
		return (
			<SectionCard title="DNS Records" description="A, AAAA, MX, CNAME, TXT, NS" icon={Network} accent="orange">
				<div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">No DNS records available</p>
				</div>
			</SectionCard>
		)
	}

	return (
		<SectionCard title="DNS Records" description="A, AAAA, MX, CNAME, TXT, NS" icon={Network} accent="orange">
			<div className="space-y-4">
				<DnsGroup type="A" records={aRecords} />
				<DnsGroup type="AAAA" records={aaaaRecords} />
				{domain.cname_record && <DnsGroup type="CNAME" records={[{ value: domain.cname_record }]} />}
				<DnsGroup type="MX" records={mxRecords} />
				<DnsGroup type="TXT" records={txtRecords} />
				<DnsGroup type="NS" records={nsRecords} />
				{domain.srv_records && domain.srv_records.length > 0 && (
					<DnsGroup type="SRV" records={domain.srv_records.map((v) => ({ value: v }))} />
				)}
				{domain.dnssec && (
					<div className="flex items-center gap-2 pt-2 border-t">
						<span className="text-xs text-muted-foreground">DNSSEC</span>
						<Badge variant={domain.dnssec === "signed" ? "default" : "secondary"} className="text-[10px]">
							{domain.dnssec}
						</Badge>
					</div>
				)}
			</div>
		</SectionCard>
	)
}

export function SslSection({ domain }: { domain: Domain }) {
	if (!domain.ssl_valid_to) {
		return (
			<SectionCard title="SSL Certificates" description="Issuer and validity" icon={Shield} accent="purple">
				<div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">No SSL certificate information available</p>
				</div>
			</SectionCard>
		)
	}

	return (
		<SectionCard title="SSL Certificates" description="Issuer and validity" icon={Shield} accent="purple">
			<div className="space-y-3">
				<KVGrid>
					<KV
						label="Status"
						value={domain.ssl_days_until && domain.ssl_days_until > 0 ? "Valid" : "Expired"}
						leading={<StatusDot status={domain.ssl_days_until && domain.ssl_days_until > 0 ? "up" : "down"} />}
						suffix={
							domain.ssl_days_until !== undefined && (
								<Badge
									variant={
										domain.ssl_days_until <= 7 ? "destructive" : domain.ssl_days_until <= 30 ? "outline" : "secondary"
									}
									className="text-[10px]"
								>
									{formatDays(domain.ssl_days_until)}
								</Badge>
							)
						}
					/>
					<KV label="Subject" value={domain.ssl_subject || domain.domain_name} />
					<KV label="Issuer" value={domain.ssl_issuer || "Unknown"} />
					<KV label="Valid From" value={formatDate(domain.ssl_valid_from) || "Unknown"} />
					<KV label="Valid To" value={formatDate(domain.ssl_valid_to) || "Unknown"} />
					{domain.ssl_key_size && <KV label="Key Size" value={`${domain.ssl_key_size} bits`} />}
					{domain.ssl_signature_algo && <KV label="Algorithm" value={domain.ssl_signature_algo} />}
				</KVGrid>
				{domain.certificates && domain.certificates.length > 0 && (
					<div className="space-y-2 pt-2 border-t">
						<p className="text-[10px] uppercase tracking-wider text-foreground/60">
							Certificate Chain ({domain.certificates.length})
						</p>
						{domain.certificates.map((cert, i) => (
							<CertificateCard key={i} cert={cert} index={i} total={domain.certificates?.length ?? 0} />
						))}
					</div>
				)}
			</div>
		</SectionCard>
	)
}

export function SeoSection({ domain }: { domain: Domain }) {
	const seo = domain.seo_meta
	if (!seo) {
		return (
			<SectionCard title="SEO & Social" description="Meta tags, previews, robots.txt" icon={Search} accent="slate">
				<div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">No SEO data available</p>
				</div>
			</SectionCard>
		)
	}

	const metaTags = seo.general
	const og = seo.openGraph
	const twitter = seo.twitter
	const robots = seo.robots

	return (
		<SectionCard title="SEO & Social" description="Meta tags, previews, robots.txt" icon={Search} accent="slate">
			<div className="space-y-4">
				{/* Meta Tags */}
				{metaTags && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span className="text-xs font-medium">Meta Tags</span>
							{Object.values(metaTags).filter(Boolean).length > 0 && (
								<Badge variant="secondary" className="text-[10px]">
									{Object.values(metaTags).filter(Boolean).length}
								</Badge>
							)}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{metaTags.title && <KV label="Title" value={metaTags.title} />}
							{metaTags.description && <KV label="Description" value={metaTags.description} />}
							{metaTags.canonical && <KV label="Canonical" value={metaTags.canonical} />}
							{metaTags.robots && <KV label="Robots" value={metaTags.robots} />}
							{metaTags.author && <KV label="Author" value={metaTags.author} />}
							{metaTags.keywords && (
								<div className="sm:col-span-2">
									<KV
										label="Keywords"
										value={metaTags.keywords.substring(0, 120) + (metaTags.keywords.length > 120 ? "..." : "")}
									/>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Open Graph Preview */}
				{og && (og.title || og.description) && (
					<div className="pt-3 border-t">
						<div className="flex items-center gap-2 mb-2">
							<Globe className="h-4 w-4 text-muted-foreground" />
							<span className="text-xs font-medium">Open Graph</span>
						</div>
						<div className="rounded-lg border bg-background/40 p-3 space-y-1">
							{og.images && og.images.length > 0 && (
								<div className="mb-2">
									<img
										src={og.images[0]}
										alt="OG preview"
										className="max-h-32 rounded-md object-cover w-full"
										loading="lazy"
										onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
									/>
								</div>
							)}
							<p className="text-sm font-medium text-foreground/90">{og.title}</p>
							<p className="text-xs text-muted-foreground line-clamp-2">{og.description}</p>
							{og.url && (
								<a
									href={og.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-[10px] text-primary hover:underline truncate block"
								>
									{og.url}
								</a>
							)}
						</div>
					</div>
				)}

				{/* Twitter Card Preview */}
				{twitter && (twitter.title || twitter.description) && (
					<div className="pt-3 border-t">
						<div className="flex items-center gap-2 mb-2">
							<ExternalLink className="h-4 w-4 text-muted-foreground" />
							<span className="text-xs font-medium">Twitter/X Card</span>
							{twitter.card && (
								<Badge variant="outline" className="text-[10px]">
									{twitter.card}
								</Badge>
							)}
						</div>
						<div className="rounded-lg border bg-background/40 p-3 space-y-1">
							{twitter.image && (
								<img
									src={twitter.image}
									alt="Twitter preview"
									className="max-h-32 rounded-md object-cover w-full"
									loading="lazy"
									onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
								/>
							)}
							<p className="text-sm font-medium text-foreground/90">{twitter.title}</p>
							<p className="text-xs text-muted-foreground line-clamp-2">{twitter.description}</p>
						</div>
					</div>
				)}

				{/* robots.txt */}
				{robots?.fetched && (
					<div className="pt-3 border-t">
						<div className="flex items-center gap-2 mb-2">
							<Code2 className="h-4 w-4 text-muted-foreground" />
							<span className="text-xs font-medium">robots.txt</span>
						</div>
						{robots.sitemaps && robots.sitemaps.length > 0 && (
							<div className="mb-2">
								<p className="text-[10px] text-muted-foreground mb-1">Sitemaps</p>
								<div className="flex flex-wrap gap-1">
									{robots.sitemaps.map((s, i) => (
										<a
											key={i}
											href={s}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[10px] text-primary hover:underline truncate max-w-[300px]"
										>
											{s}
										</a>
									))}
								</div>
							</div>
						)}
						{robots.groups && robots.groups.length > 0 && (
							<div className="space-y-2">
								{robots.groups.map((group, i) => (
									<div key={i} className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
										<p className="text-muted-foreground font-medium">User-agent: {group.userAgents.join(", ")}</p>
										{group.rules.map((rule, j) => (
											<div key={j} className="flex items-center gap-1.5">
												{rule.type === "Allow" ? (
													<CheckCircle2 className="h-3 w-3 text-green-500" />
												) : (
													<AlertTriangle className="h-3 w-3 text-yellow-500" />
												)}
												<span className={rule.type === "Allow" ? "text-green-600" : "text-yellow-600"}>
													{rule.type}: {rule.value}
												</span>
											</div>
										))}
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</SectionCard>
	)
}

export function DomainTypeBadge({ type }: { type?: string }) {
	if (!type) return null
	const configs: Record<string, { color: string; icon: React.ElementType; label: string }> = {
		expiry: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock, label: "Expiry Monitor" },
		watchlist: { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Eye, label: "Watchlist" },
		portfolio: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Globe, label: "Portfolio" },
	}
	const config = configs[type] || configs.expiry
	const Icon = config.icon
	return (
		<Badge variant="outline" className={cn("gap-1 text-[10px]", config.color)}>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	)
}

export function ValuationSection({ domain }: { domain: Domain }) {
	const hasData = (domain.purchase_price ?? 0) > 0 || (domain.current_value ?? 0) > 0 || (domain.renewal_cost ?? 0) > 0
	if (!hasData) return null

	return (
		<SectionCard
			title="Valuation & Costs"
			description="Financial information and renewal settings"
			icon={FileText}
			accent="yellow"
		>
			<KVGrid>
				{(domain.purchase_price ?? 0) > 0 && <KV label="Purchase Price" value={`$${domain.purchase_price}`} />}
				{(domain.current_value ?? 0) > 0 && <KV label="Current Value" value={`$${domain.current_value}`} />}
				{(domain.renewal_cost ?? 0) > 0 && <KV label="Renewal Cost" value={`$${domain.renewal_cost}`} />}
				<KV
					label="Auto-renew"
					value={domain.auto_renew ? "Enabled" : "Disabled"}
					leading={
						domain.auto_renew ? (
							<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
						) : (
							<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
						)
					}
				/>
			</KVGrid>
		</SectionCard>
	)
}

export function DomainExpiryOverview({ domain }: { domain: Domain }) {
	return (
		<div className="grid sm:grid-cols-2 gap-4">
			{/* Domain Expiry */}
			<Card
				className={cn(
					"overflow-hidden",
					domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
						? "border-red-500/30"
						: domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
							? "border-yellow-500/30"
							: ""
				)}
			>
				<div
					className={cn(
						"h-1",
						domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
							? "bg-red-500"
							: domain.days_until_expiry !== undefined &&
									domain.days_until_expiry >= 0 &&
									domain.days_until_expiry <= 30
								? "bg-yellow-500"
								: "bg-green-500"
					)}
				/>
				<CardContent className="p-5">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									"p-2.5 rounded-xl",
									domain.days_until_expiry !== undefined &&
										domain.days_until_expiry >= 0 &&
										domain.days_until_expiry <= 7
										? "bg-red-500/10"
										: domain.days_until_expiry !== undefined &&
												domain.days_until_expiry >= 0 &&
												domain.days_until_expiry <= 30
											? "bg-yellow-500/10"
											: "bg-green-500/10"
								)}
							>
								<Globe
									className={cn(
										"h-5 w-5",
										domain.days_until_expiry !== undefined &&
											domain.days_until_expiry >= 0 &&
											domain.days_until_expiry <= 7
											? "text-red-500"
											: domain.days_until_expiry !== undefined &&
													domain.days_until_expiry >= 0 &&
													domain.days_until_expiry <= 30
												? "text-yellow-500"
												: "text-green-500"
									)}
								/>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Domain Expires</p>
								<p className="font-semibold">{formatDate(domain.expiry_date) || "N/A"}</p>
							</div>
						</div>
						<div
							className={cn(
								"text-xl font-bold",
								domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
									? "text-red-500"
									: domain.days_until_expiry !== undefined &&
											domain.days_until_expiry >= 0 &&
											domain.days_until_expiry <= 30
										? "text-yellow-500"
										: "text-green-500"
							)}
						>
							{typeof domain.days_until_expiry === "number" && domain.days_until_expiry >= 0
								? formatDays(domain.days_until_expiry)
								: domain.days_until_expiry === -1
									? "No data"
									: "N/A"}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* SSL Expiry */}
			<Card
				className={cn(
					"overflow-hidden",
					domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
						? "border-red-500/30"
						: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
							? "border-yellow-500/30"
							: ""
				)}
			>
				<div
					className={cn(
						"h-1",
						domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
							? "bg-red-500"
							: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
								? "bg-yellow-500"
								: "bg-green-500"
					)}
				/>
				<CardContent className="p-5">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-3">
							<div
								className={cn(
									"p-2.5 rounded-xl",
									domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
										? "bg-red-500/10"
										: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
											? "bg-yellow-500/10"
											: "bg-green-500/10"
								)}
							>
								<Shield
									className={cn(
										"h-5 w-5",
										domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
											? "text-red-500"
											: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
												? "text-yellow-500"
												: "text-green-500"
									)}
								/>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">SSL Expires</p>
								<p className="font-semibold">{formatDate(domain.ssl_valid_to) || "No SSL"}</p>
							</div>
						</div>
						<div
							className={cn(
								"text-xl font-bold",
								domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
									? "text-red-500"
									: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
										? "text-yellow-500"
										: "text-green-500"
							)}
						>
							{typeof domain.ssl_days_until === "number" && domain.ssl_days_until >= 0
								? formatDays(domain.ssl_days_until)
								: "N/A"}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
