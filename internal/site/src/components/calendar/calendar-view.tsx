"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	ChevronLeft,
	ChevronRight,
	Calendar as CalendarIcon,
	AlertCircle,
	Globe,
	Shield,
} from "lucide-react"
import { getCalendarEvents, type CalendarEvent } from "@/lib/incidents"
import { formatDate } from "@/lib/domains"

export function CalendarView() {
	const [currentDate, setCurrentDate] = useState(new Date())

	const { data: events, isLoading } = useQuery({
		queryKey: ["calendar-events"],
		queryFn: getCalendarEvents,
	})

	const year = currentDate.getFullYear()
	const month = currentDate.getMonth()

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
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	]

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarIcon className="h-5 w-5" />
						Calendar View
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-96 flex items-center justify-center">Loading...</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<CalendarIcon className="h-5 w-5" />
						Calendar View
					</CardTitle>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="icon" onClick={prevMonth}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="font-medium min-w-[140px] text-center">
							{monthNames[month]} {year}
						</span>
						<Button variant="outline" size="icon" onClick={nextMonth}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground mb-2">
					<div>Sun</div>
					<div>Mon</div>
					<div>Tue</div>
					<div>Wed</div>
					<div>Thu</div>
					<div>Fri</div>
					<div>Sat</div>
				</div>
				<div className="grid grid-cols-7 gap-1">
					{days.map((day, index) => (
						<div
							key={index}
							className={`min-h-[100px] border rounded-lg p-2 ${
								day.day === 0 ? "bg-muted/30" : "bg-card"
							}`}
						>
							{day.day > 0 && (
								<>
									<div className="font-medium text-sm mb-1">{day.day}</div>
									<div className="space-y-1">
										{day.events.map((event) => (
											<div
												key={event.id}
												className="text-xs p-1 rounded flex items-center gap-1"
												style={{ backgroundColor: event.color + "20", color: event.color }}
												title={event.title}
											>
												{getEventIcon(event.type)}
												<span className="truncate">{event.title}</span>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					))}
				</div>
				<div className="mt-4 flex flex-wrap gap-4 text-sm">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded bg-red-500" />
						<span>Domain Expiring (&lt; 7 days)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded bg-orange-500" />
						<span>Domain Expiring (&lt; 30 days)</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded bg-purple-500" />
						<span>SSL Expiry</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded bg-gray-500" />
						<span>Incident</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
