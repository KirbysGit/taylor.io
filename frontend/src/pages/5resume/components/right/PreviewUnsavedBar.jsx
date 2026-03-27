// Compact “unsaved changes” strip for the preview toolbar (replaces floating SaveBanner).

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function PreviewUnsavedBar({
	show,
	changedSections = [],
	isSaving = false,
	onDiscard,
	onSave,
}) {
	if (!show || changedSections.length === 0) return null

	const summary = changedSections.join(', ')

	return (
		<div
			className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/90 px-2.5 py-1.5 shadow-sm ring-1 ring-amber-200/60"
			title="Save to sync your profile with the server before downloading."
		>
			<FontAwesomeIcon
				icon={faExclamationTriangle}
				className="h-3.5 w-3.5 shrink-0 text-amber-700"
				aria-hidden
			/>
			<p
				className="min-w-0 flex-1 truncate text-xs leading-snug text-amber-950"
				title={`Updates to: ${summary}`}
			>
				<span className="font-semibold text-amber-900">Unsaved</span>
				<span className="font-normal text-amber-800"> · Updates to: </span>
				<span className="font-semibold text-amber-950">{summary}</span>
			</p>
			<div className="flex shrink-0 items-center gap-1 border-l border-amber-300/70 pl-2">
				<button
					type="button"
					onClick={onDiscard}
					disabled={isSaving}
					className="rounded-md px-2 py-1 text-xs font-medium text-amber-900/90 hover:bg-amber-200/50 disabled:opacity-45"
				>
					Discard
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={isSaving}
					className="inline-flex items-center gap-1 rounded-md bg-brand-pink px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
				>
					{isSaving && <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />}
					{isSaving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</div>
	)
}
