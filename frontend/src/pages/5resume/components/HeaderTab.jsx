import React from 'react'
import HeaderFieldsPanel from './HeaderFieldsPanel'

function HeaderTab({
	headerFields,
	headerVisibility,
	headerOrder,
	onHeaderFieldChange,
	onToggleHeaderVisibility,
	onReorderHeader,
	onSaveHeader,
	isSavingHeader,
	showHeaderOverflow,
}) {
	return (
		<div className="space-y-6">
			<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-gray-900">Header</h3>
					<span className="text-xs text-gray-500">Contact & ordering</span>
				</div>
				<HeaderFieldsPanel
					headerFields={headerFields}
					headerVisibility={headerVisibility}
					headerOrder={headerOrder}
					onFieldChange={onHeaderFieldChange}
					onToggleVisibility={onToggleHeaderVisibility}
					onReorder={onReorderHeader}
				/>
				{showHeaderOverflow && (
					<div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
						Looks like the contact line may overflow. Consider shortening or hiding some items.
					</div>
				)}
				<div className="mt-4 flex justify-end">
					<button
						type="button"
						onClick={onSaveHeader}
						disabled={isSavingHeader}
						className="px-4 py-2 bg-brand-pink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSavingHeader ? 'Saving...' : 'Save header'}
					</button>
				</div>
			</div>
		</div>
	)
}

export default HeaderTab


