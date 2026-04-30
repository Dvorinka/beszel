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
	getStatusPages,
	deleteStatusPage,
	getStatusPageUrl,
	type StatusPage,
} from "@/lib/statuspages"
import { MoreHorizontal, Plus, ExternalLink, Globe, Lock, Copy, Check, LayoutTemplate, ArrowRight } from "lucide-react"
import { StatusPageDialog } from "./status-page-dialog"

export function StatusPagesTable() {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingPage, setEditingPage] = useState<StatusPage | null>(null)
	const [copiedId, setCopiedId] = useState<string | null>(null)

	const { data: pages, isLoading } = useQuery({
		queryKey: ["status-pages"],
		queryFn: getStatusPages,
	})

	const deleteMutation = useMutation({
		mutationFn: deleteStatusPage,
		onSuccess: () => {
			toast({ title: "Status page deleted successfully" })
			queryClient.invalidateQueries({ queryKey: ["status-pages"] })
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to delete status page",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const handleEdit = (page: StatusPage) => {
		setEditingPage(page)
		setDialogOpen(true)
	}

	const handleAdd = () => {
		setEditingPage(null)
		setDialogOpen(true)
	}

	const handleDelete = (page: StatusPage) => {
		if (confirm(`Are you sure you want to delete "${page.name}"?\n\nThis will remove the status page and unlink all ${page.monitor_count} monitor(s). This action cannot be undone.`)) {
			deleteMutation.mutate(page.id)
		}
	}

	const handleCopyUrl = async (page: StatusPage) => {
		if (!page.public) {
			toast({ title: "Status page must be public to copy URL", variant: "destructive" })
			return
		}
		const url = window.location.origin + getStatusPageUrl(page.slug)
		try {
			await navigator.clipboard.writeText(url)
			setCopiedId(page.id)
			toast({ title: "URL copied to clipboard" })
			setTimeout(() => setCopiedId(null), 2000)
		} catch {
			toast({ title: "Failed to copy URL", variant: "destructive" })
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="h-5 w-32 bg-muted rounded animate-pulse" />
					<div className="h-9 w-36 bg-muted rounded animate-pulse" />
				</div>
				<div className="rounded-md border">
					<div className="p-4 space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-4">
								<div className="h-4 w-32 bg-muted rounded animate-pulse" />
								<div className="h-4 w-24 bg-muted rounded animate-pulse" />
								<div className="h-4 w-16 bg-muted rounded animate-pulse" />
								<div className="h-4 w-20 bg-muted rounded animate-pulse" />
								<div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto" />
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Status Pages</h2>
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					Create Status Page
				</Button>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Slug</TableHead>
							<TableHead>Monitors</TableHead>
							<TableHead>Visibility</TableHead>
							<TableHead className="w-[100px]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pages?.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-center py-12">
									<div className="flex flex-col items-center gap-3">
										<div className="p-3 bg-muted rounded-full">
											<LayoutTemplate className="h-6 w-6 text-muted-foreground" />
										</div>
										<div>
											<p className="font-medium text-muted-foreground">No status pages yet</p>
											<p className="text-sm text-muted-foreground mt-1">
												Create one to share your service status publicly
											</p>
										</div>
										<Button onClick={handleAdd} variant="outline" className="mt-2">
											Create Status Page
											<ArrowRight className="ml-2 h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						) : (
							pages?.map((page) => (
								<TableRow key={page.id}>
									<TableCell className="font-medium">{page.name}</TableCell>
									<TableCell className="font-mono text-sm">{page.slug}</TableCell>
									<TableCell>{page.monitor_count}</TableCell>
									<TableCell>
										{page.public ? (
											<Badge variant="default" className="gap-1">
												<Globe className="h-3 w-3" />
												Public
											</Badge>
										) : (
											<Badge variant="secondary" className="gap-1">
												<Lock className="h-3 w-3" />
												Private
											</Badge>
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
												<DropdownMenuItem onClick={() => handleEdit(page)}>
													Edit
												</DropdownMenuItem>
												{page.public && (
													<>
														<DropdownMenuItem onClick={() => handleCopyUrl(page)}>
															{copiedId === page.id ? (
																<Check className="mr-2 h-4 w-4 text-green-500" />
															) : (
																<Copy className="mr-2 h-4 w-4" />
															)}
															{copiedId === page.id ? 'Copied!' : 'Copy URL'}
														</DropdownMenuItem>
														<DropdownMenuItem asChild>
															<a
																href={getStatusPageUrl(page.slug)}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center"
															>
																<ExternalLink className="mr-2 h-4 w-4" />
																View Public Page
															</a>
														</DropdownMenuItem>
													</>
												)}
												<DropdownMenuItem
													onClick={() => handleDelete(page)}
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

			<StatusPageDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				page={editingPage}
				isEdit={!!editingPage}
			/>
		</div>
	)
}
