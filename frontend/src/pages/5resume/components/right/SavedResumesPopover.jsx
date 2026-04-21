function SavedResumesPopover({
	savedResumes,
	savedResumesOpen,
	onToggleSavedResumes,
	onCloseSavedResumes,
	saveResumeName,
	onSaveResumeNameChange,
	isSavingResumeForLater,
	onSaveForLater,
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
				Saved ({savedResumes.items.length}/{savedResumes.max})
			</button>

			{savedResumesOpen && (
				<>
					<div className="fixed inset-0 z-20" onClick={onCloseSavedResumes} aria-hidden="true" />
					<div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl ring-1 ring-black/5">
						<div className="border-b border-gray-100 px-4 py-3">
							<p className="text-sm font-semibold text-gray-900">Saved resumes</p>
							<p className="mt-0.5 text-xs text-gray-500">
								{savedResumes.items.length} of {savedResumes.max} slots used
							</p>
						</div>

						<div className="border-b border-gray-100 px-4 py-3">
							<label htmlFor="save-resume-name" className="mb-1 block text-xs font-medium text-gray-600">
								Save current draft
							</label>
							<input
								id="save-resume-name"
								type="text"
								value={saveResumeName}
								onChange={(e) => onSaveResumeNameChange(e.target.value)}
								placeholder="e.g. Product Manager - Stripe"
								className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/20"
							/>
							<button
								type="button"
								onClick={onSaveForLater}
								disabled={isSavingResumeForLater || savedResumes.items.length >= savedResumes.max}
								className="mt-2.5 w-full rounded-lg bg-brand-pink px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isSavingResumeForLater ? 'Saving...' : 'Save for later'}
							</button>
							{savedResumes.items.length >= savedResumes.max && (
								<p className="mt-1.5 text-xs text-gray-500">Limit reached. Delete one to save more.</p>
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
							<p className="px-4 py-5 text-center text-sm text-gray-500">No saved resumes yet</p>
						)}
					</div>
				</>
			)}
		</div>
	)
}

export default SavedResumesPopover
