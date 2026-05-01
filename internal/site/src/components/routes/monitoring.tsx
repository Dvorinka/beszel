import { memo, Suspense } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import MonitorsTable from "@/components/monitors-table/monitors-table"
import DomainsTable from "@/components/domains-table/domains-table"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Globe } from "lucide-react"

const MonitoringPage = memo(function MonitoringPage() {
	const { t } = useLingui()

	return (
		<div className="flex flex-col gap-8 mb-14">
			<h1 className="text-2xl font-semibold">{t`Monitoring`}</h1>

			{/* Website & Service Monitoring Section */}
			<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
				<CardHeader className="p-0 mb-4 pb-4 border-b">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Activity className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-lg"><Trans>Website & Service Monitoring</Trans></CardTitle>
							<CardDescription><Trans>Track uptime, response times, and service health</Trans></CardDescription>
						</div>
					</div>
				</CardHeader>
				<div className="pt-1">
					<Suspense>
						<MonitorsTable />
					</Suspense>
				</div>
			</Card>

			{/* Domain Monitoring Section */}
			<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
				<CardHeader className="p-0 mb-4 pb-4 border-b">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Globe className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-lg"><Trans>Domain Monitoring</Trans></CardTitle>
							<CardDescription><Trans>Track domain expiry dates and DNS status</Trans></CardDescription>
						</div>
					</div>
				</CardHeader>
				<div className="pt-1">
					<Suspense>
						<DomainsTable />
					</Suspense>
				</div>
			</Card>
		</div>
	)
})

export default MonitoringPage
