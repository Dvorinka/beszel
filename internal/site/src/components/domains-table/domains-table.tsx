"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
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
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
	getDomains,
	deleteDomain,
	refreshDomain,
	getStatusBadgeColor,
	getStatusLabel,
	formatDate,
	formatDays,
	cleanDomain,
	type Domain,
} from "@/lib/domains"
import { MoreHorizontal, Plus, RefreshCw, Globe, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { DomainDialog } from "./domain-dialog"
import { Link } from "@/components/router"

export default function DomainsTable() {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingDomain, setEditingDomain] = useState<Domain | null>(null)

	const { data: domains, isLoading } = useQuery({
		queryKey: ["domains"],
		queryFn: getDomains,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteDomain,
		onSuccess: () => {
			toast({ title: "Domain deleted successfully" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to delete domain",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const refreshMutation = useMutation({
		mutationFn: refreshDomain,
		onSuccess: () => {
			toast({ title: "Domain refresh started" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to refresh domain",
				description: error.message,
				variant: "destructive",
			})
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
		if (confirm("Are you sure you want to delete this domain?")) {
			deleteMutation.mutate(id)
		}
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
		return <div className="p-4">Loading...</div>
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Domain Expiry Monitoring</h2>
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					Add Domain
				</Button>
			</div>

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
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{domains?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
									No domains tracked. Add domains to monitor their expiry dates.
								</TableCell>
							</TableRow>
						) : (
							domains?.map((domain) => (
								<TableRow key={domain.id}>
									<TableCell className="font-medium">
										<Link href={`/domain/${domain.id}`} className="flex items-center gap-2 cursor-pointer">
											{domain.favicon_url && (
												<img
													src={domain.favicon_url}
													alt=""
													className="h-4 w-4"
													onError={(e) => (e.currentTarget.style.display = "none")}
												></img>
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
											domain.days_until_expiry !== undefined && domain.days_until_expiry <= 30
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
													domain.ssl_days_until !== undefined && domain.ssl_days_until <= 14
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
							))
						)}
					</TableBody>
				</Table>
			</div>

			<DomainDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				domain={editingDomain}
				isEdit={!!editingDomain}
			/>
		</div>
	)
}
