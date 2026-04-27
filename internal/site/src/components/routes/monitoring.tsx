import { memo } from "react"
import MonitorsTable from "@/components/monitors-table/monitors-table"
import DomainsTable from "@/components/domains-table/domains-table"

const MonitoringPage = memo(function MonitoringPage() {
	return (
		<div className="grid gap-8 mb-14">
			<section>
				<MonitorsTable />
			</section>
			<section>
				<DomainsTable />
			</section>
		</div>
	)
})

export default MonitoringPage
