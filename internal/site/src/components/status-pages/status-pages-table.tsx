"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
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
import { MoreHorizontal, Plus, ExternalLink, Globe, Lock } from "lucide-react"
import { StatusPageDialog } from "./status-page-dialog"
import { Link } from "@/components/router"

export function StatusPagesTable() {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingPage, setEditingPage] = useState<StatusPage | null>(null)

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

	const handleDelete = (id: string) => {
		if (confirm("Are you sure you want to delete this status page?")) {
			deleteMutation.mutate(id)
		}
	}

	if (isLoading) {
		return <div className="p-4">Loading...</div>
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
								<TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
									No status pages yet. Create one to share your service status publicly.
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
												)}
												<DropdownMenuItem
													onClick={() => handleDelete(page.id)}
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
