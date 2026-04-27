import { memo, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Trans } from "@lingui/react/macro"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
	Globe,
	Clock,
	Activity,
	RefreshCw,
	ExternalLink,
	Edit3,
	Trash2,
	CheckCircle2,
	XCircle,
	PauseIcon,
	PlayIcon,
	TrendingUp,
	TrendingDown,
} from "lucide-react"
import {
	getMonitor,
	getMonitorStats,
	getMonitorHeartbeats,
	manualCheck,
	pauseMonitor,
	resumeMonitor,
	deleteMonitor,
	updateMonitor,
	getMonitorTypeLabel,
	formatUptime,
	formatPing,
} from "@/lib/monitors"
import { formatDate } from "@/lib/domains"
import { getStatusPages, createStatusPage } from "@/lib/statuspages"
import {
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Area,
	Cell,
	ComposedChart,
	Legend,
} from "recharts"
import { Link, navigate } from "@/components/router"
import { AddMonitorDialog } from "@/components/monitors-table/add-monitor-dialog"
import { cn } from "@/lib/utils"

// Status badge component
function StatusBadge({ status }: { status: string }) {
	const configs = {
		up: { color: "bg-green-500", icon: CheckCircle2, text: "Up" },
		down: { color: "bg-red-500", icon: XCircle, text: "Down" },
		pending: { color: "bg-yellow-500", icon: Clock, text: "Pending" },
		paused: { color: "bg-gray-500", icon: PauseIcon, text: "Paused" },
		maintenance: { color: "bg-blue-500", icon: Activity, text: "Maintenance" },
	}

	const config = configs[status as keyof typeof configs] || configs.pending
	const Icon = config.icon

	return (
		<div className="flex items-center gap-2">
			<div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
			<Icon className="h-4 w-4 text-muted-foreground" />
			<span className="capitalize text-sm">{config.text}</span>
		</div>
	)
}

