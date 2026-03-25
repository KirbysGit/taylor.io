// components / right / RightPanel.jsx

// Right panel containing the resume preview and controls.

import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faRefresh,
	faDownload,
	faFileWord,
	faSpinner,
	faCircleCheck,
	faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'
import ExactPdfPages from './ExactPdfPages'

function RightPanel({
	previewHtml,
	isGeneratingPreview,
	previewZoom,
	zoomMin = 50,
	zoomMax = 150,
	onZoomIn,
	onZoomOut,
	onZoomReset = () => {},
	downloadStatus = null,
	onDownloadPDF,
	onDownloadWord,
	onRefreshPreview,
	validationErrors = [],
	exactPdfUrl = null,
	exactPdfRefreshing = false,
}) {
	const hasValidationErrors = validationErrors.length > 0
	const isDownloadBusy = downloadStatus?.phase === 'loading'
	const downloadLabel =
		downloadStatus?.type === 'word' ? 'Word document' : 'PDF'
	const isDefaultZoom = previewZoom === 100
	const showExact = Boolean(exactPdfUrl)
	const showPreviewRefreshOverlay =
		!hasValidationErrors &&
		Boolean(previewHtml) &&
		(exactPdfRefreshing || isGeneratingPreview)

	// Layout size must match scaled visual size or horizontal scroll clips the left edge
	// (flex justify-center + transform-only scale keeps layout at 850px wide).
	const PAPER_W = 850
	const MIN_PAGE_H = 1100
	const iframeRef = useRef(null)
	const [previewContentHeight, setPreviewContentHeight] = useState(MIN_PAGE_H)
	const scale = previewZoom / 100
	const scaledW = PAPER_W * scale
	const scaledH = previewContentHeight * scale

	useEffect(() => {
		setPreviewContentHeight(MIN_PAGE_H)
	}, [previewHtml])

	function handlePreviewIframeLoad() {
		const doc = iframeRef.current?.contentDocument
		if (!doc?.body) return
		const rawH = Math.max(
			doc.documentElement?.scrollHeight ?? 0,
			doc.body.scrollHeight,
		)
		setPreviewContentHeight(Math.max(MIN_PAGE_H, Math.ceil(rawH)))
	}

	return (
		<section className="flex-1 bg-white overflow-hidden p-4 flex flex-col relative min-h-0">
			{/* Control buttons */}
			<div className={`flex items-center justify-between flex-shrink-0 mb-4 ${hasValidationErrors ? 'blur-sm' : ''}`}>
				{/* Spacer for centering */}
				<div className="flex-1"></div>
				
				{/* Zoom: − / default or reset / + (no % — range 50–150) */}
				<div
					className="flex items-center gap-2"
					role="group"
					aria-label="Preview zoom"
				>
					<button
						type="button"
						onClick={onZoomOut}
						disabled={previewZoom <= zoomMin}
						className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Zoom out"
						aria-label="Zoom preview out"
					>
						−
					</button>
					<div className="flex min-w-[4.25rem] flex-col items-center justify-center px-1">
						<span className="sr-only">Preview zoom {previewZoom} percent</span>
						{isDefaultZoom ? (
							<span className="text-xs font-medium text-gray-400" aria-hidden="true">
								Default
							</span>
						) : (
							<button
								type="button"
								onClick={onZoomReset}
								className="text-xs font-medium text-brand-pink hover:underline"
								title="Reset to default size"
							>
								Reset
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={onZoomIn}
						disabled={previewZoom >= zoomMax}
						className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Zoom in"
						aria-label="Zoom preview in"
					>
						+
					</button>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2 flex-1 justify-end">
					<button
						type="button"
						className="px-3 py-1.5 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
						onClick={onDownloadPDF}
						disabled={isDownloadBusy}
					>
						<FontAwesomeIcon icon={faDownload} />
						<span className="text-sm">PDF</span>
					</button>
					<button
						type="button"
						className="px-3 py-1.5 bg-[#2b579a] text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
						onClick={onDownloadWord}
						disabled={isDownloadBusy}
					>
						<FontAwesomeIcon icon={faFileWord} />
						<span className="text-sm">Word</span>
					</button>
					<button
						type="button"
						className="px-3 py-1.5 bg-gray-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
						onClick={onRefreshPreview}
					>
						<FontAwesomeIcon icon={faRefresh} />
						<span className="text-sm">Refresh</span>
					</button>
				</div>
			</div>

			{/* Draft vs exact preview label */}
			<div
				className={`flex-shrink-0 mb-2 px-1 ${hasValidationErrors ? 'blur-sm' : ''}`}
				aria-live="polite"
			>
				{showExact ? (
					<p className="text-xs font-medium text-gray-700">
						<span className="text-green-700">Exact preview</span>
						<span className="text-gray-500 font-normal"> — matches PDF export.</span>
					</p>
				) : (
					<p className="text-xs text-gray-600">
						<span className="font-medium text-gray-800">Draft preview</span>
						<span> — fast while you edit. Exact preview loads after you pause.</span>
					</p>
				)}
			</div>

			{/* Download progress / success (over preview) */}
			{downloadStatus && (
				<div
					className="absolute top-20 right-6 z-30 w-[min(20rem,calc(100%-2rem))] pointer-events-none"
					aria-live="polite"
				>
					<div className="pointer-events-auto rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur-sm px-4 py-3.5 ring-1 ring-black/5">
						{downloadStatus.phase === 'loading' && (
							<div className="flex items-start gap-3">
								<FontAwesomeIcon
									icon={faSpinner}
									spin
									className="w-5 h-5 text-brand-pink mt-0.5 shrink-0"
								/>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-semibold text-gray-900">
										Preparing {downloadLabel}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										This can take a few seconds…
									</p>
									<div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
										<div className="h-full w-[40%] rounded-full bg-gradient-to-r from-brand-pink/70 via-brand-pink to-brand-pink/70 animate-download-bar" />
									</div>
								</div>
							</div>
						)}
						{downloadStatus.phase === 'success' && (
							<div className="flex items-start gap-3">
								<FontAwesomeIcon
									icon={faCircleCheck}
									className="w-6 h-6 text-green-600 shrink-0 animate-download-success-pop"
								/>
								<div>
									<p className="text-sm font-semibold text-gray-900">Download started</p>
									<p className="text-xs text-gray-500 mt-0.5">
										Check your browser’s downloads folder.
									</p>
								</div>
							</div>
						)}
						{downloadStatus.phase === 'error' && (
							<div className="flex items-start gap-3">
								<FontAwesomeIcon
									icon={faExclamationTriangle}
									className="w-5 h-5 text-amber-600 mt-0.5 shrink-0"
								/>
								<div>
									<p className="text-sm font-semibold text-gray-900">Something went wrong</p>
									<p className="text-xs text-gray-500 mt-0.5">Please try again in a moment.</p>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Preview Container - A4 Ratio with Transform Scale */}
			<div 
				className={`flex-1 rounded-lg border-2 border-gray-300 bg-white min-h-0 preview-scrollbar ${hasValidationErrors ? 'blur-sm' : ''}`}
				style={{
					// Scroll container - constrained by flex-1, will overflow when content is larger
					// A4: 8.5" × 11" = 816px × 1056px at 96 DPI
					// Use scroll (not auto) to always show scrollbar for better UX
					overflowY: 'scroll', // Always show vertical scrollbar
					overflowX: 'auto', // Only show horizontal when needed
					position: 'relative', // Ensure proper stacking context
					zIndex: 1, // Ensure scrollbar is above content
					padding: '8px', // Reduced padding for less space around preview
					// Ensure width doesn't exceed parent
					width: '100%',
					maxWidth: '100%',
				}}
				>
				{/* Inner wrapper height = preview content; overlay inset-0 covers full scrollable area (not just the viewport). */}
				<div
					className="relative"
					style={{
						display: 'block',
						width: 'max-content',
						margin: '0 auto',
						minHeight: '100%',
						paddingTop: '4px',
					}}
				>
					{showPreviewRefreshOverlay && (
						<div
							className="absolute inset-0 z-10 rounded-md bg-white/55 backdrop-blur-[2px] pointer-events-none"
							aria-live="polite"
							aria-busy="true"
						>
							<div className="sticky top-[38vh] z-20 flex justify-center px-4 pb-8 pointer-events-none">
								<div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-gray-200/90 bg-white/95 px-5 py-4 shadow-xl ring-1 ring-black/5 backdrop-blur-md pointer-events-auto">
									<FontAwesomeIcon
										icon={faSpinner}
										spin
										className="h-6 w-6 shrink-0 text-brand-pink"
										aria-hidden
									/>
									<div className="min-w-0">
										<p className="text-sm font-semibold text-gray-900">
											{exactPdfRefreshing
												? 'Updating exact preview'
												: 'Updating draft preview'}
										</p>
										<p className="mt-0.5 text-xs text-gray-500">
											{exactPdfRefreshing
												? 'Aligned with PDF export in a moment…'
												: 'Applying your latest edits…'}
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
					{!previewHtml && isGeneratingPreview ? (
						<div className="flex flex-col items-center justify-center min-h-[200px] w-[min(850px,100vw)]">
							<p className="text-gray-500 mb-4 text-lg font-medium">Generating preview</p>
							<div className="flex items-center gap-2">
								<span className="jumping-dot" style={{ animationDelay: '0s' }}>.</span>
								<span className="jumping-dot" style={{ animationDelay: '0.2s' }}>.</span>
								<span className="jumping-dot" style={{ animationDelay: '0.4s' }}>.</span>
							</div>
						</div>
					) : previewHtml ? (
						showExact ? (
							<div
								className="bg-transparent overflow-visible"
								style={{
									width: Math.max(scaledW, 400),
									minHeight: scaledH,
								}}
							>
								<ExactPdfPages pdfUrl={exactPdfUrl} zoomPercent={previewZoom} />
							</div>
						) : (
							<div
								className="bg-white shadow-xl rounded-lg overflow-hidden"
								style={{
									width: scaledW,
									height: scaledH,
									position: 'relative',
								}}
							>
								<div
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: PAPER_W,
										height: previewContentHeight,
										transform: `scale(${scale})`,
										transformOrigin: 'top left',
										willChange: 'transform',
									}}
								>
									<iframe
										ref={iframeRef}
										srcDoc={previewHtml}
										onLoad={handlePreviewIframeLoad}
										className="w-full h-full border-0"
										title="Resume draft preview"
										style={{
											width: '100%',
											height: `${previewContentHeight}px`,
											display: 'block',
										}}
									/>
								</div>
							</div>
						)
					) : (
						<div className="flex items-center justify-center min-h-[200px] w-full max-w-[850px] text-gray-500">
							Resume preview will render here.
						</div>
					)}
				</div>
			</div>

			{/* Validation Error Overlay */}
			{hasValidationErrors && (
				<div className="absolute inset-0 flex items-center justify-center z-20 bg-white/60 backdrop-blur-md">
					<div className="bg-white rounded-lg shadow-2xl border-2 border-brand-pink-light p-6 max-w-md mx-4">
						<div className="text-center mb-4">
							<h2 className="text-xl font-semibold text-gray-900 mb-2">
								Almost there! 🎯
							</h2>
							<p className="text-sm text-gray-600 mb-4">
								Please fill in the following required fields to see your resume preview:
							</p>
						</div>
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{validationErrors.map((error, index) => (
								<div key={index} className="flex items-start gap-2 text-sm text-gray-700">
									<span className="text-brand-pink mt-0.5">•</span>
									<span>{error}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default RightPanel
