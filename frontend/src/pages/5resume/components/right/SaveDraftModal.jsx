import { useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faBookmark,
	faCheck,
	faCircleInfo,
	faSpinner,
	faTag,
	faXmark,
} from '@fortawesome/free-solid-svg-icons'

const STATUS_OPTIONS = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'ready', label: 'Ready' },
	{ value: 'submitted', label: 'Submitted' },
]

function cleanTag(value) {
	return String(value || '').trim().replace(/^#/, '').slice(0, 28)
}

export default function SaveDraftModal({
	open,
	defaultName = '',
	defaultTags = [],
	changedSections = [],
	isSaving = false,
	savedResumes = { items: [], max: 3 },
	onClose,
	onSave,
}) {
	const [name, setName] = useState(defaultName)
	const [status, setStatus] = useState('draft')
	const [tagInput, setTagInput] = useState('')
	const [tags, setTags] = useState([])

	useEffect(() => {
		if (!open) return
		setName(defaultName)
		setStatus('draft')
		setTagInput('')
		setTags([...new Set(defaultTags.map(cleanTag).filter(Boolean))].slice(0, 5))
	}, [defaultName, defaultTags, open])

	const hasSlots = savedResumes.items.length < savedResumes.max
	const visibleChanges = useMemo(() => changedSections.slice(0, 4), [changedSections])
	const remainingChanges = Math.max(0, changedSections.length - visibleChanges.length)

	if (!open) return null

	const addTag = (rawTag = tagInput) => {
		const next = cleanTag(rawTag)
		if (!next || tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) return
		setTags((prev) => [...prev, next].slice(0, 5))
		setTagInput('')
	}

	const handleTagKeyDown = (event) => {
		if (event.key !== 'Enter' && event.key !== ',') return
		event.preventDefault()
		addTag()
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		if (!name.trim() || !hasSlots || isSaving) return
		await onSave({
			name: name.trim(),
			status,
			tags,
		})
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 px-4 py-6 backdrop-blur-sm">
			<div
				className="w-[min(34rem,100%)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5"
				role="dialog"
				aria-modal="true"
				aria-labelledby="save-draft-title"
			>
				<div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
					<div className="flex min-w-0 gap-3">
						<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
							<FontAwesomeIcon icon={faBookmark} className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<h2 id="save-draft-title" className="text-base font-black text-gray-950">
								Save this draft
							</h2>
							<p className="mt-0.5 text-sm text-gray-500">
								Keep this version separate from your main profile.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
						aria-label="Close save draft modal"
					>
						<FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
					<div>
						<label htmlFor="save-draft-name" className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">
							Draft name
						</label>
						<input
							id="save-draft-name"
							type="text"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="e.g. Python Developer - ESB"
							className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10"
							autoFocus
						/>
					</div>

					<div>
						<p className="mb-1.5 text-xs font-black uppercase tracking-[0.08em] text-gray-500">Status</p>
						<div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-1">
							{STATUS_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => setStatus(option.value)}
									className={`rounded-lg px-2 py-2 text-sm font-bold transition ${
										status === option.value
											? 'bg-white text-brand-pink shadow-sm ring-1 ring-brand-pink/20'
											: 'text-gray-500 hover:text-gray-800'
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>

					<div>
						<label htmlFor="save-draft-tags" className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">
							Tags
						</label>
						<div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-2 focus-within:border-brand-pink focus-within:ring-4 focus-within:ring-brand-pink/10">
							{tags.map((tag) => (
								<span
									key={tag}
									className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700"
								>
									<FontAwesomeIcon icon={faTag} className="h-3 w-3 text-gray-400" />
									{tag}
									<button
										type="button"
										onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
										className="ml-0.5 text-gray-400 hover:text-gray-700"
										aria-label={`Remove ${tag} tag`}
									>
										<FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
									</button>
								</span>
							))}
							<input
								id="save-draft-tags"
								value={tagInput}
								onChange={(event) => setTagInput(event.target.value)}
								onKeyDown={handleTagKeyDown}
								onBlur={() => addTag()}
								placeholder={tags.length ? '' : 'Role, company, round...'}
								className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
							/>
						</div>
					</div>

					<div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
						<div className="flex items-center gap-2 text-sm font-black text-gray-900">
							<FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-brand-pink" />
							What this saves
						</div>
						{visibleChanges.length > 0 ? (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{visibleChanges.map((section) => (
									<span key={section} className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700">
										{section}
									</span>
								))}
								{remainingChanges > 0 && (
									<span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-500">
										+{remainingChanges} more
									</span>
								)}
							</div>
						) : (
							<p className="mt-1.5 text-sm text-gray-600">A snapshot of the current resume, template, and styling.</p>
						)}
						<p className="mt-2 text-xs leading-relaxed text-gray-500">
							This does not update your root profile yet. You can review profile updates separately later.
						</p>
					</div>

					{!hasSlots && (
						<p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
							You have used all {savedResumes.max} draft slots. Delete a version before saving another one.
						</p>
					)}

					<div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!name.trim() || !hasSlots || isSaving}
							className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSaving ? (
								<FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
							) : (
								<FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
							)}
							{isSaving ? 'Saving...' : 'Save draft'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
