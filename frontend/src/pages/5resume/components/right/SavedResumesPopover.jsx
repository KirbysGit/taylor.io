function SavedResumeMeta({ resume }) {
	const metadata = resume?.resume_data?.saveMetadata || {}
	const tags = Array.isArray(metadata.tags) ? metadata.tags.filter(Boolean).slice(0, 2) : []
	const status = metadata.status ? String(metadata.status).replace(/_/g, ' ') : ''

	if (!status && tags.length === 0) return null

	return (
		<div className="mt-1 flex min-w-0 flex-wrap gap-1">
			{status && (
				<span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.65rem] font-bold capitalize text-gray-500">
					{status}
				</span>
			)}
			{tags.map((tag) => (
				<span key={tag} className="rounded-full bg-brand-pink/10 px-1.5 py-0.5 text-[0.65rem] font-bold text-brand-pink">
					{tag}
				</span>
			))}
		</div>
	)
}

function SavedResumesPopover({
	savedResumes,
	savedResumesOpen,
	onToggleSavedResumes,
	onCloseSavedResumes,
	isSavingResumeForLater,
	onOpenSaveDraftModal,
	onLoadSaved,
	onDeleteSaved,
}) {
	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggleSavedResumes}
				className="h-10 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
				aria-expanded={savedResumesOpen}
				aria-haspopup="dialog"
			>
				Versions ({savedResumes.items.length}/{savedResumes.max})
			</button>

			{savedResumesOpen && (
				<>
					<div className="fixed inset-0 z-20" onClick={onCloseSavedResumes} aria-hidden="true" />
					<div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl ring-1 ring-black/5">
						<div className="border-b border-gray-100 px-4 py-3">
							<p className="text-sm font-semibold text-gray-900">Saved résumé versions</p>
							<p className="mt-0.5 text-xs text-gray-500">
								{savedResumes.items.length} of {savedResumes.max} slots used
							</p>
						</div>

						<div className="border-b border-gray-100 px-4 py-3">
							<button
								type="button"
								onClick={onOpenSaveDraftModal}
								disabled={isSavingResumeForLater || savedResumes.items.length >= savedResumes.max}
								className="w-full rounded-lg bg-brand-pink px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isSavingResumeForLater ? 'Saving...' : 'Save current draft'}
							</button>
							{savedResumes.items.length >= savedResumes.max && (
								<p className="mt-1.5 text-xs text-gray-500">Limit reached. Delete one to save more.</p>
							)}
							{savedResumes.items.length < savedResumes.max && (
								<p className="mt-1.5 text-xs text-gray-500">Name it, tag it, and keep your profile unchanged.</p>
							)}
						</div>

						{savedResumes.items.length > 0 ? (
							<ul className="max-h-64 overflow-y-auto py-1">
								{savedResumes.items.map((s) => (
									<li
										key={s.id}
										className="group flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gray-50"
									>
										<button
											type="button"
											onClick={() => onLoadSaved(s.id)}
											className="min-w-0 flex-1 text-left"
										>
											<p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
											<SavedResumeMeta resume={s} />
										</button>
										<button
											type="button"
											onClick={(e) => onDeleteSaved(s.id, s.name, e)}
											className="rounded px-2 py-1 text-xs font-medium text-red-500 opacity-0 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
										>
											Delete
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className="px-4 py-5 text-center text-sm text-gray-500">No saved versions yet</p>
						)}
					</div>
				</>
			)}
		</div>
	)
}

export default SavedResumesPopover
