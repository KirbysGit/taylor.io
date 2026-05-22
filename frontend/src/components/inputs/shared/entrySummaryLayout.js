/** Grid layout for collapsed entry cards; compact hides the section icon (résumé preview sidebar). */
export function getEntrySummaryGridClasses({ compact, isDraggable }) {
	const showIcon = !compact
	if (showIcon) {
		return {
			showIcon: true,
			grid: isDraggable ? 'grid-cols-[auto_auto_1fr_auto]' : 'grid-cols-[auto_1fr_auto]',
			pillsCol: isDraggable ? 'col-[2/-1]' : 'col-[1/-1]',
		}
	}
	return {
		showIcon: false,
		grid: isDraggable ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]',
		pillsCol: 'col-[1/-1]',
	}
}

export function entrySummaryPaddingClass(compact) {
	return compact ? 'px-3 py-3' : 'px-4 py-3.5 sm:px-5 sm:py-4'
}
