/**
 * Beszel Chart Library
 * A comprehensive collection of chart components for monitoring dashboards
 * Can be exported to other projects
 */

import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
	Area,
	AreaChart,
	Line,
	LineChart,
	Bar,
	BarChart,
	Pie,
	PieChart,
	Cell,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts"

// ============================================================================
// TYPES
// ============================================================================

export type ChartType = "area" | "line" | "bar" | "pie"

export type DataPoint<T = any> = {
	label: string
	dataKey: (data: T) => number | null | undefined
	color: number | string
	opacity?: number
	stackId?: string | number
	order?: number
	strokeOpacity?: number
	activeDot?: boolean
	strokeWidth?: number
}

export type ChartTheme = {
	colors: string[]
	background: string
	gridColor: string
	textColor: string
	tooltipBg: string
	tooltipBorder: string
}

export type ChartProps<T = any> = {
	data: T[]
	dataPoints: DataPoint<T>[]
	type?: ChartType
	height?: number
	showGrid?: boolean
	showLegend?: boolean
	showTooltip?: boolean
	tickFormatter?: (value: number, index: number) => string
	contentFormatter?: (item: any, key: string) => ReactNode
	domain?: [number, number] | [string, string]
	stacked?: boolean
	showTotal?: boolean
	itemSorter?: (a: any, b: any) => number
	reverseStackOrder?: boolean
	referenceLines?: Array<{ y?: number; x?: number; label?: string; color?: string }>
}

// ============================================================================
// DEFAULT THEMES
// ============================================================================