// Stat card component
function StatCard({
	title,
	value,
	icon: Icon,
	subtitle,
	trend,
	className,
}: {
	title: string
	value: string
	icon: any
	subtitle?: string
	trend?: "up" | "down" | "neutral"
	className?: string
}) {
	const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null

	return (
		<Card className={className}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="p-2 bg-muted rounded-lg">
						<Icon className="h-4 w-4 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm text-muted-foreground">{title}</p>
						<div className="flex items-center gap-2">
							<p className="font-semibold truncate">{value}</p>
							{TrendIcon && <TrendIcon className="h-4 w-4 text-muted-foreground" />}
						</div>
						{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export default memo(function MonitorDetail({ id }: { id: string }) {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h")

	const { data: monitor, isLoading: isMonitorLoading } = useQuery({
		queryKey: ["monitor", id],
		queryFn: () => getMonitor(id),
		staleTime: Infinity,
		refetchInterval: 30000,
	})

	const { data: stats } = useQuery({
		queryKey: ["monitor-stats", id],
		queryFn: () => getMonitorStats(id),
		refetchInterval: 30000,
	})

	const { data: heartbeatsData } = useQuery({
		queryKey: ["monitor-heartbeats", id],
		queryFn: () => getMonitorHeartbeats(id),
		refetchInterval: 30000,
	})
	const heartbeats = heartbeatsData?.heartbeats

	const checkMutation = useMutation({
		mutationFn: () => manualCheck(id),
		onSuccess: (result) => {
			toast({
				title: `Check complete`,
				description: `${monitor?.name} is ${result.status}`,
			})
			queryClient.invalidateQueries({ queryKey: ["monitor", id] })
			queryClient.invalidateQueries({ queryKey: ["monitor-heartbeats", id] })
		},
	})

	const pauseMutation = useMutation({
		mutationFn: () => (monitor?.status === "paused" ? resumeMonitor(id) : pauseMonitor(id)),
		onSuccess: () => {
			toast({
				title: monitor?.status === "paused" ? "Monitor resumed" : "Monitor paused",
			})
			queryClient.invalidateQueries({ queryKey: ["monitor", id] })
		},
	})

	const deleteMutation = useMutation({
		mutationFn: () => deleteMonitor(id),
		onSuccess: () => {
			toast({ title: "Monitor deleted" })
			navigate("/")
		},
	})

	const [isCreateStatusPageOpen, setIsCreateStatusPageOpen] = useState(false)
	const [statusPageName, setStatusPageName] = useState("")
	const [statusPageSlug, setStatusPageSlug] = useState("")

	const { data: statusPages } = useQuery({
		queryKey: ["status-pages"],
		queryFn: () => getStatusPages(),
	})

	const updateStatusPagesMutation = useMutation({
		mutationFn: (status_pages: string[]) => updateMonitor(id, { status_pages } as any),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["monitor", id] })
			toast({ title: "Status pages updated" })
		},
	})

	const createStatusPageMutation = useMutation({
		mutationFn: () =>
			createStatusPage({
				name: statusPageName || `${monitor?.name} Status`,
				slug: statusPageSlug || monitor?.name?.toLowerCase().replace(/\s+/g, "-") || "status",
				title: statusPageName || `${monitor?.name} Status Page`,
				public: true,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["status-pages"] })
			toast({ title: "Status page created" })
			setIsCreateStatusPageOpen(false)
			setStatusPageName("")
			setStatusPageSlug("")
		},
	})

	const handleDelete = () => {
		setIsDeleteDialogOpen(true)
	}

	// Filter heartbeats by time range
	const filteredHeartbeats = useMemo(() => {
		if (!heartbeats) return []
		const now = Date.now()
		const ranges: Record<string, number> = {
			"24h": 24 * 60 * 60 * 1000,
			"7d": 7 * 24 * 60 * 60 * 1000,
			"30d": 30 * 24 * 60 * 60 * 1000,
		}
		const cutoff = now - (ranges[timeRange] || ranges["24h"])
		return heartbeats.filter((h: any) => {
			const t = new Date(h.time || h.timestamp).getTime()
			return t >= cutoff
		})
	}, [heartbeats, timeRange])

	// Prepare chart data from heartbeats
	const chartData = useMemo(() => {
		if (!filteredHeartbeats.length) return []
		return filteredHeartbeats
			.slice()
			.reverse()
			.map((h: any) => ({
				time: new Date(h.time || h.timestamp).toLocaleTimeString(),
				responseTime: h.ping || 0,
				status: h.status === "up" ? 1 : 0,
			}))
	}, [filteredHeartbeats])

	// Calculate stats
	const uptimeStats = useMemo(() => {
		if (!heartbeats || !Array.isArray(heartbeats) || heartbeats.length === 0) return null
		const total = heartbeats.length
		const up = heartbeats.filter((h: any) => h.status === "up").length
		const avgResponse = heartbeats.reduce((sum: number, h: any) => sum + (h.ping || 0), 0) / total
		return {
			uptime: ((up / total) * 100).toFixed(2),
			avgResponse: avgResponse.toFixed(0),
			totalChecks: total,
		}
	}, [heartbeats])

	if (isMonitorLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (!monitor) {
		return (
			<div className="text-center py-12">
				<Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Monitor not found</h2>
				<p className="text-muted-foreground">The monitor you are looking for does not exist.</p>
				<Button asChild className="mt-4">
					<Link href="/">Go back home</Link>
				</Button>
			</div>
		)
	}

	const isUp = monitor.status === "up"
	const isPaused = monitor.status === "paused"

	return (
		<div className="grid gap-4 mb-14">
			{/* Header */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div
								className={cn(
									"h-12 w-12 rounded-full flex items-center justify-center",
									isUp ? "bg-green-500/10" : isPaused ? "bg-gray-500/10" : "bg-red-500/10"
								)}
							>
								<Globe
									className={cn(
										"h-6 w-6",
										isUp ? "text-green-500" : isPaused ? "text-gray-500" : "text-red-500"
									)}
								/>
							</div>
							<div>
								<h1 className="text-2xl font-bold">{monitor.name}</h1>
								<div className="flex items-center gap-2 mt-1">
									<StatusBadge status={monitor.status} />
									<Badge variant="secondary">{getMonitorTypeLabel(monitor.type)}</Badge>
									{monitor.interval && (
										<Badge variant="outline">{monitor.interval}s interval</Badge>
									)}
								</div>
								{monitor.url && (
									<p className="text-sm text-muted-foreground mt-1">{monitor.url}</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<Button
								variant="outline"
								size="sm"
								onClick={() => checkMutation.mutate()}
								disabled={checkMutation.isPending || isPaused}
							>
								<RefreshCw className={cn("mr-2 h-4 w-4", checkMutation.isPending && "animate-spin")} />
								<Trans>Check Now</Trans>
							</Button>
							{monitor.url && (
								<Button variant="outline" size="sm" asChild>
									<a href={monitor.url} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="mr-2 h-4 w-4" />
										<Trans>Visit</Trans>
									</a>
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => pauseMutation.mutate()}
								disabled={pauseMutation.isPending}
							>
								{monitor.status === "paused" ? (
									<>
										<PlayIcon className="mr-2 h-4 w-4" />
										<Trans>Resume</Trans>
									</>
								) : (
									<>
										<PauseIcon className="mr-2 h-4 w-4" />
										<Trans>Pause</Trans>
									</>
								)}
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

			{/* Summary Bar */}
			<div className="grid sm:grid-cols-4 gap-4">
				<StatCard
					title="Uptime (24h)"
					value={formatUptime(stats?.uptime_24h ? (stats.uptime_24h.up / stats.uptime_24h.total) * 100 : 0)}
					icon={Activity}
				/>
				<StatCard
					title="Uptime (7d)"
					value={formatUptime(stats?.uptime_7d ? (stats.uptime_7d.up / stats.uptime_7d.total) * 100 : 0)}
					icon={Activity}
				/>
				<StatCard
					title="Uptime (30d)"
					value={formatUptime(stats?.uptime_30d ? (stats.uptime_30d.up / stats.uptime_30d.total) * 100 : 0)}
					icon={Activity}
				/>
				<StatCard
					title="Avg Response"
					value={uptimeStats ? `${uptimeStats.avgResponse}ms` : "-"}
					subtitle={`${uptimeStats?.totalChecks || 0} checks`}
					icon={Clock}
				/>
			</div>

			{/* Combined Uptime & Response Chart */}
			<Card>
				<CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<CardTitle>Uptime & Response Time</CardTitle>
						<CardDescription>
							<Trans>Status and response time over the selected period</Trans>
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						{(["24h", "7d", "30d"] as const).map((range) => (
							<Button
								key={range}
								variant={timeRange === range ? "default" : "outline"}
								size="sm"
								onClick={() => setTimeRange(range)}
							>
								{range === "24h" ? "24h" : range === "7d" ? "7d" : "30d"}
							</Button>
						))}
					</div>
				</CardHeader>
				<CardContent>
					<div className="h-[300px]">
						{chartData.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={chartData}>
									<defs>
										<linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
									<XAxis dataKey="time" tick={{ fontSize: 12 }} />
									<YAxis
										yAxisId="left"
										tick={{ fontSize: 12 }}
										unit="ms"
									/>
									<YAxis
										yAxisId="right"
										orientation="right"
										tick={{ fontSize: 12 }}
										domain={[0, 1]}
										tickFormatter={(v) => (v === 1 ? "Up" : "Down")}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="responseTime"
										stroke="#3b82f6"
										fillOpacity={1}
										fill="url(#colorResponse)"
										name="Response Time (ms)"
									/>
									<Bar
										yAxisId="right"
										dataKey="status"
										barSize={4}
										name="Status"
									>
										{chartData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.status === 1 ? "#22c55e" : "#ef4444"}
											/>
										))}
									</Bar>
								</ComposedChart>
							</ResponsiveContainer>
						) : (
							<div className="h-full flex items-center justify-center text-muted-foreground">
								<Trans>No data available for selected time range</Trans>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="grid sm:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Monitor Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Type</span>
							<span className="font-medium">{getMonitorTypeLabel(monitor.type)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Interval</span>
							<span className="font-medium">{monitor.interval}s</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Retries</span>
							<span className="font-medium">{monitor.retries}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Created</span>
							<span className="font-medium">{formatDate(monitor.created)}</span>
						</div>
						{monitor.last_check && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Last Check</span>
								<span className="font-medium">{formatDate(monitor.last_check)}</span>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Status Page</CardTitle>
						<CardDescription>Link or create a public status page</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{statusPages && statusPages.length > 0 ? (
							<div className="space-y-2">
								{statusPages.map((page) => {
									const isLinked = monitor.status_pages?.includes(page.id) || false
									return (
										<div key={page.id} className="flex items-center justify-between py-1">
											<span className="text-sm">{page.name}</span>
											<Button
												variant={isLinked ? "default" : "outline"}
												size="sm"
												onClick={() => {
													const current = monitor.status_pages || []
													const next = isLinked
															? current.filter((sp) => sp !== page.id)
															: [...current, page.id]
													updateStatusPagesMutation.mutate({
														id: monitor.id,
														status_pages: next,
													} as any)
												}}
											>
												{isLinked ? "Linked" : "Link"}
											</Button>
										</div>
									)
									})}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">No status pages yet.</p>
							)}
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={() => setIsCreateStatusPageOpen(true)}
						>
							Create Status Page
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Checks</CardTitle>
					<CardDescription>Last 50 monitor checks</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Time</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Response Time</TableHead>
								<TableHead>Message</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{heartbeats?.slice(0, 50).map((hb: any) => (
								<TableRow key={hb.id}>
									<TableCell>{formatDate(hb.time || hb.timestamp)}</TableCell>
									<TableCell>
										<Badge variant={hb.status === "up" ? "default" : "destructive"}>
											{hb.status}
										</Badge>
									</TableCell>
									<TableCell>{formatPing(hb.ping)}</TableCell>
									<TableCell className="max-w-xs truncate">{hb.msg || "-"}</TableCell>
								</TableRow>
							))}
							{!heartbeats?.length && (
								<TableRow>
									<TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
										No check history available
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Create Status Page Dialog */}
			{isCreateStatusPageOpen && (
				<AlertDialog open={isCreateStatusPageOpen} onOpenChange={setIsCreateStatusPageOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Create Status Page</AlertDialogTitle>
							<AlertDialogDescription>
								Create a public status page for this monitor.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="sp-name">Name</Label>
								<Input
									id="sp-name"
									value={statusPageName}
									onChange={(e) => setStatusPageName(e.target.value)}
									placeholder={`${monitor.name} Status`}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="sp-slug">Slug</Label>
								<Input
									id="sp-slug"
									value={statusPageSlug}
									onChange={(e) => setStatusPageSlug(e.target.value)}
									placeholder={monitor.name?.toLowerCase().replace(/\s+/g, "-")}
								/>
							</div>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setIsCreateStatusPageOpen(false)}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => createStatusPageMutation.mutate()}
								disabled={createStatusPageMutation.isPending}
							>
								Create
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
			<AddMonitorDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				monitor={monitor}
				isEdit
			/>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Monitor</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this monitor? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								deleteMutation.mutate()
								setIsDeleteDialogOpen(false)
							}}
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
