"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button } from "@/components/ui/button"
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
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
	getDomains,
	deleteDomain,
	refreshDomain,
	getStatusBadgeColor,
	getStatusLabel,
	formatDate,
	formatDays,
	type Domain,
} from "@/lib/domains"
import {
	MoreHorizontal,
	Plus,
	RefreshCw,
	Globe,
	AlertTriangle,
	CheckCircle2,
	Clock,
	FilterIcon,
	LayoutGridIcon,
	LayoutListIcon,
	Tag,
} from "lucide-react"
import { DomainDialog } from "./domain-dialog"
import { Link } from "@/components/router"
import { useBrowserStorage } from "@/lib/utils"

type ViewMode = "table" | "grid"
type StatusFilter = "all" | "active" | "expiring" | "expired" | "unknown" | "paused"

export default function DomainsTable() {
	const { t } = useLingui()
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
	const [filter, setFilter] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
	const [tagFilter, setTagFilter] = useState<string>("all")
	
	const [viewMode, setViewMode] = useBrowserStorage<ViewMode>(
		"domainsViewMode",
		window.innerWidth < 1024 ? "grid" : "table"
	)

	const { data: domains = [], isLoading } = useQuery({
		queryKey: ["domains"],
		queryFn: getDomains,
	})

	// Filter by status first
	const statusFilteredDomains = useMemo(() => {
		if (statusFilter === "all") return domains
		return domains.filter((d) => d.status === statusFilter)
	}, [domains, statusFilter])

	// Then filter by search text and tags
	const filteredDomains = useMemo(() => {
		let result = statusFilteredDomains
		if (filter) {
			const f = filter.toLowerCase()
			result = result.filter(
				(d) =>
					d.domain_name.toLowerCase().includes(f) ||
					(d.registrar_name || "").toLowerCase().includes(f)
			)
		}
		if (tagFilter !== "all") {
			result = result.filter((d) => d.tags?.includes(tagFilter))
		}
		return result
	}, [statusFilteredDomains, filter, tagFilter])

	// Extract all unique tags
	const allTags = useMemo(() => {
		const tagSet = new Set<string>()
		domains.forEach((d) => d.tags?.forEach((tag) => tagSet.add(tag)))
		return Array.from(tagSet).sort()
	}, [domains])

	const statusCounts = useMemo(() => {
		const total = domains.length
		const active = domains.filter((d) => d.status === "active").length
		const expiring = domains.filter((d) => d.status === "expiring").length
		const expired = domains.filter((d) => d.status === "expired").length
		const unknown = domains.filter((d) => d.status === "unknown").length
		const paused = domains.filter((d) => d.status === "paused").length
		return { total, active, expiring, expired, unknown, paused }
	}, [domains])

	const deleteMutation = useMutation({
		mutationFn: deleteDomain,
		onSuccess: () => {
			toast({ title: "Domain deleted successfully" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
		},
	})

	const refreshMutation = useMutation({
		mutationFn: refreshDomain,
		onSuccess: () => {
			toast({ title: "Domain refresh started" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
		},
	})

	const handleEdit = (domain: Domain) => {
		setEditingDomain(domain)
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingDomain(null)
		setDialogOpen(true)
	}

	const handleDelete = (id: string) => {
		setDeleteConfirmId(id)
	}

	const handleRefresh = (id: string) => {
		refreshMutation.mutate(id)
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />
			case "expiring":
				return <Clock className="h-4 w-4 text-yellow-500" />
			case "expired":
				return <AlertTriangle className="h-4 w-4 text-red-500" />
			default:
				return <Globe className="h-4 w-4 text-gray-500" />
		}
	}

	if (isLoading) {
		return (
			<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
				<CardContent className="p-0">
					<div className="p-8 text-center text-muted-foreground">Loading...</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<>
			<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
			<CardHeader className="p-0 pb-5">
				<div className="flex flex-col gap-4">
					{/* Title row */}
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
						<div className="flex-1">
							<CardTitle className="text-xl mb-2 flex items-center gap-2">
								<Globe className="h-5 w-5 text-primary" />
								<Trans>Domain Monitoring</Trans>
							</CardTitle>
							<CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
								<Trans>Track domain expiry dates and watch domains for purchase</Trans>
								<span className="text-xs text-muted-foreground">
									({statusCounts.active} <CheckCircle2 className="inline h-3 w-3 text-green-500" />
									{statusCounts.expiring > 0 && (
										<>
											{" "}
											{statusCounts.expiring}{" "}
											<Clock className="inline h-3 w-3 text-yellow-500" />
										</>
									)}
									{statusCounts.expired > 0 && (
										<>
											{" "}
											{statusCounts.expired}{" "}
											<AlertTriangle className="inline h-3 w-3 text-red-500" />
										</>
									)}
									{statusCounts.paused > 0 && (
										<>
											{" "}
											{statusCounts.paused}{" "}
											<Clock className="inline h-3 w-3 text-gray-400" />
										</>
									)}
									/ {statusCounts.total})
								</span>
							</CardDescription>
						</div>
						<Button onClick={handleAdd} className="shrink-0">
							<Plus className="mr-2 h-4 w-4" />
							<Trans>Add Domain</Trans>
						</Button>
					</div>

					{/* Quick status filters */}
					<div className="flex flex-wrap gap-1.5">
						{[
							{ key: "all", label: `All ${statusCounts.total}`, color: "bg-primary" },
							{ key: "active", label: `Active ${statusCounts.active}`, color: "bg-green-500" },
							{ key: "expiring", label: `Expiring ${statusCounts.expiring}`, color: "bg-yellow-500" },
							{ key: "expired", label: `Expired ${statusCounts.expired}`, color: "bg-red-500" },
							{ key: "unknown", label: `Unknown ${statusCounts.unknown}`, color: "bg-gray-400" },
							{ key: "paused", label: `Paused ${statusCounts.paused}`, color: "bg-gray-400" },
						].map((s) => (
							<Button
								key={s.key}
								variant={statusFilter === s.key ? "default" : "outline"}
								size="sm"
								className="h-7 text-xs gap-1.5"
								onClick={() => setStatusFilter(s.key as StatusFilter)}
								disabled={s.key !== "all" && parseInt(s.label.split(" ")[1]) === 0}
							>
								<span className={`h-2 w-2 rounded-full ${s.color}`} />
								{s.label.split(" ")[0]}
								<span className="text-[10px] opacity-70">{s.label.split(" ")[1]}</span>
							</Button>
						))}
					</div>

					{/* Filter row */}
					<div className="flex flex-col sm:flex-row gap-2">
						<div className="relative flex-1">
							<Input
								placeholder={t`Filter domains...`}
								onChange={(e) => setFilter(e.target.value)}
								value={filter}
								className="w-full"
							/>
						</div>
						{allTags.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<Tag className="me-1.5 size-4 opacity-80" />
										{tagFilter === "all" ? t`Tags` : tagFilter}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuRadioGroup value={tagFilter} onValueChange={setTagFilter}>
										<DropdownMenuRadioItem value="all">
											<Trans>All Tags</Trans>
										</DropdownMenuRadioItem>
										{allTags.map((tag) => (
											<DropdownMenuRadioItem key={tag} value={tag}>
												{tag}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									<FilterIcon className="me-1.5 size-4 opacity-80" />
									<Trans>Options</Trans>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-48">
								{/* Layout */}
								<DropdownMenuLabel className="flex items-center gap-2">
									<LayoutGridIcon className="size-4" />
									<Trans>Layout</Trans>
								</DropdownMenuLabel>
								<DropdownMenuRadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
									<DropdownMenuRadioItem value="table" className="gap-2">
										<LayoutListIcon className="size-4" />
										<Trans>Table</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="grid" className="gap-2">
										<LayoutGridIcon className="size-4" />
										<Trans>Grid</Trans>
									</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
								<DropdownMenuSeparator />

								{/* Status Filter */}
								<DropdownMenuLabel className="flex items-center gap-2">
									<FilterIcon className="size-4" />
									<Trans>Status</Trans>
								</DropdownMenuLabel>
								<DropdownMenuRadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
									<DropdownMenuRadioItem value="all">
										<Trans>All ({statusCounts.total})</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="active">
										<Trans>Active ({statusCounts.active})</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="expiring">
										<Trans>Expiring ({statusCounts.expiring})</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="expired">
										<Trans>Expired ({statusCounts.expired})</Trans>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="unknown">
										<Trans>Unknown ({statusCounts.unknown})</Trans>
									</DropdownMenuRadioItem>
									{statusCounts.paused > 0 && (
										<DropdownMenuRadioItem value="paused">
											<Trans>Paused ({statusCounts.paused})</Trans>
										</DropdownMenuRadioItem>
									)}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>

				<CardContent className="p-0">
					{filteredDomains.length === 0 ? (
						<div className="p-8 text-center text-muted-foreground">
							{filter || statusFilter !== "all" ? (
								"No domains match your filters."
							) : (
								<div>
									<p className="mb-4">No domains tracked. Add domains to monitor their expiry dates or track domains you want to buy.</p>
									<Button onClick={handleAdd} variant="outline">
										<Plus className="mr-2 h-4 w-4" />
										Add your first domain
									</Button>
								</div>
							)}
						</div>
					) : viewMode === "table" ? (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Domain</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Expiry</TableHead>
										<TableHead>Days Left</TableHead>
										<TableHead>Registrar</TableHead>
										<TableHead>SSL Expiry</TableHead>
										<TableHead>Tags</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
									</TableHeader>
									<TableBody>
										{filteredDomains.map((domain) => (
											<TableRow key={domain.id}>
												<TableCell className="font-medium">
													<Link href={`/domain/${domain.id}`} className="flex items-center gap-2 cursor-pointer">
														{domain.favicon_url && (
															<img
																src={domain.favicon_url}
																alt=""
																className="h-4 w-4"
																onError={(e) => (e.currentTarget.style.display = "none")}
															/>
														)}
														<span className="hover:underline">{domain.domain_name}</span>
													</Link>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														{getStatusIcon(domain.status)}
														<Badge className={getStatusBadgeColor(domain.status)}>
															{getStatusLabel(domain.status)}
														</Badge>
													</div>
												</TableCell>
												<TableCell>
													{domain.expiry_date ? formatDate(domain.expiry_date) : "Unknown"}
												</TableCell>
												<TableCell>
											<span className={
															domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
															? domain.days_until_expiry <= 7
																? "text-red-600 font-semibold"
																: "text-yellow-600"
															: ""
												}>
													{formatDays(domain.days_until_expiry)}
												</span>
											</TableCell>
										<TableCell>{domain.registrar_name || "Unknown"}</TableCell>
										<TableCell>
											{domain.ssl_valid_to ? (
												<span
													className={
														domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14
														? "text-red-600"
														: ""
													}
												>
													{formatDays(domain.ssl_days_until)}
												</span>
											) : (
												"N/A"
											)}
										</TableCell>
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{domain.tags?.map((tag: string) => (
															<span
																key={tag}
																className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium"
															>
																<Tag className="h-3 w-3" />
																{tag}
															</span>
														))}
													</div>
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleEdit(domain)}>
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleRefresh(domain.id)}
																disabled={refreshMutation.isPending}
															>
																<RefreshCw className="mr-2 h-4 w-4" />
																Refresh
															</DropdownMenuItem>
															<DropdownMenuItem asChild>
																<a
																	href={`https://${domain.domain_name}`}
																	target="_blank"
																	rel="noopener noreferrer"
																>
																	<Globe className="mr-2 h-4 w-4" />
																	Visit
																</a>
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDelete(domain.id)}
																className="text-destructive"
															>
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						) : (
							<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
								{filteredDomains.map((domain) => (
									<div key={domain.id} className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
										<div className="flex items-start justify-between">
											<Link href={`/domain/${domain.id}`} className="flex items-center gap-3 cursor-pointer min-w-0">
												{domain.favicon_url && (
													<img
														src={domain.favicon_url}
														alt=""
														className="h-5 w-5 shrink-0"
														onError={(e) => (e.currentTarget.style.display = "none")}
													/>
												)}
												<div className="min-w-0">
													<div className="font-medium truncate hover:underline">{domain.domain_name}</div>
												</div>
											</Link>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => handleEdit(domain)}>Edit</DropdownMenuItem>
													<DropdownMenuItem onClick={() => handleRefresh(domain.id)} disabled={refreshMutation.isPending}>
														<RefreshCw className="mr-2 h-4 w-4" />
														Refresh
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => handleDelete(domain.id)} className="text-destructive">
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										<div className="flex items-center gap-2">
											{getStatusIcon(domain.status)}
											<Badge className={getStatusBadgeColor(domain.status)}>
												{getStatusLabel(domain.status)}
											</Badge>
										</div>

										{domain.tags && domain.tags.length > 0 && (
											<div className="flex flex-wrap gap-1">
												{domain.tags.map((tag: string) => (
													<span
														key={tag}
														className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium"
													>
														<Tag className="h-3 w-3" />
														{tag}
													</span>
												))}
											</div>
										)}

										<div className="grid grid-cols-2 gap-2 text-sm">
											<div>
												<div className="text-xs text-muted-foreground">Days Left</div>
												<span className={
												domain.days_until_expiry !== undefined && domain.days_until_expiry >= 0 && domain.days_until_expiry <= 30
													? domain.days_until_expiry <= 7
														? "text-red-600 font-semibold"
														: "text-yellow-600"
													: ""
											}>
												{formatDays(domain.days_until_expiry)}
											</span>
											</div>
											<div>
												<div className="text-xs text-muted-foreground">SSL</div>
												<span
													className={
														domain.ssl_days_until !== undefined && domain.ssl_days_until >= 0 && domain.ssl_days_until <= 14
														? "text-red-600"
														: ""
													}
												>
													{formatDays(domain.ssl_days_until)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

			<DomainDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				domain={editingDomain}
				isEdit={!!editingDomain}
			/>
			<AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							<Trans>Delete Domain</Trans>
						</AlertDialogTitle>
						<AlertDialogDescription>
							<Trans>Are you sure you want to delete this domain? This action cannot be undone.</Trans>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							<Trans>Cancel</Trans>
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteConfirmId) {
									deleteMutation.mutate(deleteConfirmId)
									setDeleteConfirmId(null)
								}
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							<Trans>Delete</Trans>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
