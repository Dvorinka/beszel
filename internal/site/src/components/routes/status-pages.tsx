import { memo, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { StatusPagesTable } from "@/components/status-pages/status-pages-table"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Status Pages`} / Beszel`
	}, [t])

	return (
		<div className="flex flex-col gap-8">
			<StatusPagesTable />
		</div>
	)
})
