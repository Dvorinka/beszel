"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "@/components/router"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Globe, Shield } from "lucide-react"
import { getCalendarEvents, type CalendarEvent } from "@/lib/incidents"

export function CalendarView() {
	const [currentDate, setCurrentDate] = useState(new Date())
	const year = currentDate.getFullYear()
	const month = currentDate.getMonth()

	const queryRange = useMemo(() => {
		const from = new Date(year, month, 1)
		const to = new Date(year, month + 13, 0)
		return {
			from: toDateString(from),
			to: toDateString(to),
		}
	}, [year, month])

	const { data: events, isLoading } = useQuery({
		queryKey: ["calendar-events", queryRange.from, queryRange.to],
		queryFn: () => getCalendarEvents(queryRange),
	})

	const daysInMonth = useMemo(() => {
		return new Date(year, month + 1, 0).getDate()
	}, [year, month])

	const firstDayOfMonth = useMemo(() => {
		return new Date(year, month, 1).getDay()
	}, [year, month])

	const days = useMemo(() => {
		const d: { day: number; events: CalendarEvent[] }[] = []

		// Empty cells for days before start of month
		for (let i = 0; i < firstDayOfMonth; i++) {
			d.push({ day: 0, events: [] })
		}

		// Days of month
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
			const dayEvents = events?.filter((e) => e.date === dateStr) || []
			d.push({ day, events: dayEvents })
		}

		return d
	}, [year, month, daysInMonth, firstDayOfMonth, events])

	const upcomingEvents = useMemo(() => {
		const today = toDateString(new Date())
		return (events || [])
			.filter((event) => event.date >= today)
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(0, 8)
	}, [events])

	const prevMonth = () => {
		setCurrentDate(new Date(year, month - 1, 1))
	}

	const nextMonth = () => {
		setCurrentDate(new Date(year, month + 1, 1))
	}

	const getEventIcon = (type: string) => {
		switch (type) {
			case "domain_expiry":
				return <Globe className="h-3 w-3" />
			case "ssl_expiry":
				return <Shield className="h-3 w-3" />
			case "incident":
				return <AlertCircle className="h-3 w-3" />
			default:
				return null
		}
	}

	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	]

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarIcon className="h-5 w-5 text-primary" />
						<span className="animate-pulse">Calendar View</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						<p className="text-sm">Loading calendar events...</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	const today = new Date()
	const isToday = (day: number) =>
		day > 0 && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

	return (
		<Card className="w-full">
			<CardHeader className="pb-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
						<div className="p-2 bg-primary/10 rounded-lg">
							<CalendarIcon className="h-5 w-5 text-primary" />
						</div>
						<span>Calendar View</span>
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="font-semibold min-w-[120px] sm:min-w-[160px] text-center text-sm sm:text-base px-2">
							{monthNames[month]} {year}
						</span>
						<Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Day headers */}
				<div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground">
					{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
						<div key={i} className="py-1 sm:py-1.5">
							<span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
							<span className="sm:hidden">{d}</span>
						</div>
					))}
				</div>

				{/* Calendar grid */}
				<div className="grid grid-cols-7 gap-0.5 sm:gap-1 lg:gap-1.5">
					{days.map((day, index) => (
						<div
							key={index}
							className={`
								min-h-[48px] sm:min-h-[72px] lg:min-h-[96px]
								border rounded sm:rounded-lg p-0.5 sm:p-1.5 lg:p-2
								transition-all duration-150
								${day.day === 0 ? "bg-muted/10 border-transparent" : "bg-card hover:bg-muted/30 hover:shadow-sm"}
								${isToday(day.day) ? "ring-2 ring-primary ring-offset-1" : ""}
							`}
						>
							{day.day > 0 && (
								<>
									<div className={`
										font-semibold text-[11px] sm:text-xs lg:text-sm mb-0.5 sm:mb-1
										${isToday(day.day) ? "text-primary" : ""}
									`}>
										{day.day}
									</div>
									<div className="space-y-px sm:space-y-0.5">
										{day.events.slice(0, 2).map((event, idx) => (
											<Link
												key={event.id}
												href={event.link || "/calendar"}
												className="
													text-[9px] sm:text-[10px] lg:text-xs px-0.5 sm:px-1 py-px sm:py-0.5 rounded
													flex items-center gap-0.5 sm:gap-1
													hover:brightness-110 transition-all
												"
												style={{ backgroundColor: `${event.color}20`, color: event.color }}
												title={event.title}
											>
												{getEventIcon(event.type)}
												<span className="truncate hidden lg:inline">{event.title}</span>
												{idx === 1 && day.events.length > 2 && (
													<span className="text-[8px] sm:text-[9px]">+{day.events.length - 2}</span>
												)}
											</Link>
										))}
									</div>
								</>
							)}
						</div>
					))}
				</div>

				{/* Upcoming Events Section */}
				<div className="mt-6 border-t pt-4">
					<div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<h3 className="text-sm font-semibold flex items-center gap-2">
							<span className="w-1.5 h-4 bg-primary rounded-full" />
							Upcoming Events
						</h3>
						<span className="text-xs text-muted-foreground">Next 12 months</span>
					</div>
					{upcomingEvents.length > 0 ? (
						<div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
							{upcomingEvents.map((event) => (
								<Link
									key={event.id}
									href={event.link || "/calendar"}
									className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50 hover:border-primary/30 transition-all"
								>
									<div
										className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md shadow-sm"
										style={{ backgroundColor: `${event.color}20`, color: event.color }}
									>
										{getEventIcon(event.type)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium">{event.title}</div>
										<div className="text-xs text-muted-foreground">{event.date}</div>
									</div>
									{typeof event.days_until === "number" && (
										<div className={`
											text-xs font-medium px-2 py-1 rounded-full
											${event.days_until === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : ""}
											${event.days_until > 0 && event.days_until <= 7 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : ""}
											${event.days_until > 7 ? "bg-muted text-muted-foreground" : ""}
										`}>
											{event.days_until === 0 ? "Today" : `${event.days_until}d`}
										</div>
									)}
								</Link>
							))}
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
							<div className="flex justify-center mb-2">
								<CalendarIcon className="h-8 w-8 opacity-50" />
							</div>
							<p>No upcoming events in the next 12 months</p>
							<p className="text-xs mt-1">Domain expiries, SSL renewals, and incidents will appear here</p>
						</div>
					)}
				</div>

				{/* Legend */}
				<div className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm">
					<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20">
						<div className="w-2 h-2 rounded-full bg-red-500" />
						<span className="text-red-700 dark:text-red-400 font-medium">&lt; 7 days</span>
					</div>
					<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/20">
						<div className="w-2 h-2 rounded-full bg-orange-500" />
						<span className="text-orange-700 dark:text-orange-400 font-medium">&lt; 30 days</span>
					</div>
					<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20">
						<div className="w-2 h-2 rounded-full bg-purple-500" />
						<span className="text-purple-700 dark:text-purple-400 font-medium">SSL Expiry</span>
					</div>
					<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900/20">
						<div className="w-2 h-2 rounded-full bg-gray-500" />
						<span className="text-gray-700 dark:text-gray-400 font-medium">Incident</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function toDateString(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
