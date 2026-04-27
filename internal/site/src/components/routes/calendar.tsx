import { memo, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { CalendarView } from "@/components/calendar/calendar-view"

export default memo(() => {
	const { t } = useLingui()

	useEffect(() => {
		document.title = `${t`Calendar`} / Beszel`
	}, [t])

	return (
		<div className="flex flex-col gap-8">
			<CalendarView />
		</div>
	)
})
