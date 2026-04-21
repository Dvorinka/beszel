import { useLingui } from "@lingui/react/macro"
import { memo, Suspense, useEffect, useMemo } from "react"
import SystemsTable from "@/components/systems-table/systems-table"
import MonitorsTable from "@/components/monitors-table/monitors-table"
import DomainsTable from "@/components/domains-table/domains-table"
import { ActiveAlerts } from "@/components/active-alerts"
import { FooterRepoLink } from "@/components/footer-repo-link"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Dashboard`} / Beszel`
	}, [t])

	return useMemo(
		() => (
			<>
				<div className="flex flex-col gap-6">
					{/* Section 1: Device Monitoring (Primary) */}
					<section>
						<ActiveAlerts />
						<Suspense>
							<SystemsTable />
						</Suspense>
					</section>

					{/* Section 2: Website & Service Monitoring (Secondary) */}
					<section>
						<Suspense>
							<MonitorsTable />
						</Suspense>
					</section>

					{/* Section 3: Domain Expiry Monitoring */}
					<section>
						<Suspense>
							<DomainsTable />
						</Suspense>
					</section>
				</div>
				<FooterRepoLink />
			</>
		),
		[]
	)
})
