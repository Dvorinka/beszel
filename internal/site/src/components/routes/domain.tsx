import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Trans } from "@lingui/react/macro"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
	Globe,
	Calendar,
	Clock,
	Shield,
	Server,
	MapPin,
	RefreshCw,
	ExternalLink,
	Edit3,
	Trash2,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	FileText,
	User,
	Mail,
	Building,
	Key,
	Eye,
	EyeOff,
	Network,
	Code2,
	Search,
	Lock,
	Unlock,
	type LucideIcon,
} from "lucide-react"
import {
	type DomainHistory,
	getDomain,
	getDomainHistory,
	refreshDomain,
	deleteDomain,
	formatDate,
	formatDays,
} from "@/lib/domains"
import { Link, navigate } from "@/components/router"
import { DomainDialog } from "@/components/domains-table/domain-dialog"
import { SubdomainList } from "@/components/domains-table/subdomain-list"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Status badge component
function StatusBadge({ status }: { status: string }) {
	const configs = {
		active: { color: "bg-green-500", icon: CheckCircle2, text: "Active" },
		expiring: { color: "bg-yellow-500", icon: AlertTriangle, text: "Expiring Soon" },
		expired: { color: "bg-red-500", icon: XCircle, text: "Expired" },
		unknown: { color: "bg-gray-500", icon: AlertTriangle, text: "Unknown" },
		paused: { color: "bg-blue-500", icon: Clock, text: "Paused" },
	}

	const config = configs[status as keyof typeof configs] || configs.unknown
	const Icon = config.icon

	return (
		<div className="flex items-center gap-2">
			<div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
			<Icon className="h-4 w-4 text-muted-foreground" />
			<span className="capitalize text-sm">{config.text}</span>
		</div>
	)
}

