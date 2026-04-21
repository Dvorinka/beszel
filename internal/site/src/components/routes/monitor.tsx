import { memo, useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Trans } from "@lingui/react/macro"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
	getMonitorTypeLabel,
	formatUptime,
	formatPing,
} from "@/lib/monitors"
import { formatDate } from "@/lib/domains"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, AreaChart, Area } from "recharts"
import { Link, navigate } from "@/components/router"
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
	const [activeTab, setActiveTab] = useState("overview")

	const { data: monitor, isLoading: isMonitorLoading } = useQuery({
		queryKey: ["monitor", id],
		queryFn: () => getMonitor(id),
		refetchInterval: 30000,
	})

	const { data: stats } = useQuery({
		queryKey: ["monitor-stats", id],
		queryFn: () => getMonitorStats(id),
	})

	const { data: heartbeatsData } = useQuery({
		queryKey: ["monitor-heartbeats", id],
		queryFn: () => getMonitorHeartbeats(id),
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

	const handleDelete = () => {
		if (confirm("Are you sure you want to delete this monitor?")) {
			deleteMutation.mutate()
		}
	}

	// Prepare chart data from heartbeats
	const chartData = useMemo(() => {
		if (!heartbeats) return []
		return heartbeats
			.slice()
			.reverse()
			.map((h: any) => ({
				time: new Date(h.timestamp).toLocaleTimeString(),
				responseTime: h.ping || 0,
				status: h.status === "up" ? 1 : 0,
			}))
	}, [heartbeats])

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
							<Button variant="outline" size="sm">
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

			{/* Stats Grid */}
			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					title="Uptime (24h)"
					value={formatUptime(stats?.uptime_24h ? (stats.uptime_24h.up / stats.uptime_24h.total) * 100 : 0)}
					icon={Activity}
					trend={stats?.uptime_24h && (stats.uptime_24h.up / stats.uptime_24h.total) * 100 >= 99 ? "up" : "down"}
				/>
				<StatCard
					title="Uptime (7d)"
					value={formatUptime(stats?.uptime_7d ? (stats.uptime_7d.up / stats.uptime_7d.total) * 100 : 0)}
					icon={Activity}
					trend={stats?.uptime_7d && (stats.uptime_7d.up / stats.uptime_7d.total) * 100 >= 99 ? "up" : "down"}
				/>
				<StatCard
					title="Uptime (30d)"
					value={formatUptime(stats?.uptime_30d ? (stats.uptime_30d.up / stats.uptime_30d.total) * 100 : 0)}
					icon={Activity}
					trend={stats?.uptime_30d && (stats.uptime_30d.up / stats.uptime_30d.total) * 100 >= 99 ? "up" : "down"}
				/>
				<StatCard
					title="Response Time"
					value={uptimeStats ? `${uptimeStats.avgResponse}ms` : "-"}
					subtitle={`${uptimeStats?.totalChecks || 0} checks`}
					icon={Clock}
				/>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="contents">
				<TabsList className="h-11 p-1.5 w-full shadow-xs overflow-auto justify-start">
					<TabsTrigger value="overview" className="w-full flex items-center gap-1.5">
						<Activity className="size-3.5" />
						<Trans>Overview</Trans>
					</TabsTrigger>
					<TabsTrigger value="response" className="w-full flex items-center gap-1.5">
						<TrendingUp className="size-3.5" />
						<Trans>Response Times</Trans>
					</TabsTrigger>
					<TabsTrigger value="history" className="w-full flex items-center gap-1.5">
						<Clock className="size-3.5" />
						<Trans>Check History</Trans>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="contents">
					<div className="grid gap-4">
						{/* Response Time Chart */}
						<Card>
							<CardHeader>
								<CardTitle>Response Time History</CardTitle>
								<CardDescription>Response times for the last 50 checks</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={chartData}>
											<defs>
												<linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
													<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
											<XAxis dataKey="time" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} unit="ms" />
											<Tooltip
												contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
											/>
											<Area
												type="monotone"
												dataKey="responseTime"
												stroke="#3b82f6"
												fillOpacity={1}
												fill="url(#colorResponse)"
												name="Response Time (ms)"
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
						</Card>

						{/* Monitor Details */}
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
									<CardTitle>Uptime Statistics</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="flex justify-between">
										<span className="text-muted-foreground">24 Hours</span>
										<span className="font-medium text-green-600">{formatUptime(stats?.uptime_24h ? (stats.uptime_24h.up / stats.uptime_24h.total) * 100 : 0)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">7 Days</span>
										<span className="font-medium text-green-600">{formatUptime(stats?.uptime_7d ? (stats.uptime_7d.up / stats.uptime_7d.total) * 100 : 0)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">30 Days</span>
										<span className="font-medium text-green-600">{formatUptime(stats?.uptime_30d ? (stats.uptime_30d.up / stats.uptime_30d.total) * 100 : 0)}</span>
									</div>
									{uptimeStats && (
										<div className="flex justify-between">
											<span className="text-muted-foreground">Total Checks</span>
											<span className="font-medium">{uptimeStats.totalChecks}</span>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="response" className="contents">
					<Card>
						<CardHeader>
							<CardTitle>Response Time Analysis</CardTitle>
							<CardDescription>Detailed response time metrics</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="h-[400px]">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={chartData}>
										<defs>
											<linearGradient id="colorResponseDetail" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
												<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
										<XAxis dataKey="time" tick={{ fontSize: 12 }} />
										<YAxis tick={{ fontSize: 12 }} unit="ms" />
										<Tooltip
											contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
										/>
										<Area
											type="monotone"
											dataKey="responseTime"
											stroke="#8b5cf6"
											strokeWidth={2}
											fillOpacity={1}
											fill="url(#colorResponseDetail)"
											name="Response Time (ms)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="history" className="contents">
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
											<TableCell>{formatDate(hb.timestamp)}</TableCell>
											<TableCell>
												<Badge variant={hb.status === "up" ? "default" : "destructive"}>
													{hb.status}
												</Badge>
											</TableCell>
											<TableCell>{formatPing(hb.ping)}</TableCell>
											<TableCell className="max-w-xs truncate">{hb.message || "-"}</TableCell>
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
				</TabsContent>
			</Tabs>
		</div>
	)
})
