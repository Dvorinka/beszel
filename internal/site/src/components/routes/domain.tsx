import { memo, useState } from "react"
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

export default memo(function DomainDetail({ id }: { id: string }) {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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
		setIsDeleteDialogOpen(true)
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
			setIsDeleteDialogOpen(false)
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

			{/* Info Grid */}
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

			<div className="grid gap-4">
				{/* Additional Info */}
				<div className="grid sm:grid-cols-2 gap-4">
					<Card>
						<CardHeader>
							<CardTitle>IP Addresses</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{domain.ipv4_addresses?.map((ip: string) => (
								<div key={ip} className="flex items-center gap-2">
									<Badge variant="secondary">IPv4</Badge>
									<code className="text-sm">{ip}</code>
								</div>
							))}
							{domain.ipv6_addresses?.map((ip: string) => (
								<div key={ip} className="flex items-center gap-2">
									<Badge variant="secondary">IPv6</Badge>
									<code className="text-sm">{ip}</code>
								</div>
							))}
							{!domain.ipv4_addresses?.length && !domain.ipv6_addresses?.length && (
								<p className="text-muted-foreground">No IP addresses found</p>
							)}
						</CardContent>
					</Card>

					{((domain.purchase_price ?? 0) > 0 || (domain.current_value ?? 0) > 0 || (domain.renewal_cost ?? 0) > 0) && (
						<Card>
							<CardHeader>
								<CardTitle>Valuation</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								{(domain.purchase_price ?? 0) > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Purchase Price</span>
										<span className="font-medium">${domain.purchase_price}</span>
									</div>
								)}
								{(domain.current_value ?? 0) > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Current Value</span>
										<span className="font-medium">${domain.current_value}</span>
									</div>
								)}
								{(domain.renewal_cost ?? 0) > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Renewal Cost</span>
										<span className="font-medium">${domain.renewal_cost}</span>
									</div>
								)}
								<div className="flex justify-between">
									<span className="text-muted-foreground">Auto-renew</span>
									<Badge variant={domain.auto_renew ? "default" : "secondary"}>{domain.auto_renew ? "Yes" : "No"}</Badge>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Notes */}
				{domain.notes && (
					<Card>
						<CardHeader>
							<CardTitle>Notes</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{domain.notes}</p>
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

						{/* Important Dates */}
						<div className="space-y-2 pt-4 border-t">
							<h4 className="text-sm font-medium flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Important Dates
							</h4>
							<div className="grid sm:grid-cols-3 gap-4">
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
							</div>
						</div>

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

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
})
