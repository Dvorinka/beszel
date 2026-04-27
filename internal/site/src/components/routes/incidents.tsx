import { memo, useEffect, useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { getIncidents, type Incident } from "@/lib/incidents"
import { formatDate } from "@/lib/domains"

function StatusBadge({ status }: { status: string }) {
	const configs: Record<string, { color: string; icon: React.ElementType; text: string }> = {
		open: { color: "bg-red-500", icon: AlertTriangle, text: "Open" },
		acknowledged: { color: "bg-yellow-500", icon: Clock, text: "Acknowledged" },
		resolved: { color: "bg-green-500", icon: CheckCircle2, text: "Resolved" },
		closed: { color: "bg-gray-500", icon: CheckCircle2, text: "Closed" },
	}
	const config = configs[status] || configs.open
	const Icon = config.icon
	return (
		<div className="flex items-center gap-2">
			<div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
			<Icon className="h-4 w-4 text-muted-foreground" />
			<span className="capitalize text-sm">{config.text}</span>
		</div>
	)
}

function SeverityBadge({ severity }: { severity: string }) {
	const colors: Record<string, string> = {
		critical: "bg-red-500",
		high: "bg-orange-500",
		medium: "bg-yellow-500",
		low: "bg-blue-500",
	}
	return <Badge className={colors[severity] || "bg-gray-500"}>{severity}</Badge>
}

export default memo(() => {
	const { t } = useLingui()
	const [filter, setFilter] = useState("all")

	useEffect(() => {
		document.title = `${t`Incidents`} / Beszel`
	}, [t])

	const { data: incidents = [], isLoading } = useQuery({
		queryKey: ["incidents", filter],
		queryFn: () => getIncidents(filter === "all" ? undefined : { status: filter }),
	})

	if (isLoading) {
		return (
			<div className="container">
				<div className="p-4">Loading incidents...</div>
			</div>
		)
	}

	return (
		<div className="container flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">{t`Incidents`}</h1>
				<div className="flex gap-2">
					{["all", "open", "acknowledged", "resolved", "closed"].map((s) => (
						<Button
							key={s}
							variant={filter === s ? "default" : "outline"}
							size="sm"
							onClick={() => setFilter(s)}
						>
							{s}
						</Button>
					))}
				</div>
			</div>

			{incidents.length === 0 ? (
				<Card>
					<CardContent className="p-8 text-center text-muted-foreground">
						No incidents found.
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{incidents.map((incident: Incident) => (
						<Card key={incident.id}>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg">{incident.title}</CardTitle>
									<div className="flex gap-2">
										<SeverityBadge severity={incident.severity} />
										<StatusBadge status={incident.status} />
									</div>
								</div>
							</CardHeader>
							<CardContent>
								{incident.description && (
									<p className="text-sm text-muted-foreground mb-3">
										{incident.description}
									</p>
								)}
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									<span className="flex items-center gap-1">
										<CalendarIcon className="h-3 w-3" />
										Started: {formatDate(incident.started_at)}
									</span>
									{incident.resolved_at && (
										<span className="flex items-center gap-1">
											<CheckCircle2 className="h-3 w-3" />
											Resolved: {formatDate(incident.resolved_at)}
										</span>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
})
