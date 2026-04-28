// components / right / RightPanel.jsx

// Right panel containing the resume preview and controls.

import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faRotate,
	faFilePdf,
	faFileWord,
	faSpinner,
	faCircleCheck,
	faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'

const iconSm = 'h-4 w-4 shrink-0'
import ExactPdfPages from './ExactPdfPages'
import PreviewUnsavedBar from './PreviewUnsavedBar'
import ResumeValidationNotice from '../ResumeValidationNotice'
import SavedResumesPopover from './SavedResumesPopover'

/** Preview iframe scale: 50%–150%, step 25% (no % label in UI) */
const PREVIEW_ZOOM = { min: 50, max: 150, step: 25, default: 100 }

function RightPanel({
	previewHtml,
	isGeneratingPreview,
	downloadStatus = null,
	onDownloadDocument,
	onRefreshPreview,
	validationIssues = [],
	exactPdfUrl = null,
	exactPdfRefreshing = false,
	showSaveBanner = false,
	saveChangedSections = [],
	isSavingResume = false,
	onDiscardChanges = () => {},
	onSaveChanges = () => {},
	savedResumes,
	savedResumesOpen,
	onToggleSavedResumes,
	onCloseSavedResumes,
	saveResumeName,
	onSaveResumeNameChange,
	isSavingResumeForLater = false,
	onSaveForLater,
	onLoadSaved,
	onDeleteSaved,
	canCompareTailoredResume = false,
	resumePreviewCompareMode = 'tailored',
	onResumePreviewCompareModeChange = () => {},
	showExactPdfInCanvas = true,
	isTailorHtmlCompare = false,
}) {
	const [previewZoom, setPreviewZoom] = useState(PREVIEW_ZOOM.default)

	const hasValidationIssues = validationIssues.length > 0
	const isDownloadBusy = downloadStatus?.phase === 'loading'
	const downloadLabel =
		downloadStatus?.type === 'word' ? 'Word document' : 'PDF'
	const isDefaultZoom = previewZoom === PREVIEW_ZOOM.default
	const showExact = Boolean(exactPdfUrl) && showExactPdfInCanvas
	const showPreviewRefreshOverlay =
		!hasValidationIssues &&
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

	const handleZoomIn = () => {
		setPreviewZoom((prev) => Math.min(prev + PREVIEW_ZOOM.step, PREVIEW_ZOOM.max))
	}

	const handleZoomOut = () => {
		setPreviewZoom((prev) => Math.max(prev - PREVIEW_ZOOM.step, PREVIEW_ZOOM.min))
	}

	const handleZoomReset = () => setPreviewZoom(PREVIEW_ZOOM.default)

	return (
		<section className="flex-1 bg-white overflow-hidden p-4 flex flex-col relative min-h-0">
			{/* Row 1: unsaved (~half width max) · export only */}
			<div
				className={`mb-2 flex flex-shrink-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 ${hasValidationIssues ? 'blur-sm' : ''}`}
			>
				<div className="min-w-0 max-w-[50%] shrink">
					<PreviewUnsavedBar
						show={showSaveBanner}
						changedSections={saveChangedSections}
						isSaving={isSavingResume}
						onDiscard={onDiscardChanges}
						onSave={onSaveChanges}
					/>
				</div>
				<div
					className="ml-auto flex shrink-0 items-center"
					role="toolbar"
					aria-label="Download and refresh preview"
				>
					<div className="inline-flex h-10 overflow-hidden rounded-xl border border-gray-200/95 bg-gradient-to-b from-white to-gray-50/95 shadow-sm ring-1 ring-gray-900/[0.04]">
						<button
							type="button"
							onClick={() => onDownloadDocument('pdf')}
							disabled={isDownloadBusy}
							className="inline-flex items-center gap-2 px-3.5 text-sm font-semibold text-brand-pink transition-colors duration-150 hover:bg-brand-pink/[0.08] active:bg-brand-pink/15 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-pink/40"
							aria-label="Download PDF"
						>
							<FontAwesomeIcon icon={faFilePdf} className={iconSm} />
							<span className="pr-0.5">PDF</span>
						</button>
						<span className="w-px shrink-0 self-stretch bg-gray-200" aria-hidden="true" />
						<button
							type="button"
							onClick={() => onDownloadDocument('word')}
							disabled={isDownloadBusy}
							className="inline-flex items-center gap-2 px-3.5 text-sm font-semibold text-sky-900 transition-colors duration-150 hover:bg-sky-50 active:bg-sky-100/80 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400/50"
							aria-label="Download Word document"
						>
							<FontAwesomeIcon icon={faFileWord} className={iconSm} />
							<span className="pr-0.5">Word</span>
						</button>
						<span className="w-px shrink-0 self-stretch bg-gray-200" aria-hidden="true" />
						<button
							type="button"
							onClick={onRefreshPreview}
							className="inline-flex items-center gap-2 px-3 text-sm font-medium text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200/70 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gray-400/60"
							aria-label="Refresh preview"
							title="Refresh preview"
						>
							<FontAwesomeIcon
								icon={faRotate}
								className={`${iconSm} transition-transform duration-500 ease-out motion-safe:hover:rotate-90 motion-reduce:hover:rotate-0`}
							/>
							<span className="hidden pr-0.5 sm:inline">Refresh</span>
						</button>
					</div>
				</div>
			</div>

			{/* Row 2: draft/exact label (left) · zoom centered in full width */}
			<div
				className={`mb-3 grid flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-1 ${hasValidationIssues ? 'blur-sm' : ''}`}
				aria-live="polite"
			>
				<div className="min-w-0 justify-self-start">
					{isTailorHtmlCompare ? (
						<p className="text-xs text-gray-600">
							<span className="font-medium text-gray-800">Quick preview</span>
							<span> — fast to compare. Use Tailor Assist when you are ready for the print layout.</span>
						</p>
					) : showExact ? (
						<p className="text-xs font-medium text-gray-700">
							<span className="text-green-700">Print layout</span>
							<span className="font-normal text-gray-500"> — matches PDF export.</span>
						</p>
					) : (
						<p className="text-xs text-gray-600">
							<span className="font-medium text-gray-800">Draft preview</span>
							<span> — fast while you edit. Print layout loads after you pause.</span>
						</p>
					)}
				</div>
				<div
					className="flex items-center gap-2 justify-self-center"
					role="group"
					aria-label="Preview zoom"
				>
					<button
						type="button"
						onClick={handleZoomOut}
						disabled={previewZoom <= PREVIEW_ZOOM.min}
						className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white font-semibold text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
								onClick={handleZoomReset}
								className="text-xs font-medium text-brand-pink hover:underline"
								title="Reset to default size"
							>
								Reset
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={handleZoomIn}
						disabled={previewZoom >= PREVIEW_ZOOM.max}
						className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white font-semibold text-gray-700 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
						title="Zoom in"
						aria-label="Zoom preview in"
					>
						+
					</button>
				</div>
				<div className="min-w-0 justify-self-end">
					<div className="flex flex-wrap items-center justify-end gap-2">
						{canCompareTailoredResume ? (
							<div
								className="inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm"
								role="group"
								aria-label="Preview original resume or tailored draft"
							>
								<button
									type="button"
									onClick={() => onResumePreviewCompareModeChange('original')}
									className={`px-2.5 text-xs font-semibold transition-colors ${
										resumePreviewCompareMode === 'original'
											? 'bg-gray-200 text-gray-900'
											: 'text-gray-600 hover:bg-gray-50'
									}`}
									title="Show resume as it was before tailoring"
								>
									Original
								</button>
								<span className="w-px shrink-0 self-stretch bg-gray-200" aria-hidden="true" />
								<button
									type="button"
									onClick={() => onResumePreviewCompareModeChange('tailored')}
									className={`px-2.5 text-xs font-semibold transition-colors ${
										resumePreviewCompareMode === 'tailored'
											? 'bg-brand-pink/15 text-brand-pink'
											: 'text-gray-600 hover:bg-gray-50'
									}`}
									title="Show tailored draft (current editor content)"
								>
									Tailored
								</button>
							</div>
						) : null}
						<SavedResumesPopover
							savedResumes={savedResumes}
							savedResumesOpen={savedResumesOpen}
							onToggleSavedResumes={onToggleSavedResumes}
							onCloseSavedResumes={onCloseSavedResumes}
							saveResumeName={saveResumeName}
							onSaveResumeNameChange={onSaveResumeNameChange}
							isSavingResumeForLater={isSavingResumeForLater}
							onSaveForLater={onSaveForLater}
							onLoadSaved={onLoadSaved}
							onDeleteSaved={onDeleteSaved}
						/>
					</div>
				</div>
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
				className={`flex-1 rounded-lg border-2 border-gray-300 bg-white min-h-0 preview-scrollbar ${hasValidationIssues ? 'blur-sm' : ''}`}
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
												? 'Updating print layout'
												: 'Updating quick preview'}
										</p>
										<p className="mt-0.5 text-xs text-gray-500">
											{exactPdfRefreshing
												? 'Aligning with PDF export…'
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

			{/* Validation overlay — friendly copy via ResumeValidationNotice */}
			{hasValidationIssues && (
				<div className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 backdrop-blur-md px-4">
					<div
						className="w-full max-w-lg rounded-2xl border border-gray-200/90 bg-white p-6 shadow-2xl ring-1 ring-gray-900/[0.06]"
						role="alertdialog"
						aria-labelledby="resume-validation-title"
						aria-describedby="resume-validation-desc"
					>
						<div id="resume-validation-desc">
							<ResumeValidationNotice issues={validationIssues} />
						</div>
					</div>
				</div>
			)}
		</section>
	)
}

export default RightPanel
