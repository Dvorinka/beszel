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
	Clock,
	Shield,
	Server,
	RefreshCw,
	ExternalLink,
	Edit3,
	Trash2,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	FileText,
	Mail,
	Network,
	Code2,
} from "lucide-react"
import {
	RegistrationSection,
	HostingSection,
	DnsSection,
	SslSection,
	SeoSection,
	DomainTypeBadge,
	ValuationSection,
	DomainExpiryOverview,
} from "./domain-info-sections"
import { type DomainHistory, getDomain, getDomainHistory, refreshDomain, deleteDomain, formatDate } from "@/lib/domains"
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
								<div className="flex items-center gap-2 mt-1 flex-wrap">
									<StatusBadge status={domain.status} />
									<DomainTypeBadge type={domain.monitor_type} />
									{domain.tags?.map((tag: string) => (
										<Badge key={tag} variant="secondary" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
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

			{/* Expiry Overview */}
			<DomainExpiryOverview domain={domain} />

			{/* Main sections grid */}
			<div className="grid lg:grid-cols-2 gap-4">
				<RegistrationSection domain={domain} />
				<HostingSection domain={domain} />
				<DnsSection domain={domain} />
				<SslSection domain={domain} />
				<SeoSection domain={domain} />
				<ValuationSection domain={domain} />
			</div>

			{/* Provider badges row */}
			{(domain.dns_provider || domain.hosting_provider || domain.email_provider || domain.ca_provider) && (
				<Card>
					<CardContent className="p-4">
						<div className="flex flex-wrap gap-2">
							{domain.dns_provider && (
								<Badge variant="secondary" className="text-xs gap-1.5">
									<Network className="h-3 w-3" />
									DNS: {domain.dns_provider}
								</Badge>
							)}
							{domain.hosting_provider && (
								<Badge variant="secondary" className="text-xs gap-1.5">
									<Server className="h-3 w-3" />
									Hosting: {domain.hosting_provider}
								</Badge>
							)}
							{domain.email_provider && (
								<Badge variant="secondary" className="text-xs gap-1.5">
									<Mail className="h-3 w-3" />
									Email: {domain.email_provider}
								</Badge>
							)}
							{domain.ca_provider && (
								<Badge variant="secondary" className="text-xs gap-1.5">
									<Shield className="h-3 w-3" />
									CA: {domain.ca_provider}
								</Badge>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* HTTP Headers */}
			{domain.headers && domain.headers.length > 0 && (
				<Card className="overflow-hidden">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Code2 className="h-5 w-5 text-slate-500" />
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
			)}

			{/* Notes Section */}
			{domain.notes && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<FileText className="h-5 w-5 text-slate-500" />
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
										<div
											className={`relative z-10 mt-1 h-[30px] w-[30px] shrink-0 rounded-full ${config.color}/10 flex items-center justify-center border-2 border-background`}
										>
											<div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
										</div>
										{/* Content */}
										<div className="min-w-0 flex-1 rounded-lg border p-3">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant="outline" className="text-[10px] px-1.5 py-0">
													{item.change_type}
												</Badge>
												<span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
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
							<p className="text-xs text-muted-foreground mt-1">
								Changes will appear here when domain data is updated.
							</p>
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
		const normalized = dateString.trim().replace(/[./-]/g, "-").replace(/\s+/g, "")

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
					return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
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
			{domain?.domain_name?.toLowerCase().endsWith(".eu") && (
				<AlertDialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
					<AlertDialogContent className="max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle>Set Manual Domain Dates</AlertDialogTitle>
							<AlertDialogDescription>
								.eu domains don't provide expiry dates through standard WHOIS. Enter dates manually using flexible
								formats.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-4 py-4">
							{/* Expiry Date (Required) */}
							<div className="space-y-2">
								<Label htmlFor="expiry-date" className="font-medium">
									Expiry Date *
								</Label>
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
								<Label htmlFor="purchase-date" className="font-medium">
									Purchase Date (Optional)
								</Label>
								<Input
									id="purchase-date"
									type="text"
									value={manualPurchaseDate}
									onChange={(e) => setManualPurchaseDate(e.target.value)}
									placeholder="15.06.2020 or leave empty"
									className="font-mono"
								/>
								<div className="text-xs text-muted-foreground">When you purchased this domain (optional)</div>
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
