// components / right / RightPanel.jsx

// Right panel containing the resume preview and controls.

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh, faDownload } from '@fortawesome/free-solid-svg-icons'

function RightPanel({
	previewHtml,
	isGeneratingPreview,
	previewZoom,
	onZoomIn,
	onZoomOut,
	isDownloadingPDF,
	onDownloadPDF,
	onRefreshPreview,
	validationErrors = [],
}) {
	const hasValidationErrors = validationErrors.length > 0

	return (
		<section className="flex-1 bg-white overflow-hidden p-4 flex flex-col relative min-h-0">
			{/* Control buttons */}
			<div className={`flex items-center justify-between flex-shrink-0 mb-4 ${hasValidationErrors ? 'blur-sm' : ''}`}>
				{/* Spacer for centering */}
				<div className="flex-1"></div>
				
				{/* Zoom Controls - Centered */}
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onZoomOut}
						disabled={previewZoom <= 25}
						className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Zoom Out"
					>
						−
					</button>
					<span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
						{previewZoom}%
					</span>
					<button
						type="button"
						onClick={onZoomIn}
						disabled={previewZoom >= 200}
						className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						title="Zoom In"
					>
						+
					</button>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2 flex-1 justify-end">
					<button
						type="button"
						className="px-3 py-1.5 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
						onClick={onDownloadPDF}
						disabled={isDownloadingPDF}
					>
						<FontAwesomeIcon icon={faDownload} />
						<span className="text-sm">Download</span>
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
				{/* Content wrapper - centers the scaled paper */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'flex-start',
						minHeight: '100%', // Ensure wrapper takes full height
						paddingTop: '4px',
					}}
				>
					{isGeneratingPreview ? (
						<div className="flex flex-col items-center justify-center h-full">
							<p className="text-gray-500 mb-4 text-lg font-medium">Generating preview</p>
							<div className="flex items-center gap-2">
								<span className="jumping-dot" style={{ animationDelay: '0s' }}>.</span>
								<span className="jumping-dot" style={{ animationDelay: '0.2s' }}>.</span>
								<span className="jumping-dot" style={{ animationDelay: '0.4s' }}>.</span>
							</div>
						</div>
					) : previewHtml ? (
						<div 
							className="bg-white shadow-xl rounded-lg overflow-hidden"
							style={{
								// Fixed A4 size (8.5" × 11" = 816px × 1056px at 96 DPI)
								width: '850px',
								height: '1100px',
								// Apply zoom via CSS transform
								transform: `scale(${previewZoom / 100})`,
								transformOrigin: 'top center',
								// Prevent layout shift during transform
								willChange: 'transform',
								// Ensure iframe doesn't cover scrollbar
								position: 'relative',
								zIndex: 0,
							}}
						>
							<iframe 
								srcDoc={previewHtml}
								className="w-full h-full border-0"
								title="Resume Preview"
								style={{
									width: '100%',
									height: '100%',
									display: 'block', // Remove any default iframe spacing
								}}
							/>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-gray-500">
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
