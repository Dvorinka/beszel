import { memo, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
} from "lucide-react"
import { getDomain, getDomainHistory, refreshDomain, deleteDomain, formatDate, formatDays } from "@/lib/domains"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts"
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
function InfoCard({ title, value, icon: Icon, subtitle, className }: { title: string; value: string; icon: any; subtitle?: string; className?: string }) {
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
			await refreshDomain(id)
			toast({ title: "Domain refresh started" })
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

	// Prepare chart data from history (events by date)
	const chartData = useMemo(() => {
		if (!history?.length) return []
		const counts: Record<string, number> = {}
		history.forEach((h: any) => {
			const d = h.created_at
				? new Date(h.created_at).toISOString().split("T")[0]
				: "Unknown"
			counts[d] = (counts[d] || 0) + 1
		})
		return Object.entries(counts)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date))
	}, [history])

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
				<InfoCard
					title="Registrar"
					value={domain.registrar_name || "Unknown"}
					icon={Server}
				/>
				<InfoCard
					title="Domain Expiry"
					value={formatDate(domain.expiry_date)}
					subtitle={formatDays(domain.days_until_expiry)}
					icon={Calendar}
					className={domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30 ? "text-yellow-600" : ""}
				/>
				<InfoCard
					title="SSL Expiry"
					value={domain.ssl_valid_to ? formatDate(domain.ssl_valid_to) : "No SSL"}
					subtitle={domain.ssl_valid_to ? formatDays(domain.ssl_days_until) : undefined}
					icon={Shield}
					className={domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14 ? "text-red-600" : ""}
				/>
				<InfoCard
					title="Location"
					value={domain.host_country || "Unknown"}
					subtitle={domain.host_isp}
					icon={MapPin}
				/>
			</div>

			{/* Expiry Comparison Chart */}
			<Card>
				<CardHeader>
					<CardTitle>Expiry Overview</CardTitle>
					<CardDescription>Days remaining until domain and SSL certificate expiration</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-[200px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={[
									...(typeof domain.days_until_expiry === "number" && domain.days_until_expiry >= 0
										? [{ name: "Domain Expiry", days: domain.days_until_expiry }]
										: []),
									...(typeof domain.ssl_days_until === "number" && domain.ssl_days_until >= 0
										? [{ name: "SSL Expiry", days: domain.ssl_days_until }]
										: []),
								]}
								layout="vertical"
							>
								<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
								<XAxis type="number" tick={{ fontSize: 12 }} />
								<YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
								<Tooltip
									formatter={(value: number) => [`${value} days`, "Remaining"]}
									contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
								/>
								<Bar dataKey="days" radius={[0, 4, 4, 0]}>
									{[
										{ days: domain.days_until_expiry ?? 0 },
										{ days: domain.ssl_days_until ?? 0 },
									].map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={
													entry.days <= 14
														? "#ef4444"
														: entry.days <= 30
															? "#f59e0b"
															: "#22c55e"
												}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

			<div className="grid gap-4">
				{/* Expiry Timeline Chart */}
						<Card>
							<CardHeader>
								<CardTitle>History Events</CardTitle>
								<CardDescription>Domain changes and check events over time</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={chartData}>
											<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
											<XAxis dataKey="date" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
											<Tooltip />
											<Bar dataKey="count" fill="#3b82f6" name="Events" />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
						</Card>

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

							<Card>
								<CardHeader>
									<CardTitle>Valuation</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Purchase Price</span>
										<span className="font-medium">${domain.purchase_price || 0}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Current Value</span>
										<span className="font-medium">${domain.current_value || 0}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Renewal Cost</span>
										<span className="font-medium">${domain.renewal_cost || 0}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Auto-renew</span>
										<Badge variant={domain.auto_renew ? "default" : "secondary"}>
											{domain.auto_renew ? "Yes" : "No"}
										</Badge>
									</div>
								</CardContent>
							</Card>
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
								<CardDescription>Name servers, mail exchangers, and text records</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Nameservers */}
								<div>
									<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
										<Server className="h-4 w-4" />
										Nameservers
										<Badge variant="secondary" className="ml-2">{domain.name_servers?.length || 0}</Badge>
									</h4>
									<div className="space-y-1">
										{domain.name_servers?.map((ns: string, i: number) => (
											<div key={i} className="flex items-center gap-2">
												<Badge variant="outline">NS</Badge>
												<code className="text-sm">{ns}</code>
											</div>
										))}
										{!domain.name_servers?.length && (
											<p className="text-muted-foreground text-sm">No nameservers found</p>
										)}
									</div>
								</div>

								{/* MX Records */}
								{domain.mx_records && domain.mx_records.length > 0 && (
									<div>
										<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
											<Mail className="h-4 w-4" />
											Mail Servers (MX)
											<Badge variant="secondary" className="ml-2">{domain.mx_records.length}</Badge>
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

								{/* TXT Records */}
								{domain.txt_records && domain.txt_records.length > 0 && (
									<div>
										<h4 className="text-sm font-medium mb-2 flex items-center gap-2">
											<FileText className="h-4 w-4" />
											TXT Records
											<Badge variant="secondary" className="ml-2">{domain.txt_records.length}</Badge>
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

								{/* DNSSEC */}
								{domain.dnssec && (
									<div>
										<h4 className="text-sm font-medium mb-2">DNSSEC</h4>
										<Badge variant={domain.dnssec === "signed" ? "default" : "secondary"}>
											{domain.dnssec}
										</Badge>
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
											<InfoCard
												title="Valid From"
												value={formatDate(domain.ssl_valid_from)}
												icon={Calendar}
											/>
											<InfoCard
												title="Valid Until"
												value={formatDate(domain.ssl_valid_to)}
												subtitle={formatDays(domain.ssl_days_until)}
												icon={Shield}
												className={domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14 ? "text-red-600" : ""}
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

								{/* Domain Status */}
								{domain.status && domain.status !== "unknown" && (
									<div className="space-y-2 pt-4 border-t">
										<h4 className="text-sm font-medium flex items-center gap-2">
											<Shield className="h-4 w-4" />
											Domain Status
										</h4>
										<div className="flex flex-wrap gap-2">
											{domain.status.split(", ").map((status: string, i: number) => (
												<Badge key={i} variant="secondary">{status}</Badge>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Change History</CardTitle>
							<CardDescription>Historical changes to domain information</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{history?.map((item: any) => (
									<div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
										<div className="p-2 bg-muted rounded-lg">
											<Clock className="h-4 w-4 text-muted-foreground" />
										</div>
										<div className="flex-1">
											<p className="font-medium">{item.change_type}</p>
											<p className="text-sm text-muted-foreground">{item.change_description}</p>
											<p className="text-xs text-muted-foreground mt-1">
												{new Date(item.created_at || item.created).toLocaleString()}
											</p>
										</div>
									</div>
								))}
								{!history?.length && (
									<p className="text-muted-foreground text-center py-8">No history available</p>
								)}
							</div>
						</CardContent>
					</Card>
			<DomainDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				domain={domain}
				isEdit
			/>

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
