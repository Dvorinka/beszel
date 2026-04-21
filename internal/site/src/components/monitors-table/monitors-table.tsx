import { Trans, useLingui } from "@lingui/react/macro"
import { useStore } from "@nanostores/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckCircleIcon,
	Edit3Icon,
	GlobeIcon,
	PauseIcon,
	PlayIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon,
	XCircleIcon,
} from "lucide-react"
import { memo, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import {
	deleteMonitor,
	getMonitorTypeLabel,
	listMonitors,
	manualCheck,
	pauseMonitor,
	resumeMonitor,
	type Monitor,
	type MonitorStatus,
	formatUptime,
	formatPing,
} from "@/lib/monitors"
import { cn } from "@/lib/utils"
import { AddMonitorDialog } from "./add-monitor-dialog"
import { Link } from "@/components/router"

// Status indicator component
function StatusIndicator({ status }: { status: MonitorStatus }) {
	const colors = {
		up: "bg-green-500",
		down: "bg-red-500",
		pending: "bg-yellow-400",
		paused: "bg-gray-400",
		maintenance: "bg-blue-500",
	}

	const icons = {
		up: CheckCircleIcon,
		down: XCircleIcon,
		pending: RefreshCwIcon,
		paused: PauseIcon,
		maintenance: RefreshCwIcon,
	}

	const Icon = icons[status] || RefreshCwIcon

	return (
		<div className="flex items-center gap-2">
			<div className={cn("h-2.5 w-2.5 rounded-full", colors[status])} />
			<Icon className="h-4 w-4 text-muted-foreground" />
			<span className="capitalize text-sm">{status}</span>
		</div>
	)
}

// Uptime bar component
function UptimeBar({ stats }: { stats?: Record<string, number> }) {
	const uptime24h = stats?.uptime_24h ?? 100

	let color = "bg-green-500"
	if (uptime24h < 95) color = "bg-yellow-500"
	if (uptime24h < 90) color = "bg-red-500"

	return (
		<div className="flex items-center gap-2">
			<div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
				<div
					className={cn("h-full transition-all", color)}
					style={{ width: `${uptime24h}%` }}
				/>
			</div>
			<span className="text-xs text-muted-foreground w-14">
				{formatUptime(uptime24h)}
			</span>
		</div>
	)
}

// Monitor row component
function MonitorRow({
	monitor,
	onEdit,
}: {
	monitor: Monitor
	onEdit: (m: Monitor) => void
}) {
	const { toast } = useToast()
	const queryClient = useQueryClient()

	const checkMutation = useMutation({
		mutationFn: manualCheck,
		onSuccess: (result) => {
			toast({
				title: `Check complete`,
				description: `${monitor.name} is ${result.status} (${formatPing(result.ping)})`,
			})
			queryClient.invalidateQueries({ queryKey: ["monitors"] })
		},
		onError: () => {
			toast({
				title: "Check failed",
				variant: "destructive",
			})
		},
	})

	const pauseMutation = useMutation({
		mutationFn: monitor.status === "paused" ? resumeMonitor : pauseMonitor,
		onSuccess: () => {
			toast({
				title: monitor.status === "paused" ? "Monitor resumed" : "Monitor paused",
			})
			queryClient.invalidateQueries({ queryKey: ["monitors"] })
		},
	})

	const deleteMutation = useMutation({
		mutationFn: deleteMonitor,
		onSuccess: () => {
			toast({ title: "Monitor deleted" })
			queryClient.invalidateQueries({ queryKey: ["monitors"] })
		},
	})

	return (
		<TableRow>
			<TableCell>
				<Link href={`/monitor/${monitor.id}`} className="flex items-center gap-3 cursor-pointer">
					<GlobeIcon className="h-4 w-4 text-muted-foreground" />
					<div>
						<div className="font-medium hover:underline">{monitor.name}</div>
						<div className="text-xs text-muted-foreground">
							{monitor.url || monitor.hostname}
							{monitor.port ? `:${monitor.port}` : ""}
						</div>
					</div>
				</Link>
			</TableCell>
			<TableCell>
				<span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
					{getMonitorTypeLabel(monitor.type)}
				</span>
			</TableCell>
			<TableCell>
				<StatusIndicator status={monitor.status} />
			</TableCell>
			<TableCell>
				{monitor.last_check ? (
					<div className="text-sm">
						{formatPing(monitor.uptime_stats?.last_ping || 0)}
					</div>
				) : (
					<span className="text-sm text-muted-foreground">-</span>
				)}
			</TableCell>
			<TableCell>
				<UptimeBar stats={monitor.uptime_stats} />
			</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-1">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => checkMutation.mutate(monitor.id)}
									disabled={checkMutation.isPending}
								>
									<RefreshCwIcon
										className={cn(
											"h-4 w-4",
											checkMutation.isPending && "animate-spin"
										)}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Check now</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => pauseMutation.mutate(monitor.id)}
									disabled={pauseMutation.isPending}
								>
									{monitor.status === "paused" ? (
										<PlayIcon className="h-4 w-4" />
									) : (
										<PauseIcon className="h-4 w-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{monitor.status === "paused" ? "Resume" : "Pause"}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<Edit3Icon className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => onEdit(monitor)}>
								<Edit3Icon className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive"
								onClick={() => deleteMutation.mutate(monitor.id)}
							>
								<Trash2Icon className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</TableCell>
		</TableRow>
	)
}

// Main component
export default memo(function MonitorsTable() {
	const { t } = useLingui()
	const [filter, setFilter] = useState("")
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
	const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null)

	const { data: monitors = [], isLoading } = useQuery({
		queryKey: ["monitors"],
		queryFn: listMonitors,
		refetchInterval: 30000, // Refresh every 30 seconds
	})

	const filteredMonitors = useMemo(() => {
		if (!filter) return monitors
		const f = filter.toLowerCase()
		return monitors.filter(
			(m) =>
				m.name.toLowerCase().includes(f) ||
				(m.url || "").toLowerCase().includes(f) ||
				(m.hostname || "").toLowerCase().includes(f)
		)
	}, [monitors, filter])

	const stats = useMemo(() => {
		const total = monitors.length
		const up = monitors.filter((m) => m.status === "up").length
		const down = monitors.filter((m) => m.status === "down").length
		const paused = monitors.filter((m) => m.status === "paused").length
		return { total, up, down, paused }
	}, [monitors])

	return (
		<Card>
			<CardHeader className="p-4 sm:p-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<CardTitle className="text-xl">
							<Trans>Website & Service Monitoring</Trans>
						</CardTitle>
						<CardDescription>
							<Trans>Monitor websites, APIs, and services</Trans>
							<span className="ml-2 text-xs">
								({stats.up} <ArrowUpIcon className="inline h-3 w-3 text-green-500" />
								{stats.down > 0 && (
									<>
										{" "}
										{stats.down}{" "}
										<ArrowDownIcon className="inline h-3 w-3 text-red-500" />
									</>
								)}
								{stats.paused > 0 && (
									<>
										{" "}
										{stats.paused} <PauseIcon className="inline h-3 w-3 text-gray-400" />
									</>
								)}
								/ {stats.total})
							</span>
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Input
							placeholder={t`Search monitors...`}
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							className="w-full sm:w-64"
						/>
						<Button onClick={() => setIsAddDialogOpen(true)}>
							<PlusIcon className="mr-2 h-4 w-4" />
							<Trans>Add</Trans>
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="p-8 text-center text-muted-foreground">
						<Trans>Loading...</Trans>
					</div>
				) : filteredMonitors.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground">
						{filter ? (
							<Trans>No monitors match your search.</Trans>
						) : (
							<div>
								<p className="mb-4">
									<Trans>No monitors configured yet.</Trans>
								</p>
								<Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
									<PlusIcon className="mr-2 h-4 w-4" />
									<Trans>Add your first monitor</Trans>
								</Button>
							</div>
						)}
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>
									<Trans>Name</Trans>
								</TableHead>
								<TableHead>
									<Trans>Type</Trans>
								</TableHead>
								<TableHead>
									<Trans>Status</Trans>
								</TableHead>
								<TableHead>
									<Trans>Response</Trans>
								</TableHead>
								<TableHead>
									<Trans>Uptime (24h)</Trans>
								</TableHead>
								<TableHead className="text-right">
									<Trans>Actions</Trans>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredMonitors.map((monitor) => (
								<MonitorRow
									key={monitor.id}
									monitor={monitor}
									onEdit={setEditingMonitor}
								/>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>

			{/* Add Monitor Dialog */}
			<AddMonitorDialog
				open={isAddDialogOpen}
				onOpenChange={setIsAddDialogOpen}
			/>

			{/* Edit Monitor Dialog */}
			{editingMonitor && (
				<AddMonitorDialog
					open={!!editingMonitor}
					onOpenChange={(open) => !open && setEditingMonitor(null)}
					monitor={editingMonitor}
					isEdit
				/>
			)}
		</Card>
	)
})
