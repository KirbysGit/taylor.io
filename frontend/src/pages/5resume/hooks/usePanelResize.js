import { useCallback, useEffect, useState } from 'react'
import { getPanelWidthBounds } from '../utils/resumePreviewHelpers'
import { DEFAULT_LEFT_PANEL_WIDTH } from '../utils/resumePreviewConstants'

/**
 * Left panel width + drag-to-resize + clamp on window resize.
 */
export function usePanelResize(defaultWidth = DEFAULT_LEFT_PANEL_WIDTH) {
	const [leftPanelWidth, setLeftPanelWidth] = useState(defaultWidth)
	const [isResizing, setIsResizing] = useState(false)

	const handleMouseMove = useCallback((e) => {
		const { min, max } = getPanelWidthBounds(window.innerWidth)
		setLeftPanelWidth(Math.min(Math.max(min, e.clientX), max))
	}, [])

	const handleMouseUp = useCallback(() => setIsResizing(false), [])

	useEffect(() => {
		if (!isResizing) return
		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
		document.body.style.cursor = 'col-resize'
		document.body.style.userSelect = 'none'
		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
	}, [isResizing, handleMouseMove, handleMouseUp])

	useEffect(() => {
		const onResize = () => {
			const { min, max } = getPanelWidthBounds(window.innerWidth)
			setLeftPanelWidth((prev) => Math.min(Math.max(min, prev), max))
		}
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [])

	const handleMouseDown = useCallback((e) => {
		setIsResizing(true)
		e.preventDefault()
	}, [])

	const handleDoubleClick = useCallback(() => {
		const { min, max } = getPanelWidthBounds(window.innerWidth)
		setLeftPanelWidth(Math.min(Math.max(min, defaultWidth), max))
	}, [defaultWidth])

	return {
		leftPanelWidth,
		isResizing,
		handleMouseDown,
		handleDoubleClick,
	}
}
