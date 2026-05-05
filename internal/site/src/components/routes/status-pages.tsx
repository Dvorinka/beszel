import { memo, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { StatusPageManager } from "@/components/status-pages/status-page-manager"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Status Page Manager`} / Beszel`
	}, [t])

	return (
		<div className="container mx-auto py-6">
			<StatusPageManager />
		</div>
	)
})