export const defaultThemes: Record<string, ChartTheme> = {
	light: {
		colors: [
			"#3b82f6", // blue-500
			"#22c55e", // green-500
			"#f59e0b", // amber-500
			"#ef4444", // red-500
			"#8b5cf6", // violet-500
			"#ec4899", // pink-500
			"#14b8a6", // teal-500
			"#f97316", // orange-500
		],
		background: "#ffffff",
		gridColor: "#e5e7eb",
		textColor: "#374151",
		tooltipBg: "#ffffff",
		tooltipBorder: "#e5e7eb",
	},
	dark: {
		colors: [
			"#60a5fa", // blue-400
			"#4ade80", // green-400
			"#fbbf24", // amber-400
			"#f87171", // red-400
			"#a78bfa", // violet-400
			"#f472b6", // pink-400
			"#2dd4bf", // teal-400
			"#fb923c", // orange-400
		],
		background: "#1f2937",
		gridColor: "#374151",
		textColor: "#d1d5db",
		tooltipBg: "#1f2937",
		tooltipBorder: "#374151",
	},
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return "0 B"
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatPercentage(value: number, decimals = 2): string {
	return `${value.toFixed(decimals)}%`
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	return `${(ms / 60000).toFixed(1)}m`
}

export function formatShortDate(date: Date | string | number): string {
	const d = new Date(date)
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function getColor(index: number, theme: ChartTheme = defaultThemes.light): string {
	return theme.colors[index % theme.colors.length]
}

// ============================================================================
// CHART CARD COMPONENT
// ============================================================================

export function ChartCard({
	children,
	title,
	description,
	cornerEl,
	empty = false,
	className = "",
}: {
	children: ReactNode
	title?: string
	description?: string
	cornerEl?: ReactNode
	empty?: boolean
	className?: string
}) {
	if (empty) {
		return (
			<div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${className}`}>
				<div className="flex items-center justify-between mb-4">
					<div>
						{title && <h3 className="text-lg font-semibold">{title}</h3>}
						{description && <p className="text-sm text-muted-foreground">{description}</p>}
					</div>
					{cornerEl}
				</div>
				<div className="h-[250px] flex items-center justify-center text-muted-foreground">
					No data available
				</div>
			</div>
		)
	}

	return (
		<div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${className}`}>
			<div className="flex items-center justify-between mb-4">
				<div>
					{title && <h3 className="text-lg font-semibold">{title}</h3>}
					{description && <p className="text-sm text-muted-foreground">{description}</p>}
				</div>
				{cornerEl}
			</div>
			{children}
		</div>
	)
}

// ============================================================================
// AREA CHART COMPONENT
// ============================================================================

export function BeszelAreaChart<T = any>({
	data,
	dataPoints,
	height = 300,
	showGrid = true,
	showLegend = false,
	showTooltip = true,
	tickFormatter = (v) => `${v}`,
	contentFormatter = ({ value }) => `${value}`,
	domain,
	stacked = false,
	showTotal = false,
	itemSorter,
	reverseStackOrder = false,
	referenceLines = [],
}: ChartProps<T>) {
	const Areas = useMemo(() => {
		return dataPoints?.map((dataPoint, i) => {
			let { color } = dataPoint
			if (typeof color === "number") {
				color = defaultThemes.light.colors[color % defaultThemes.light.colors.length]
			}
			return (
				<Area
					key={dataPoint.label}
					dataKey={dataPoint.dataKey}
					name={dataPoint.label}
					type="monotoneX"
					stroke={color}
					fill={color}
					fillOpacity={dataPoint.opacity ?? 0.4}
					strokeOpacity={dataPoint.strokeOpacity ?? 1}
					strokeWidth={dataPoint.strokeWidth ?? 2}
					stackId={stacked ? dataPoint.stackId || "1" : undefined}
					order={dataPoint.order}
					activeDot={dataPoint.activeDot ?? { r: 4 }}
					isAnimationActive={false}
				/>
			)
		})
	}, [dataPoints, stacked])

	return (
		<div className="w-full" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
					{showGrid && (
						<CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke={defaultThemes.light.gridColor} />
					)}
					<XAxis
						dataKey="time"
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={formatShortDate}
					/>
					<YAxis
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={tickFormatter}
						domain={domain}
						width={50}
					/>
					{showTooltip && (
						<Tooltip
							contentStyle={{
								backgroundColor: defaultThemes.light.tooltipBg,
								border: `1px solid ${defaultThemes.light.tooltipBorder}`,
								borderRadius: "6px",
								fontSize: "12px",
							}}
							formatter={(value: any, name: string) => [contentFormatter({ value }, name), name]}
							itemSorter={itemSorter}
						/>
					)}
					{showLegend && <Legend />}
					{referenceLines?.map((line, i) => (
						<ReferenceLine
							key={i}
							y={line.y}
							x={line.x}
							stroke={line.color || "#ef4444"}
							strokeDasharray="5 5"
							label={line.label}
						/>
					))}
					{Areas}
				</AreaChart>
			</ResponsiveContainer>
		</div>
	)
}

// ============================================================================
// LINE CHART COMPONENT
// ============================================================================

export function BeszelLineChart<T = any>({
	data,
	dataPoints,
	height = 300,
	showGrid = true,
	showLegend = false,
	showTooltip = true,
	tickFormatter = (v) => `${v}`,
	contentFormatter = ({ value }) => `${value}`,
	domain,
	itemSorter,
	referenceLines = [],
}: ChartProps<T>) {
	const Lines = useMemo(() => {
		return dataPoints?.map((dataPoint, i) => {
			let { color } = dataPoint
			if (typeof color === "number") {
				color = defaultThemes.light.colors[color % defaultThemes.light.colors.length]
			}
			return (
				<Line
					key={dataPoint.label}
					dataKey={dataPoint.dataKey}
					name={dataPoint.label}
					type="monotoneX"
					stroke={color}
					strokeWidth={dataPoint.strokeWidth ?? 2}
					strokeOpacity={dataPoint.strokeOpacity ?? 1}
					dot={false}
					activeDot={{ r: 4 }}
					isAnimationActive={false}
				/>
			)
		})
	}, [dataPoints])

	return (
		<div className="w-full" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
					{showGrid && (
						<CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke={defaultThemes.light.gridColor} />
					)}
					<XAxis
						dataKey="time"
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={formatShortDate}
					/>
					<YAxis
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={tickFormatter}
						domain={domain}
						width={50}
					/>
					{showTooltip && (
						<Tooltip
							contentStyle={{
								backgroundColor: defaultThemes.light.tooltipBg,
								border: `1px solid ${defaultThemes.light.tooltipBorder}`,
								borderRadius: "6px",
								fontSize: "12px",
							}}
							formatter={(value: any, name: string) => [contentFormatter({ value }, name), name]}
							itemSorter={itemSorter}
						/>
					)}
					{showLegend && <Legend />}
					{referenceLines?.map((line, i) => (
						<ReferenceLine
							key={i}
							y={line.y}
							x={line.x}
							stroke={line.color || "#ef4444"}
							strokeDasharray="5 5"
							label={line.label}
						/>
					))}
					{Lines}
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}

// ============================================================================
// BAR CHART COMPONENT
// ============================================================================

export function BeszelBarChart<T = any>({
	data,
	dataPoints,
	height = 300,
	showGrid = true,
	showLegend = false,
	showTooltip = true,
	tickFormatter = (v) => `${v}`,
	contentFormatter = ({ value }) => `${value}`,
	domain,
	stacked = false,
	itemSorter,
}: ChartProps<T>) {
	const Bars = useMemo(() => {
		return dataPoints?.map((dataPoint, i) => {
			let { color } = dataPoint
			if (typeof color === "number") {
				color = defaultThemes.light.colors[color % defaultThemes.light.colors.length]
			}
			return (
				<Bar
					key={dataPoint.label}
					dataKey={dataPoint.dataKey}
					name={dataPoint.label}
					fill={color}
					fillOpacity={dataPoint.opacity ?? 0.8}
					stackId={stacked ? dataPoint.stackId || "1" : undefined}
					isAnimationActive={false}
				/>
			)
		})
	}, [dataPoints, stacked])

	return (
		<div className="w-full" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
					{showGrid && (
						<CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke={defaultThemes.light.gridColor} />
					)}
					<XAxis
						dataKey="time"
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={formatShortDate}
					/>
					<YAxis
						tick={{ fontSize: 12, fill: defaultThemes.light.textColor }}
						tickFormatter={tickFormatter}
						domain={domain}
						width={50}
					/>
					{showTooltip && (
						<Tooltip
							contentStyle={{
								backgroundColor: defaultThemes.light.tooltipBg,
								border: `1px solid ${defaultThemes.light.tooltipBorder}`,
								borderRadius: "6px",
								fontSize: "12px",
							}}
							formatter={(value: any, name: string) => [contentFormatter({ value }, name), name]}
							itemSorter={itemSorter}
						/>
					)}
					{showLegend && <Legend />}
					{Bars}
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

// ============================================================================
// PIE CHART COMPONENT
// ============================================================================

export function BeszelPieChart({
	data,
	height = 300,
	showTooltip = true,
	innerRadius = 0,
}: {
	data: Array<{ name: string; value: number; color?: string }>
	height?: number
	showTooltip?: boolean
	innerRadius?: number
}) {
	return (
		<div className="w-full" style={{ height }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					{showTooltip && (
						<Tooltip
							contentStyle={{
								backgroundColor: defaultThemes.light.tooltipBg,
								border: `1px solid ${defaultThemes.light.tooltipBorder}`,
								borderRadius: "6px",
								fontSize: "12px",
							}}
						/>
					)}
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						innerRadius={innerRadius}
						outerRadius="80%"
						paddingAngle={2}
						dataKey="value"
						isAnimationActive={false}
					>
						{data.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={
									entry.color ||
									defaultThemes.light.colors[index % defaultThemes.light.colors.length]
								}
							/>
						))}
					</Pie>
				</PieChart>
			</ResponsiveContainer>
		</div>
	)
}

// ============================================================================
// PRE-BUILT MONITORING CHARTS
// ============================================================================

export function CpuUsageChart({
	data,
	showMax = false,
}: {
	data: Array<{ time: string; cpu: number; cpum?: number }>
	showMax?: boolean
}) {
	return (
		<ChartCard title="CPU Usage" description="System-wide CPU utilization">
			<BeszelAreaChart
				data={data}
				dataPoints={[
					{
						label: "CPU Usage",
						dataKey: (d) => (showMax ? d.cpum : d.cpu),
						color: 0,
						opacity: 0.4,
					},
				]}
				tickFormatter={(v) => `${v.toFixed(0)}%`}
				contentFormatter={({ value }) => `${value?.toFixed(2)}%`}
				domain={[0, 100]}
			/>
		</ChartCard>
	)
}

export function MemoryUsageChart({
	data,
	totalMemory,
}: {
	data: Array<{ time: string; mu: number; mm?: number; mb?: number }>
	totalMemory: number
}) {
	return (
		<ChartCard title="Memory Usage" description="Physical memory utilization">
			<BeszelAreaChart
				data={data}
				dataPoints={[
					{
						label: "Used",
						dataKey: (d) => d.mu,
						color: 1,
						opacity: 0.4,
						stackId: "1",
					},
					{
						label: "Buff/Cache",
						dataKey: (d) => d.mb,
						color: 2,
						opacity: 0.4,
						stackId: "1",
					},
				]}
				tickFormatter={(v) => `${v.toFixed(0)} MB`}
				contentFormatter={({ value }) => `${value?.toFixed(2)} MB`}
				domain={[0, totalMemory]}
				stacked
				showTotal
			/>
		</ChartCard>
	)
}

export function DiskUsageChart({
	data,
}: {
	data: Array<{ time: string; du: number; dr?: number; dw?: number }>
}) {
	return (
		<ChartCard title="Disk I/O" description="Read/Write throughput">
			<BeszelLineChart
				data={data}
				dataPoints={[
					{
						label: "Read",
						dataKey: (d) => d.dr,
						color: 0,
						strokeWidth: 2,
					},
					{
						label: "Write",
						dataKey: (d) => d.dw,
						color: 1,
						strokeWidth: 2,
					},
				]}
				tickFormatter={(v) => `${v?.toFixed(0)} MB/s`}
				contentFormatter={({ value }) => `${value?.toFixed(2)} MB/s`}
			/>
		</ChartCard>
	)
}

export function NetworkTrafficChart({
	data,
}: {
	data: Array<{ time: string; ns: number; nr: number }>
}) {
	return (
		<ChartCard title="Network Traffic" description="Sent/Received bandwidth">
			<BeszelLineChart
				data={data}
				dataPoints={[
					{
						label: "Sent",
						dataKey: (d) => d.ns,
						color: 4,
						strokeWidth: 2,
					},
					{
						label: "Received",
						dataKey: (d) => d.nr,
						color: 5,
						strokeWidth: 2,
					},
				]}
				tickFormatter={(v) => `${v?.toFixed(0)} MB/s`}
				contentFormatter={({ value }) => `${value?.toFixed(2)} MB/s`}
			/>
		</ChartCard>
	)
}

export function ResponseTimeChart({
	data,
}: {
	data: Array<{ time: string; ping: number; status?: number }>
}) {
	return (
		<ChartCard title="Response Time" description="Monitor response times">
			<BeszelAreaChart
				data={data}
				dataPoints={[
					{
						label: "Response Time",
						dataKey: (d) => d.ping,
						color: 0,
						opacity: 0.3,
					},
				]}
				tickFormatter={(v) => `${v?.toFixed(0)}ms`}
				contentFormatter={({ value }) => `${value?.toFixed(0)}ms`}
			/>
		</ChartCard>
	)
}

export function UptimeChart({
	data,
}: {
	data: Array<{ time: string; uptime: number }>
}) {
	return (
		<ChartCard title="Uptime" description="Service availability percentage">
			<BeszelAreaChart
				data={data}
				dataPoints={[
					{
						label: "Uptime %",
						dataKey: (d) => d.uptime,
						color: 1,
						opacity: 0.4,
					},
				]}
				tickFormatter={(v) => `${v?.toFixed(0)}%`}
				contentFormatter={({ value }) => `${value?.toFixed(2)}%`}
				domain={[0, 100]}
				referenceLines={[{ y: 99.9, label: "SLA", color: "#22c55e" }]}
			/>
		</ChartCard>
	)
}

export function DomainExpiryChart({
	data,
}: {
	data: Array<{ time: string; daysUntilExpiry: number; sslDaysUntil: number }>
}) {
	return (
		<ChartCard title="Domain Expiry Timeline" description="Days until domain and SSL expiry">
			<BeszelAreaChart
				data={data}
				dataPoints={[
					{
						label: "Domain Days",
						dataKey: (d) => d.daysUntilExpiry,
						color: 0,
						opacity: 0.3,
					},
					{
						label: "SSL Days",
						dataKey: (d) => d.sslDaysUntil,
						color: 1,
						opacity: 0.3,
					},
				]}
				tickFormatter={(v) => `${v?.toFixed(0)}d`}
				contentFormatter={({ value }) => `${value?.toFixed(0)} days`}
			/>
		</ChartCard>
	)
}

// ============================================================================
// STAT CARD COMPONENTS
// ============================================================================

export function StatCard({
	title,
	value,
	subtitle,
	trend,
	icon: Icon,
	onClick,
}: {
	title: string
	value: string
	subtitle?: string
	trend?: "up" | "down" | "neutral"
	icon?: React.ComponentType<{ className?: string }>
	onClick?: () => void
}) {
	const trendColors = {
		up: "text-green-500",
		down: "text-red-500",
		neutral: "text-gray-500",
	}

	const TrendIcon = trend
		? trend === "up"
			? () => (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				  )
			: trend === "down"
				? () => (
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
						</svg>
				  )
			: () => (
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
						</svg>
				  )
		: null

	return (
		<div
			className={`rounded-lg border bg-card text-card-foreground shadow-sm p-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
			onClick={onClick}
		>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm text-muted-foreground">{title}</p>
					<div className="flex items-center gap-2 mt-1">
						<p className="text-2xl font-bold">{value}</p>
						{trend && (
							<span className={trendColors[trend]}>
								<TrendIcon />
							</span>
							)}
					</div>
					{subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
				</div>
				{Icon && (
					<div className="p-2 bg-muted rounded-lg">
						<Icon className="h-4 w-4 text-muted-foreground" />
					</div>
				)}
			</div>
		</div>
	)
}

export function StatusCard({
	status,
	title,
	subtitle,
}: {
	status: "up" | "down" | "warning" | "paused"
	title: string
	subtitle?: string
}) {
	const configs = {
		up: { bg: "bg-green-500", text: "text-green-500", label: "Up" },
		down: { bg: "bg-red-500", text: "text-red-500", label: "Down" },
		warning: { bg: "bg-yellow-500", text: "text-yellow-500", label: "Warning" },
		paused: { bg: "bg-gray-500", text: "text-gray-500", label: "Paused" },
	}

	const config = configs[status]

	return (
		<div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
			<div className="flex items-center gap-3">
				<div className={`h-3 w-3 rounded-full ${config.bg}`} />
				<div>
					<p className={`font-semibold ${config.text}`}>{title}</p>
					{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
	// Re-exports from recharts for convenience
	AreaChart,
	LineChart,
	BarChart,
	PieChart,
	ResponsiveContainer,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ReferenceLine,
}