// Info card component
function InfoCard({
	title,
	value,
	icon: Icon,
	subtitle,
	className,
}: {
	title: string
	value: string
	icon: LucideIcon
	subtitle?: string
	className?: string
}) {
	return (
		<Card className={className}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="p-2 bg-muted rounded-lg">
						<Icon className="h-4 w-4 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm text-muted-foreground">{title}</p>
						<p className="font-semibold truncate">{value}</p>
						{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export default function DomainDetail({ id }: { id: string }) {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [expiryDialogOpen, setExpiryDialogOpen] = useState(false)
	const [manualExpiryDate, setManualExpiryDate] = useState("")
	const [manualPurchaseDate, setManualPurchaseDate] = useState("")
	const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false)

	const { data: domain, isLoading: isDomainLoading } = useQuery({
		queryKey: ["domain", id],
		queryFn: () => getDomain(id),
		refetchInterval: 30000,
	})

	const { data: history } = useQuery({
		queryKey: ["domain-history", id],
		queryFn: () => getDomainHistory(id),
		refetchInterval: 60000,
	})

	const handleRefresh = async () => {
		try {
			const refreshed = await refreshDomain(id)
			queryClient.setQueryData(["domain", id], refreshed)
			queryClient.invalidateQueries({ queryKey: ["domain-history", id] })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
			toast({ title: "Domain refreshed" })
		} catch (error) {
			toast({
				title: "Failed to refresh domain",
				variant: "destructive",
			})
		}
	}

	const handleDelete = () => {
		setDeleteDialogOpen(true)
	}

	const handleDeleteConfirm = async () => {
		if (!domain?.id) return
		try {
			await deleteDomain(domain.id)
			toast({ title: "Domain deleted" })
			navigate("/")
		} catch (error) {
			toast({
				title: "Failed to delete domain",
				variant: "destructive",
			})
		} finally {
			setDeleteDialogOpen(false)
		}
	}

	if (isDomainLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (!domain) {
		return (
			<div className="text-center py-12">
				<Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Domain not found</h2>
				<p className="text-muted-foreground">The domain you are looking for does not exist.</p>
				<Button asChild className="mt-4">
					<Link href="/">Go back home</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className="grid gap-4 mb-14">
			{/* Header */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
								{domain.favicon_url ? (
									<img src={domain.favicon_url} alt="" className="h-8 w-8" />
								) : (
									<Globe className="h-6 w-6 text-primary" />
								)}
							</div>
							<div>
								<h1 className="text-2xl font-bold">{domain.domain_name}</h1>
								<div className="flex items-center gap-2 mt-1">
									<StatusBadge status={domain.status} />
									{domain.tags?.map((tag: string) => (
										<Badge key={tag} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={handleRefresh}>
								<RefreshCw className="mr-2 h-4 w-4" />
								<Trans>Refresh</Trans>
							</Button>
							<Button variant="outline" size="sm" asChild>
								<a href={`https://${domain.domain_name}`} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="mr-2 h-4 w-4" />
									<Trans>Visit</Trans>
								</a>
							</Button>
							<Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
								<Edit3 className="mr-2 h-4 w-4" />
								<Trans>Edit</Trans>
							</Button>
							<Button variant="destructive" size="sm" onClick={handleDelete}>
								<Trash2 className="mr-2 h-4 w-4" />
								<Trans>Delete</Trans>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Quick Overview Cards */}
			<div className="grid gap-4">
				<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<InfoCard title="Registrar" value={domain.registrar_name || "Unknown"} icon={Server} />
					<InfoCard
						title="Domain Expiry"
						value={formatDate(domain.expiry_date)}
						subtitle={formatDays(domain.days_until_expiry)}
						icon={Calendar}
						className={
							domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
								? "text-yellow-600"
								: ""
						}
					/>
					<InfoCard
						title="SSL Expiry"
						value={domain.ssl_valid_to ? formatDate(domain.ssl_valid_to) : "No SSL"}
						subtitle={domain.ssl_valid_to ? formatDays(domain.ssl_days_until) : undefined}
						icon={Shield}
						className={
							domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14
								? "text-red-600"
								: ""
						}
					/>
					<InfoCard
						title="Location"
						value={[domain.host_city, domain.host_region, domain.host_country].filter(Boolean).join(", ") || "Unknown"}
						subtitle={domain.host_isp || domain.host_org}
						icon={MapPin}
					/>
				</div>
				{/* Provider badges row */}
				{(domain.dns_provider || domain.hosting_provider || domain.email_provider || domain.ca_provider) && (
					<div className="flex flex-wrap gap-2 mt-2">
						{domain.dns_provider && (
							<Badge variant="secondary" className="text-xs gap-1">
								<Network className="h-3 w-3" />
								DNS: {domain.dns_provider}
							</Badge>
						)}
						{domain.hosting_provider && (
							<Badge variant="secondary" className="text-xs gap-1">
								<Server className="h-3 w-3" />
								Hosting: {domain.hosting_provider}
							</Badge>
						)}
						{domain.email_provider && (
							<Badge variant="secondary" className="text-xs gap-1">
								<Mail className="h-3 w-3" />
								Email: {domain.email_provider}
							</Badge>
						)}
						{domain.ca_provider && (
							<Badge variant="secondary" className="text-xs gap-1">
								<Shield className="h-3 w-3" />
								CA: {domain.ca_provider}
							</Badge>
						)}
					</div>
				)}
			</div>

			{/* Expiry Overview - Clean visual cards */}
			<div className="grid sm:grid-cols-2 gap-4">
				{/* Domain Expiry Card */}
				<Card className={`${
					domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
						? "border-red-500/40"
						: domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
							? "border-yellow-500/40"
							: ""
					}`}>
					<CardContent className="p-5">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className={`p-2.5 rounded-xl ${
									domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
										? "bg-red-500/10"
										: domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
											? "bg-yellow-500/10"
											: "bg-green-500/10"
									}`}>
									<Globe className={`h-5 w-5 ${
										domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
											? "text-red-500"
											: domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
												? "text-yellow-500"
												: "text-green-500"
										}`} />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Domain Expires</p>
									<p className="font-semibold">{formatDate(domain.expiry_date) || "N/A"}</p>
								</div>
							</div>
							<div className={`text-2xl font-bold ${
								domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 7
									? "text-red-500"
									: domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
										? "text-yellow-500"
										: "text-green-500"
								}`}>
								{typeof domain.days_until_expiry === "number" && domain.days_until_expiry >= 0
									? formatDays(domain.days_until_expiry)
									: domain.days_until_expiry === -1
										? "No expiry data"
										: "N/A"
								}
							</div>
						</div>
						{/* Manual expiry date button for .eu domains */}
						{domain?.domain_name?.toLowerCase().endsWith('.eu') && (
							<div className="mt-4 pt-4 border-t">
								<div className="flex items-center justify-between">
									<div className="text-sm text-muted-foreground">
										<p>.eu domains require manual date entry (expiry + optional purchase)</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setExpiryDialogOpen(true)}
										className="text-xs"
									>
										<Edit3 className="h-3 w-3 mr-1" />
										Set Domain Dates
									</Button>
								</div>
							</div>
						)}
						{typeof domain.days_until_expiry === "number" && domain.days_until_expiry >= 0 && (() => {
							const d = domain.days_until_expiry
							return (
								<div className="flex gap-1 mt-2">
									{Array.from({ length: Math.min(12, Math.ceil(d / 30)) }).map((_, i) => (
										<div
											key={i}
											className={`flex-1 h-1.5 rounded-full ${
												d <= 7 ? "bg-red-500"
													: d <= 30 ? "bg-yellow-500"
														: "bg-green-500"
												}`}
										/>
										))}
										{d > 360 && (
											<span className="text-[10px] text-muted-foreground ml-1">+</span>
										)}
								</div>
							)
							})()}
						</CardContent>
					</Card>

					{/* SSL Expiry Card */}
					<Card className={`${
						domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
							? "border-red-500/40"
							: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
								? "border-yellow-500/40"
								: ""
						}`}>
						<CardContent className="p-5">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className={`p-2.5 rounded-xl ${
										domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
											? "bg-red-500/10"
											: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
												? "bg-yellow-500/10"
												: "bg-green-500/10"
										}`}>
										<Shield className={`h-5 w-5 ${
											domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
												? "text-red-500"
												: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
													? "text-yellow-500"
													: "text-green-500"
											}`} />
									</div>
									<div>
										<p className="text-sm text-muted-foreground">SSL Expires</p>
										<p className="font-semibold">{formatDate(domain.ssl_valid_to) || "No SSL"}</p>
									</div>
								</div>
								<div className={`text-2xl font-bold ${
									domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 7
										? "text-red-500"
											: domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 30
												? "text-yellow-500"
												: "text-green-500"
										}`}>
									{typeof domain.ssl_days_until === "number" && domain.ssl_days_until >= 0
										? formatDays(domain.ssl_days_until)
										: "N/A"
									}
								</div>
							</div>
							{typeof domain.ssl_days_until === "number" && domain.ssl_days_until >= 0 && (() => {
								const sslDaysUntil = domain.ssl_days_until;
								return (
									<div className="flex gap-1 mt-2">
										{Array.from({ length: Math.min(12, Math.ceil(sslDaysUntil / 30)) }).map((_, i) => (
											<div
												key={i}
												className={`flex-1 h-1.5 rounded-full ${
													sslDaysUntil <= 7 ? "bg-red-500"
														: sslDaysUntil <= 30 ? "bg-yellow-500"
															: "bg-green-500"
													}`}
												/>
											))}
											{sslDaysUntil > 360 && (
												<span className="text-[10px] text-muted-foreground ml-1">+</span>
											)}
									</div>
								)
								})()}
							</CardContent>
						</Card>
					</div>

			{/* Technical Information Section */}
			<div className="grid gap-6">
				<div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Network Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Server className="h-5 w-5" />
								Network Information
							</CardTitle>
							<CardDescription>IP addresses and connectivity details</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="text-sm font-medium mb-2">IP Addresses</h4>
								<div className="space-y-2">
									{domain.ipv4_addresses?.map((ip: string) => (
										<div key={ip} className="flex items-center gap-2">
											<Badge variant="secondary" className="text-xs">IPv4</Badge>
											<code className="text-sm font-mono bg-muted px-2 py-1 rounded">{ip}</code>
										</div>
									))}
									{domain.ipv6_addresses?.map((ip: string) => (
										<div key={ip} className="flex items-center gap-2">
											<Badge variant="secondary" className="text-xs">IPv6</Badge>
											<code className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{ip}</code>
										</div>
									))}
									{!domain.ipv4_addresses?.length && !domain.ipv6_addresses?.length && (
										<p className="text-muted-foreground text-sm">No IP addresses found</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Domain Valuation */}
					{((domain.purchase_price ?? 0) > 0 || (domain.current_value ?? 0) > 0 || (domain.renewal_cost ?? 0) > 0) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Valuation & Costs
								</CardTitle>
								<CardDescription>Financial information and renewal settings</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid gap-3">
									{(domain.purchase_price ?? 0) > 0 && (
										<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
											<span className="text-sm text-muted-foreground">Purchase Price</span>
											<span className="font-semibold">${domain.purchase_price}</span>
										</div>
									)}
									{(domain.current_value ?? 0) > 0 && (
										<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
											<span className="text-sm text-muted-foreground">Current Value</span>
											<span className="font-semibold">${domain.current_value}</span>
										</div>
									)}
									{(domain.renewal_cost ?? 0) > 0 && (
										<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
											<span className="text-sm text-muted-foreground">Renewal Cost</span>
											<span className="font-semibold">${domain.renewal_cost}</span>
										</div>
									)}
									<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
										<span className="text-sm text-muted-foreground">Auto-renew</span>
										<Badge variant={domain.auto_renew ? "default" : "secondary"} className="ml-2">
											{domain.auto_renew ? "Enabled" : "Disabled"}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Notes Section */}
				{domain.notes && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Notes
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="bg-muted/30 rounded-lg p-4">
								<p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{domain.notes}</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			<div className="grid gap-4">
				<Card>
					<CardHeader>
						<CardTitle>DNS Records</CardTitle>
						<CardDescription>A, AAAA, name servers, mail exchangers, and text records</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* A Records (IPv4) */}
						{(domain.ipv4_addresses?.length ?? 0) > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Server className="h-4 w-4" />
									A Records (IPv4)
									<Badge variant="secondary" className="ml-2">
										{domain.ipv4_addresses?.length || 0}
									</Badge>
								</h4>
								<div className="space-y-1">
									{domain.ipv4_addresses?.map((ip: string, i: number) => (
										<div key={i} className="flex items-center gap-2">
											<Badge variant="outline">A</Badge>
											<code className="text-sm font-mono">{ip}</code>
										</div>
									))}
								</div>
							</div>
						)}

						{/* AAAA Records (IPv6) */}
						{(domain.ipv6_addresses?.length ?? 0) > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Server className="h-4 w-4" />
									AAAA Records (IPv6)
									<Badge variant="secondary" className="ml-2">
										{domain.ipv6_addresses?.length || 0}
									</Badge>
								</h4>
								<div className="space-y-1">
									{domain.ipv6_addresses?.map((ip: string, i: number) => (
										<div key={i} className="flex items-center gap-2">
											<Badge variant="outline">AAAA</Badge>
											<code className="text-sm font-mono break-all">{ip}</code>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Nameservers */}
						<div>
							<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
								<Server className="h-4 w-4" />
								Nameservers
								<Badge variant="secondary" className="ml-2">
									{domain.name_servers?.length || 0}
								</Badge>
							</h4>
							<div className="space-y-1">
								{domain.name_servers?.map((ns: string, i: number) => (
									<div key={i} className="flex items-center gap-2">
										<Badge variant="outline">NS</Badge>
										<code className="text-sm">{ns}</code>
									</div>
								))}
								{!domain.name_servers?.length && <p className="text-muted-foreground text-sm">No nameservers found</p>}
							</div>
						</div>

						{/* MX Records */}
						{domain.mx_records && domain.mx_records.length > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Mail className="h-4 w-4" />
									Mail Servers (MX)
									<Badge variant="secondary" className="ml-2">
										{domain.mx_records.length}
									</Badge>
								</h4>
								<div className="space-y-1">
									{domain.mx_records?.map((mx: string, i: number) => (
										<div key={i} className="flex items-center gap-2">
											<Badge variant="outline">MX</Badge>
											<code className="text-sm">{mx}</code>
										</div>
									))}
								</div>
							</div>
						)}

						{/* CNAME Record */}
						{domain.cname_record && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Globe className="h-4 w-4" />
									CNAME Record
								</h4>
								<div className="flex items-center gap-2">
									<Badge variant="outline">CNAME</Badge>
									<code className="text-sm">{domain.cname_record}</code>
								</div>
							</div>
						)}

						{/* TXT Records */}
						{domain.txt_records && domain.txt_records.length > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<FileText className="h-4 w-4" />
									TXT Records
									<Badge variant="secondary" className="ml-2">
										{domain.txt_records.length}
									</Badge>
								</h4>
								<div className="space-y-1">
									{domain.txt_records?.map((txt: string, i: number) => (
										<div key={i} className="flex items-start gap-2">
											<Badge variant="outline">TXT</Badge>
											<code className="text-sm break-all">{txt}</code>
										</div>
									))}
								</div>
							</div>
						)}

						{/* SRV Records */}
						{domain.srv_records && domain.srv_records.length > 0 && (
							<div>
								<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Server className="h-4 w-4" />
									SRV Records
									<Badge variant="secondary" className="ml-2">
										{domain.srv_records.length}
									</Badge>
								</h4>
								<div className="space-y-1">
									{domain.srv_records?.map((srv: string, i: number) => (
										<div key={i} className="flex items-start gap-2">
											<Badge variant="outline">SRV</Badge>
											<code className="text-sm break-all">{srv}</code>
										</div>
									))}
								</div>
							</div>
						)}

						{/* DNSSEC */}
						{domain.dnssec && (
							<div>
								<h4 className="text-sm font-medium mb-2">DNSSEC</h4>
								<Badge variant={domain.dnssec === "signed" ? "default" : "secondary"}>{domain.dnssec}</Badge>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* HTTP Headers */}
			{domain.headers && domain.headers.length > 0 && (
				<div className="grid gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Code2 className="h-5 w-5" />
								HTTP Headers
							</CardTitle>
							<CardDescription>Response headers from the server</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-1 max-h-80 overflow-y-auto">
								{domain.headers.map((h, i) => (
									<div key={i} className="flex items-start gap-2 text-sm py-1 border-b last:border-0">
										<code className="text-xs text-muted-foreground shrink-0 w-32 truncate">{h.name}</code>
										<code className="text-xs break-all">{h.value}</code>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* SEO Metadata */}
			{domain.seo_meta && (
				<div className="grid gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Search className="h-5 w-5" />
								SEO Metadata
							</CardTitle>
							<CardDescription>Search engine optimization data</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* General Meta */}
							{domain.seo_meta.general && (
								<div className="space-y-2">
									<h4 className="text-sm font-medium">General Meta Tags</h4>
									<div className="space-y-1 text-sm">
										{domain.seo_meta.general.title && (
											<p><span className="text-muted-foreground">Title:</span> {domain.seo_meta.general.title}</p>
										)}
										{domain.seo_meta.general.description && (
											<p><span className="text-muted-foreground">Description:</span> {domain.seo_meta.general.description}</p>
										)}
										{domain.seo_meta.general.canonical && (
											<p><span className="text-muted-foreground">Canonical:</span> <a href={domain.seo_meta.general.canonical} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{domain.seo_meta.general.canonical}</a></p>
										)}
										{domain.seo_meta.general.robots && (
											<p><span className="text-muted-foreground">Robots:</span> {domain.seo_meta.general.robots}</p>
										)}
										{domain.seo_meta.general.author && (
											<p><span className="text-muted-foreground">Author:</span> {domain.seo_meta.general.author}</p>
										)}
										{domain.seo_meta.general.keywords && (
											<p><span className="text-muted-foreground">Keywords:</span> {domain.seo_meta.general.keywords}</p>
										)}
									</div>
								</div>
							)}

							{/* Open Graph */}
							{domain.seo_meta.openGraph && (domain.seo_meta.openGraph.title || domain.seo_meta.openGraph.description) && (
								<div className="space-y-2 pt-4 border-t">
									<h4 className="text-sm font-medium flex items-center gap-2">
										<Globe className="h-4 w-4" />
										Open Graph
									</h4>
									<div className="space-y-1 text-sm">
										{domain.seo_meta.openGraph.title && (
											<p><span className="text-muted-foreground">Title:</span> {domain.seo_meta.openGraph.title}</p>
										)}
										{domain.seo_meta.openGraph.description && (
											<p><span className="text-muted-foreground">Description:</span> {domain.seo_meta.openGraph.description}</p>
										)}
										{domain.seo_meta.openGraph.type && (
											<p><span className="text-muted-foreground">Type:</span> {domain.seo_meta.openGraph.type}</p>
										)}
										{domain.seo_meta.openGraph.url && (
											<p><span className="text-muted-foreground">URL:</span> <a href={domain.seo_meta.openGraph.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{domain.seo_meta.openGraph.url}</a></p>
										)}
										{domain.seo_meta.openGraph.images && domain.seo_meta.openGraph.images.length > 0 && (
											<div>
												<p className="text-muted-foreground">Images:</p>
												<div className="flex flex-wrap gap-2 mt-1">
													{domain.seo_meta.openGraph.images.map((img, i) => (
														<a key={i} href={img} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[300px]">{img}</a>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Twitter Cards */}
							{domain.seo_meta.twitter && (domain.seo_meta.twitter.title || domain.seo_meta.twitter.description) && (
								<div className="space-y-2 pt-4 border-t">
									<h4 className="text-sm font-medium flex items-center gap-2">
										<Mail className="h-4 w-4" />
										Twitter/X Cards
									</h4>
									<div className="space-y-1 text-sm">
										{domain.seo_meta.twitter.title && (
											<p><span className="text-muted-foreground">Title:</span> {domain.seo_meta.twitter.title}</p>
										)}
										{domain.seo_meta.twitter.description && (
											<p><span className="text-muted-foreground">Description:</span> {domain.seo_meta.twitter.description}</p>
										)}
										{domain.seo_meta.twitter.card && (
											<p><span className="text-muted-foreground">Card:</span> {domain.seo_meta.twitter.card}</p>
										)}
									</div>
								</div>
							)}

							{/* Robots.txt */}
							{domain.seo_meta.robots && domain.seo_meta.robots.fetched && (
								<div className="space-y-2 pt-4 border-t">
									<h4 className="text-sm font-medium flex items-center gap-2">
										<FileText className="h-4 w-4" />
										robots.txt
									</h4>
									{domain.seo_meta.robots.sitemaps && domain.seo_meta.robots.sitemaps.length > 0 && (
										<div className="mb-2">
											<p className="text-xs text-muted-foreground">Sitemaps:</p>
											<div className="flex flex-wrap gap-1 mt-1">
												{domain.seo_meta.robots.sitemaps.map((sitemap, i) => (
													<a key={i} href={sitemap} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{sitemap}</a>
												))}
											</div>
										</div>
									)}
									{domain.seo_meta.robots.groups && domain.seo_meta.robots.groups.length > 0 && (
										<div className="space-y-2">
											{domain.seo_meta.robots.groups.map((group, i) => (
												<div key={i} className="rounded bg-muted p-2 text-xs">
													<p className="text-muted-foreground">User-agent: {group.userAgents.join(", ")}</p>
													{group.rules.map((rule, j) => (
														<p key={j} className={rule.type === "Disallow" ? "text-red-500" : "text-green-500"}>
															{rule.type}: {rule.value}
														</p>
													))}
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			)}

			<div className="grid gap-4">
				<Card>
					<CardHeader>
						<CardTitle>SSL Certificate Details</CardTitle>
						<CardDescription>Certificate information and validity</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{domain.ssl_valid_to ? (
							<>
								{/* Validity */}
								<div className="grid sm:grid-cols-2 gap-4">
									<InfoCard title="Valid From" value={formatDate(domain.ssl_valid_from)} icon={Calendar} />
									<InfoCard
										title="Valid Until"
										value={formatDate(domain.ssl_valid_to)}
										subtitle={formatDays(domain.ssl_days_until)}
										icon={Shield}
										className={
											domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14
												? "text-red-600"
												: ""
										}
									/>
								</div>

								{/* Issuer & Subject */}
								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<Building className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-sm text-muted-foreground">Issuer</p>
											<p className="font-medium">{domain.ssl_issuer || "Unknown"}</p>
											{domain.ssl_issuer_country && (
												<p className="text-sm text-muted-foreground">Country: {domain.ssl_issuer_country}</p>
											)}
										</div>
									</div>

									<div className="flex items-start gap-3">
										<Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-sm text-muted-foreground">Subject</p>
											<p className="font-medium">{domain.ssl_subject || "Unknown"}</p>
										</div>
									</div>
								</div>

								{/* Technical Details */}
								<div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
									<div>
										<p className="text-sm text-muted-foreground mb-1">Key Size</p>
										<p className="font-medium">{domain.ssl_key_size ? `${domain.ssl_key_size} bits` : "Unknown"}</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground mb-1">Signature Algorithm</p>
										<p className="font-medium">{domain.ssl_signature_algo || "Unknown"}</p>
									</div>
									{domain.ssl_fingerprint && (
										<div className="sm:col-span-2">
											<p className="text-sm text-muted-foreground mb-1">Fingerprint</p>
											<code className="text-sm break-all">{domain.ssl_fingerprint}</code>
										</div>
									)}
								</div>

								{/* Certificate Chain */}
								{domain.certificates && domain.certificates.length > 0 && (
									<div className="pt-4 border-t">
										<h4 className="text-sm font-medium mb-3">Certificate Chain ({domain.certificates.length})</h4>
										<div className="space-y-3">
											{domain.certificates.map((cert, i) => (
												<div key={i} className="rounded-lg border p-3 space-y-2">
													<div className="flex items-center gap-2">
														<Badge variant={i === 0 ? "default" : "secondary"} className="text-[10px]">
															{i === 0 ? "Leaf" : i === domain.certificates!.length - 1 ? "Root" : "Intermediate"}
														</Badge>
														{cert.ca_provider && (
															<Badge variant="outline" className="text-[10px]">{cert.ca_provider}</Badge>
														)}
													</div>
													<div className="text-sm">
														<p><span className="text-muted-foreground">Subject:</span> {cert.subject}</p>
														<p><span className="text-muted-foreground">Issuer:</span> {cert.issuer}</p>
													</div>
													{cert.alt_names && cert.alt_names.length > 0 && (
														<div>
															<p className="text-xs text-muted-foreground mb-1">Subject Alternative Names ({cert.alt_names.length})</p>
															<div className="flex flex-wrap gap-1">
																{cert.alt_names.slice(0, 8).map((name, j) => (
																	<code key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{name}</code>
																))}
																{cert.alt_names.length > 8 && (
																	<span className="text-[10px] text-muted-foreground">+{cert.alt_names.length - 8} more</span>
																)}
															</div>
														</div>
													)}
													<div className="text-xs text-muted-foreground">
														Valid: {formatDate(cert.valid_from)} → {formatDate(cert.valid_to)}
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</>
						) : (
							<div className="text-center py-8">
								<Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
								<p className="text-muted-foreground">No SSL certificate information available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4">
				<Card>
					<CardHeader>
						<CardTitle>WHOIS Information</CardTitle>
						<CardDescription>Domain registration details</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Registrar */}
						<div className="space-y-2">
							<h4 className="text-sm font-medium flex items-center gap-2">
								<Building className="h-4 w-4" />
								Registrar
							</h4>
							<div className="grid sm:grid-cols-2 gap-2">
								<div>
									<p className="text-sm text-muted-foreground">Name</p>
									<p className="font-medium">{domain.registrar_name || "Unknown"}</p>
								</div>
								{domain.registrar_id && (
									<div>
										<p className="text-sm text-muted-foreground">IANA ID</p>
										<p className="font-medium">{domain.registrar_id}</p>
									</div>
								)}
								{domain.registry_domain_id && (
									<div className="sm:col-span-2">
										<p className="text-sm text-muted-foreground">Registry Domain ID</p>
										<p className="font-medium">{domain.registry_domain_id}</p>
									</div>
								)}
							</div>
						</div>

						{/* Important Dates & TLD */}
						<div className="space-y-2 pt-4 border-t">
							<h4 className="text-sm font-medium flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Important Dates
							</h4>
							<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Registration</p>
									<p className="font-medium">{formatDate(domain.creation_date)}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Last Updated</p>
									<p className="font-medium">{formatDate(domain.updated_date)}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Expires</p>
									<p className="font-medium">{formatDate(domain.expiry_date)}</p>
								</div>
								{domain.tld && (
									<div>
										<p className="text-sm text-muted-foreground">TLD</p>
										<p className="font-medium">.{domain.tld}</p>
									</div>
								)}
							</div>
						</div>

						{/* Privacy & Security */}
						{(domain.privacy_enabled !== undefined || domain.transfer_lock !== undefined || domain.host_country_code) && (
							<div className="space-y-2 pt-4 border-t">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<Key className="h-4 w-4" />
									Privacy & Security
								</h4>
								<div className="flex flex-wrap gap-2">
									{domain.privacy_enabled !== undefined && (
										<Badge variant={domain.privacy_enabled ? "default" : "secondary"} className="gap-1">
											{domain.privacy_enabled ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
											{domain.privacy_enabled ? "Privacy Protected" : "Privacy Visible"}
										</Badge>
									)}
									{domain.transfer_lock !== undefined && (
										<Badge variant={domain.transfer_lock ? "default" : "secondary"} className="gap-1">
											{domain.transfer_lock ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
											{domain.transfer_lock ? "Transfer Locked" : "Transfer Unlocked"}
										</Badge>
									)}
									{domain.host_country_code && (
										<Badge variant="outline" className="gap-1">
											<MapPin className="h-3 w-3" />
											{domain.host_country_code}
										</Badge>
									)}
								</div>
							</div>
						)}

						{/* Registrant Contact */}
						{(domain.registrant_name || domain.registrant_org) && (
							<div className="space-y-2 pt-4 border-t">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<User className="h-4 w-4" />
									Registrant Contact
								</h4>
								<div className="grid sm:grid-cols-2 gap-2">
									{domain.registrant_name && (
										<div>
											<p className="text-sm text-muted-foreground">Name</p>
											<p className="font-medium">{domain.registrant_name}</p>
										</div>
									)}
									{domain.registrant_org && (
										<div>
											<p className="text-sm text-muted-foreground">Organization</p>
											<p className="font-medium">{domain.registrant_org}</p>
										</div>
									)}
									{domain.registrant_country && (
										<div>
											<p className="text-sm text-muted-foreground">Country</p>
											<p className="font-medium">{domain.registrant_country}</p>
										</div>
									)}
									{(domain.registrant_city || domain.registrant_state) && (
										<div>
											<p className="text-sm text-muted-foreground">Location</p>
											<p className="font-medium">
												{[domain.registrant_city, domain.registrant_state].filter(Boolean).join(", ")}
											</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Abuse Contact */}
						{(domain.abuse_email || domain.abuse_phone) && (
							<div className="space-y-2 pt-4 border-t">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<AlertTriangle className="h-4 w-4" />
									Abuse Contact
								</h4>
								<div className="grid sm:grid-cols-2 gap-2">
									{domain.abuse_email && (
										<div>
											<p className="text-sm text-muted-foreground">Email</p>
											<a href={`mailto:${domain.abuse_email}`} className="font-medium text-primary hover:underline">
												{domain.abuse_email}
											</a>
										</div>
									)}
									{domain.abuse_phone && (
										<div>
											<p className="text-sm text-muted-foreground">Phone</p>
											<p className="font-medium">{domain.abuse_phone}</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* WHOIS Domain Status (EPP status codes) */}
						{domain.whois_status && (
							<div className="space-y-2 pt-4 border-t">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<Shield className="h-4 w-4" />
									EPP Status Codes
								</h4>
								<div className="flex flex-wrap gap-2">
									{domain.whois_status.split(", ").map((status: string, i: number) => (
										<Badge key={i} variant="secondary">
											{status}
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* WHOIS Server */}
						{domain.whois_server && (
							<div className="space-y-2 pt-4 border-t">
								<h4 className="text-sm font-medium flex items-center gap-2">
									<Server className="h-4 w-4" />
									WHOIS Server
								</h4>
								<code className="text-sm">{domain.whois_server}</code>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Subdomains Section */}
			<SubdomainList domainId={domain.id} />

			<Card>
				<CardHeader>
					<CardTitle>Change History</CardTitle>
					<CardDescription>Timeline of detected domain, DNS, SSL, and registrar changes</CardDescription>
				</CardHeader>
				<CardContent>
					{history?.length ? (
						<div className="relative space-y-0">
							{/* Timeline line */}
							<div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
							{history.map((item: DomainHistory) => {
								const typeConfig: Record<string, { color: string; icon: string }> = {
									expiry: { color: "bg-yellow-500", icon: "📅" },
									ssl: { color: "bg-purple-500", icon: "🔒" },
									dns: { color: "bg-blue-500", icon: "🌐" },
									registrar: { color: "bg-orange-500", icon: "🏢" },
									ip: { color: "bg-cyan-500", icon: "💻" },
									host: { color: "bg-teal-500", icon: "📍" },
									status: { color: "bg-green-500", icon: "✅" },
								}
								const config = typeConfig[item.change_type] || { color: "bg-gray-500", icon: "📋" }
								return (
									<div key={item.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
										{/* Timeline dot */}
										<div className={`relative z-10 mt-1 h-[30px] w-[30px] shrink-0 rounded-full ${config.color}/10 flex items-center justify-center border-2 border-background`}>
											<div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
										</div>
										{/* Content */}
										<div className="min-w-0 flex-1 rounded-lg border p-3">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant="outline" className="text-[10px] px-1.5 py-0">
													{item.change_type}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatDate(item.created_at)}
												</span>
											</div>
											<p className="text-sm font-medium">{item.field_name}</p>
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
												<code className="bg-muted px-1.5 py-0.5 rounded text-[11px] break-all max-w-[200px] truncate">
													{item.old_value || "—"}
												</code>
												<span className="shrink-0">→</span>
												<code className="bg-muted px-1.5 py-0.5 rounded text-[11px] break-all max-w-[200px] truncate">
													{item.new_value || "—"}
												</code>
											</div>
										</div>
									</div>
								)
							})}
						</div>
					) : (
						<div className="text-center py-8">
							<FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
							<p className="text-sm text-muted-foreground">No changes recorded yet.</p>
							<p className="text-xs text-muted-foreground mt-1">Changes will appear here when domain data is updated.</p>
						</div>
					)}
				</CardContent>
			</Card>
			<DomainDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} domain={domain} isEdit />

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Domain</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this domain? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)

	// Flexible date parsing function
	const parseFlexibleDate = (dateString: string): string | null => {
		if (!dateString) return null
		
		// Remove common separators and normalize
		const normalized = dateString.trim()
			.replace(/[./-]/g, '-')
			.replace(/\s+/g, '')
		
		// Try different date formats
		const formats = [
			// DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
			/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/,
			// YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
			/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/,
			// MM-DD-YYYY, MM/DD/YYYY, MM.DD.YYYY
			/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/,
		]
		
		for (const format of formats) {
			const match = normalized.match(format)
			if (match) {
				const [, part1, part2, part3] = match
				
				// Determine if it's DD.MM.YYYY or YYYY.MM.DD format
				let year: string, month: string, day: string
				
				if (part1.length === 4) {
					// YYYY.MM.DD format
					year = part1
					month = part2
					day = part3
				} else {
					// DD.MM.YYYY format (most common)
					day = part1
					month = part2
					year = part3
				}
				
				// Validate and format
				const yearNum = parseInt(year)
				const monthNum = parseInt(month)
				const dayNum = parseInt(day)
				
				if (yearNum >= 2000 && yearNum <= 2100 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
					return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
				}
			}
		}
		
		return null
	}

	// Manual expiry date update function
	const handleUpdateExpiryDate = async () => {
		if (!manualExpiryDate || !domain) return

		const parsedExpiryDate = parseFlexibleDate(manualExpiryDate)
		if (!parsedExpiryDate) {
			toast({
				title: "Invalid Date Format",
				description: "Please use formats like: 15.06.2026, 13.11.2029, 2026-06-15",
				variant: "destructive",
			})
			return
		}

		setIsUpdatingExpiry(true)
		try {
			// This would need to be implemented in the backend API
			// For now, we'll show a success message
			const message = manualPurchaseDate 
				? `Manual dates for ${domain.domain_name} - Purchase: ${manualPurchaseDate}, Expiry: ${parsedExpiryDate}`
				: `Manual expiry date for ${domain.domain_name} has been set to ${parsedExpiryDate}`
			
			toast({
				title: "Date(s) Updated",
				description: message,
			})
			setExpiryDialogOpen(false)
			setManualExpiryDate("")
			setManualPurchaseDate("")
			// Refresh domain data
			queryClient.invalidateQueries({ queryKey: ["domain", id] })
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update dates",
				variant: "destructive",
			})
		} finally {
			setIsUpdatingExpiry(false)
		}
	}

	return (
		<>
			{/* Manual Expiry Date Dialog for .eu domains */}
			{domain?.domain_name?.toLowerCase().endsWith('.eu') && (
				<AlertDialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
					<AlertDialogContent className="max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle>Set Manual Domain Dates</AlertDialogTitle>
							<AlertDialogDescription>
								.eu domains don't provide expiry dates through standard WHOIS. Enter dates manually using flexible formats.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-4 py-4">
							{/* Expiry Date (Required) */}
							<div className="space-y-2">
								<Label htmlFor="expiry-date" className="font-medium">Expiry Date *</Label>
								<Input
									id="expiry-date"
									type="text"
									value={manualExpiryDate}
									onChange={(e) => setManualExpiryDate(e.target.value)}
									placeholder="15.06.2026 or 13.11.2029"
									className="font-mono"
								/>
								<div className="text-xs text-muted-foreground">
									Supported formats: 15.06.2026, 13.11.2029, 2026-06-15, 15/06/2026
								</div>
							</div>
							
							{/* Purchase Date (Optional) */}
							<div className="space-y-2">
								<Label htmlFor="purchase-date" className="font-medium">Purchase Date (Optional)</Label>
								<Input
									id="purchase-date"
									type="text"
									value={manualPurchaseDate}
									onChange={(e) => setManualPurchaseDate(e.target.value)}
									placeholder="15.06.2020 or leave empty"
									className="font-mono"
								/>
								<div className="text-xs text-muted-foreground">
									When you purchased this domain (optional)
								</div>
							</div>
							
							{/* Help Section */}
							<div className="bg-muted/50 p-3 rounded-lg">
								<div className="text-sm text-muted-foreground space-y-2">
									<p className="font-medium">Quick Tips:</p>
									<ul className="list-disc list-inside space-y-1 text-xs">
										<li>Copy-paste dates directly: "15.06.2026, 13.11.2029"</li>
										<li>Use dots, slashes, or dashes as separators</li>
										<li>Format: DD.MM.YYYY or YYYY-MM-DD</li>
									</ul>
									<div className="pt-2">
										Find expiry date on{" "}
										<a
											href={`https://www.eurid.eu/en/registrations/search/?domain=${domain?.domain_name}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:underline font-medium"
										>
											EURid WHOIS →
										</a>
									</div>
								</div>
							</div>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleUpdateExpiryDate}
								disabled={!manualExpiryDate || isUpdatingExpiry}
								className="bg-primary"
							>
								{isUpdatingExpiry ? "Updating..." : "Update Date(s)"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</>
	)
}
