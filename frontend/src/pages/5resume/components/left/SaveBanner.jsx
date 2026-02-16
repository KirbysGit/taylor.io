// components / left / SaveBanner.jsx

// Banner that appears when there are unsaved changes to the resume.
// Positioned fixed in the top right corner of the screen.

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'

function SaveBanner({ 
	showSaveBanner, 
	changeDescriptions, 
	isSaving, 
	onDiscard, 
	onSave 
}) {
	if (!showSaveBanner) return null

	return (
		<div className="fixed top-16 right-4 z-50 max-w-xs animate-slide-in-right">
			<div className="bg-white border-2 border-yellow-400 rounded-lg shadow-xl overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-3 py-2 flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<FontAwesomeIcon 
							icon={faExclamationTriangle} 
							className="text-yellow-800 text-sm"
						/>
						<span className="text-yellow-900 font-semibold text-xs">
							Unsaved Changes
						</span>
					</div>
				</div>

				{/* Content */}
				<div className="px-3 py-2 bg-yellow-50">
					<p className="text-xs text-yellow-900 mb-2 font-medium leading-tight">
						Save before downloading your resume.
					</p>
					
					{changeDescriptions.length > 0 && (
						<div className="mb-2 p-1.5 bg-white rounded border border-yellow-200 max-h-24 overflow-y-auto">
							<div className="text-xs text-yellow-800 space-y-0.5">
								{changeDescriptions.map((desc, idx) => (
									<div key={idx} className="flex items-start gap-1.5">
										<span className="text-yellow-600 mt-0.5 text-xs">•</span>
										<span className="text-xs leading-tight">{desc}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onDiscard}
							disabled={isSaving}
							className="flex-1 px-2 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							Discard
						</button>
						<button
							type="button"
							onClick={onSave}
							disabled={isSaving}
							className="flex-1 px-2 py-1.5 text-xs bg-brand-pink text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-1.5"
						>
							{isSaving && (
								<FontAwesomeIcon 
									icon={faSpinner} 
									className="animate-spin text-xs"
								/>
							)}
							{isSaving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default SaveBanner
