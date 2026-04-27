import { useLingui } from "@lingui/react/macro"
import { getPagePath } from "@nanostores/router"
import { memo, Suspense, useEffect, useMemo } from "react"
import { Link, $router } from "@/components/router"
import SystemsTable from "@/components/systems-table/systems-table"
import MonitorsTable from "@/components/monitors-table/monitors-table"
import DomainsTable from "@/components/domains-table/domains-table"
import { ActiveAlerts } from "@/components/active-alerts"
import { FooterRepoLink } from "@/components/footer-repo-link"
import { Card, CardContent } from "@/components/ui/card"
import { Globe, AlertTriangle, Calendar } from "lucide-react"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Dashboard`} / Beszel`
	}, [t])

	return useMemo(
		() => (
			<>
				<div className="flex flex-col gap-8">
					{/* Section 1: System Monitoring */}
					<section>
						<ActiveAlerts />
						<Suspense>
							<SystemsTable />
						</Suspense>
					</section>

					{/* Section 2: Website & Service Monitoring */}
					<section>
						<Suspense>
							<MonitorsTable />
						</Suspense>
					</section>

					{/* Section 3: Domain Monitoring */}
					<section>
						<Suspense>
							<DomainsTable />
						</Suspense>
					</section>

					{/* Section 4: Quick Actions */}
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
