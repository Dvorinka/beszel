import { Trans, useLingui } from "@lingui/react/macro"
import { getPagePath } from "@nanostores/router"
import { memo, Suspense, useEffect, useMemo } from "react"
import { Link, $router } from "@/components/router"
import SystemsTable from "@/components/systems-table/systems-table"
import MonitorsTable from "@/components/monitors-table/monitors-table"
import DomainsTable from "@/components/domains-table/domains-table"
import { ActiveAlerts } from "@/components/active-alerts"
import { FooterRepoLink } from "@/components/footer-repo-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, AlertTriangle, Calendar, Server, Activity } from "lucide-react"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Dashboard`} / Beszel`
	}, [t])

	return useMemo(
		() => (
			<>
				<div className="flex flex-col gap-8">
					{/* Active Alerts */}
					<ActiveAlerts />

					{/* System Monitoring Section */}
					<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
						<CardHeader className="p-0 mb-4 pb-4 border-b">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Server className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg"><Trans>System Monitoring</Trans></CardTitle>
									<CardDescription><Trans>Track system resources, containers, and health</Trans></CardDescription>
								</div>
							</div>
						</CardHeader>
						<div className="pt-1">
							<Suspense>
								<SystemsTable />
							</Suspense>
							</div>
						</Card>

					{/* Website & Service Monitoring Section */}
					<Card className="w-full px-3 py-5 sm:py-6 sm:px-6">
						<CardHeader className="p-0 mb-4 pb-4 border-b">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Activity className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-lg"><Trans>Website & Service Monitoring</Trans></CardTitle>
									<CardDescription><Trans>Monitor websites, APIs, and services</Trans></CardDescription>
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

					{/* Quick Actions */}
					<section className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardContent className="p-4">
								<Link href={getPagePath($router, "status_pages")} className="flex items-center gap-3 hover:opacity-80">
									<div className="p-2 bg-muted rounded-lg">
										<Globe className="h-5 w-5 text-muted-foreground" />
									</div>
									<div>
										<p className="font-semibold">{t`Status Pages`}</p>
										<p className="text-sm text-muted-foreground">{t`Manage public status pages`}</p>
									</div>
								</Link>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<Link href={getPagePath($router, "incidents")} className="flex items-center gap-3 hover:opacity-80">
									<div className="p-2 bg-muted rounded-lg">
										<AlertTriangle className="h-5 w-5 text-muted-foreground" />
									</div>
									<div>
										<p className="font-semibold">{t`Incidents`}</p>
										<p className="text-sm text-muted-foreground">{t`View and manage incidents`}</p>
									</div>
								</Link>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<Link href={getPagePath($router, "calendar")} className="flex items-center gap-3 hover:opacity-80">
									<div className="p-2 bg-muted rounded-lg">
										<Calendar className="h-5 w-5 text-muted-foreground" />
									</div>
									<div>
										<p className="font-semibold">{t`Calendar`}</p>
										<p className="text-sm text-muted-foreground">{t`Domain and SSL expiry calendar`}</p>
									</div>
								</Link>
							</CardContent>
						</Card>
					</section>
				</div>
				<FooterRepoLink />
			</>
		),
		[]
	)
})
