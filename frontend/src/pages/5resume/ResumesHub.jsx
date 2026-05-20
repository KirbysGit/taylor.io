import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faBookmark,
	faCheck,
	faClockRotateLeft,
	faEllipsisVertical,
	faFileAlt,
	faFilter,
	faMagnifyingGlass,
	faPenToSquare,
	faPlus,
	faTag,
	faTrash,
	faWandMagicSparkles,
	faXmark,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { deleteSavedResume, listSavedResumes, updateSavedResume } from '@/api/services/profile'

const STATUS_META = {
	draft: { label: 'Draft', className: 'bg-violet-100 text-violet-800 ring-violet-200' },
	ready: { label: 'Ready', className: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
	submitted: { label: 'Submitted', className: 'bg-sky-100 text-sky-800 ring-sky-200' },
	needs_review: { label: 'Needs review', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
	saved: { label: 'Saved', className: 'bg-gray-100 text-gray-700 ring-gray-200' },
}

const TABS = [
	{ id: 'all', label: 'All resumes' },
	{ id: 'tailored', label: 'Tailored' },
	{ id: 'draft', label: 'Drafts' },
	{ id: 'ready', label: 'Ready' },
]

function normalizeStatus(status) {
	const clean = String(status || '').trim().toLowerCase().replace(/\s+/g, '_')
	return clean || 'draft'
}

function draftMeta(resume) {
	const metadata = resume?.resume_data?.saveMetadata || {}
	const tailorIntent = resume?.resume_data?.tailorIntent || {}
	const status = normalizeStatus(metadata.status)
	const tags = Array.isArray(metadata.tags) ? metadata.tags.filter(Boolean) : []
	return {
		status,
		tags,
		role: metadata.targetRole || tailorIntent.jobTitle || '',
		company: metadata.targetCompany || tailorIntent.company || '',
		changedSections: Array.isArray(metadata.changedSections) ? metadata.changedSections : [],
	}
}

function statusTone(status) {
	return STATUS_META[status] || STATUS_META.saved
}

function cleanTag(value) {
	return String(value || '').trim().replace(/^#/, '').slice(0, 28)
}

function formatDate(dateStr) {
	if (!dateStr) return 'Recently'
	try {
		return new Date(dateStr).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	} catch {
		return 'Recently'
	}
}

function MiniResumePreview({ resume, index }) {
	const meta = draftMeta(resume)
	const tones = ['bg-brand-pink', 'bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500']
	const tone = tones[index % tones.length]
	const isSidebar = String(resume.template || '').includes('sidebar')

	return (
		<div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-inner">
			<div className="flex h-full gap-1.5 rounded-lg bg-gray-50 p-1">
				{isSidebar ? (
					<div className={`${tone} h-full w-3 rounded-md opacity-85`} />
				) : (
					<div className="absolute left-3 top-3 h-1.5 w-8 rounded-full bg-gray-300" />
				)}
				<div className="min-w-0 flex-1 pt-3">
					<span className={`block h-1.5 w-9 rounded-full ${tone}`} />
					<span className="mt-2 block h-1 w-11 rounded-full bg-gray-300" />
					<span className="mt-1 block h-1 w-8 rounded-full bg-gray-300/80" />
					<div className="mt-3 space-y-1">
						<span className="block h-1 w-full rounded-full bg-gray-300/75" />
						<span className="block h-1 w-[82%] rounded-full bg-gray-300/60" />
						<span className="block h-1 w-[65%] rounded-full bg-gray-300/50" />
					</div>
					{meta.status === 'ready' ? (
						<span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
							<FontAwesomeIcon icon={faCheck} className="size-2.5" />
						</span>
					) : null}
				</div>
			</div>
		</div>
	)
}

function StatCard({ icon, label, value, hint, className = '' }) {
	return (
		<div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-white">
			<div className="flex items-center gap-4">
				<span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${className}`}>
					<FontAwesomeIcon icon={icon} className="size-5" />
				</span>
				<div>
					<p className="text-3xl font-black tracking-tight text-gray-950">{value}</p>
					<p className="mt-0.5 text-sm font-bold text-gray-800">{label}</p>
					<p className="mt-1 text-xs text-gray-500">{hint}</p>
				</div>
			</div>
		</div>
	)
}

function ResumeRow({ resume, index, menuOpen, onToggleMenu, onOpen, onEdit, onDelete }) {
	const meta = draftMeta(resume)
	const tone = statusTone(meta.status)
	const tags = meta.tags.slice(0, 4)
	const subtitle = [meta.company, meta.role].filter(Boolean).join(' · ') || resume.template || 'Saved draft'

	return (
		<article className="group relative flex gap-4 border-b border-gray-100 bg-white px-4 py-4 transition hover:bg-gray-50/80 last:border-b-0">
			<button type="button" onClick={() => onOpen(resume.id)} className="text-left">
				<MiniResumePreview resume={resume} index={index} />
			</button>
			<div className="min-w-0 flex-1 self-center">
				<div className="flex flex-wrap items-center gap-2">
					<button type="button" onClick={() => onOpen(resume.id)} className="min-w-0 text-left">
						<h2 className="truncate text-base font-black text-gray-950 hover:text-brand-pink-dark">
							{resume.name || `Resume ${index + 1}`}
						</h2>
					</button>
					<span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${tone.className}`}>
						{tone.label}
					</span>
				</div>
				<p className="mt-1 truncate text-sm text-gray-600">{subtitle}</p>
				<div className="mt-2 flex flex-wrap items-center gap-1.5">
					{tags.length > 0 ? tags.map((tag) => (
						<span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
							{tag}
						</span>
					)) : (
						<span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
							Add tags
						</span>
					)}
					{meta.changedSections.slice(0, 2).map((section) => (
						<span key={section} className="rounded-full bg-brand-pink/10 px-2 py-1 text-xs font-bold text-brand-pink">
							{section}
						</span>
					))}
				</div>
			</div>
			<div className="hidden min-w-[7rem] flex-col justify-center text-right md:flex">
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">Saved</p>
				<p className="mt-1 text-sm font-semibold text-gray-600">{formatDate(resume.created_at)}</p>
			</div>
			<div className="flex shrink-0 items-center gap-2 self-center">
				<button
					type="button"
					onClick={() => onEdit(resume)}
					className="hidden size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-brand-pink/30 hover:bg-brand-pink/5 hover:text-brand-pink-dark sm:flex"
					aria-label={`Edit ${resume.name}`}
				>
					<FontAwesomeIcon icon={faPenToSquare} className="size-4" />
				</button>
				<button
					type="button"
					onClick={() => onOpen(resume.id)}
					className="hidden items-center gap-2 rounded-xl bg-brand-pink px-3.5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-pink-dark lg:inline-flex"
				>
					Open
					<FontAwesomeIcon icon={faArrowRight} className="size-3" />
				</button>
				<div className="relative">
					<button
						type="button"
						onClick={() => onToggleMenu(menuOpen ? null : resume.id)}
						className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
						aria-label={`More options for ${resume.name}`}
					>
						<FontAwesomeIcon icon={faEllipsisVertical} className="size-4" />
					</button>
					{menuOpen ? (
						<div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5">
							<button type="button" onClick={() => onOpen(resume.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50">
								<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
								Open draft
							</button>
							<button type="button" onClick={() => onEdit(resume)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50">
								<FontAwesomeIcon icon={faPenToSquare} className="size-3.5" />
								Edit details
							</button>
							<button type="button" onClick={() => onDelete(resume.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
								<FontAwesomeIcon icon={faTrash} className="size-3.5" />
								Delete
							</button>
						</div>
					) : null}
				</div>
			</div>
		</article>
	)
}

function EditDraftModal({ resume, saving, onClose, onSave }) {
	const meta = draftMeta(resume)
	const [name, setName] = useState(resume?.name || '')
	const [status, setStatus] = useState(meta.status)
	const [tags, setTags] = useState(meta.tags)
	const [tagInput, setTagInput] = useState('')

	useEffect(() => {
		if (!resume) return
		const nextMeta = draftMeta(resume)
		setName(resume.name || '')
		setStatus(nextMeta.status)
		setTags(nextMeta.tags)
		setTagInput('')
	}, [resume])

	if (!resume) return null

	const addTag = (rawTag = tagInput) => {
		const next = cleanTag(rawTag)
		if (!next || tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) return
		setTags((prev) => [...prev, next].slice(0, 8))
		setTagInput('')
	}

	const handleTagKeyDown = (event) => {
		if (event.key !== 'Enter' && event.key !== ',') return
		event.preventDefault()
		addTag()
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		await onSave(resume.id, { name, status, tags })
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 px-4 py-6 backdrop-blur-sm">
			<form
				onSubmit={handleSubmit}
				className="w-[min(34rem,100%)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5"
			>
				<div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
					<div>
						<h2 className="text-base font-black text-gray-950">Edit draft details</h2>
						<p className="mt-0.5 text-sm text-gray-500">Rename it, update status, or add quick tags.</p>
					</div>
					<button type="button" onClick={onClose} disabled={saving} className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
						<FontAwesomeIcon icon={faXmark} className="size-4" />
					</button>
				</div>
				<div className="space-y-4 px-5 py-4">
					<div>
						<label htmlFor="draft-name" className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">Name</label>
						<input
							id="draft-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10"
							autoFocus
						/>
					</div>
					<div>
						<p className="mb-1.5 text-xs font-black uppercase tracking-[0.08em] text-gray-500">Status</p>
						<div className="grid grid-cols-3 gap-2">
							{['draft', 'ready', 'submitted'].map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setStatus(option)}
									className={`rounded-xl border px-3 py-2 text-sm font-black capitalize transition ${
										status === option
											? 'border-brand-pink bg-brand-pink/10 text-brand-pink-dark'
											: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
									}`}
								>
									{option}
								</button>
							))}
						</div>
					</div>
					<div>
						<label htmlFor="draft-tags" className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">Tags</label>
						<div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-2 focus-within:border-brand-pink focus-within:ring-4 focus-within:ring-brand-pink/10">
							{tags.map((tag) => (
								<span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
									<FontAwesomeIcon icon={faTag} className="size-3 text-gray-400" />
									{tag}
									<button type="button" onClick={() => setTags((prev) => prev.filter((item) => item !== tag))} className="text-gray-400 hover:text-gray-700">
										<FontAwesomeIcon icon={faXmark} className="size-3" />
									</button>
								</span>
							))}
							<input
								id="draft-tags"
								value={tagInput}
								onChange={(event) => setTagInput(event.target.value)}
								onKeyDown={handleTagKeyDown}
								onBlur={() => addTag()}
								placeholder={tags.length ? '' : 'Python, Tailored, Remote...'}
								className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
							/>
						</div>
					</div>
				</div>
				<div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
					<button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
						Cancel
					</button>
					<button type="submit" disabled={saving || !name.trim()} className="rounded-xl bg-brand-pink px-4 py-2.5 text-sm font-black text-white hover:bg-brand-pink-dark disabled:cursor-not-allowed disabled:opacity-50">
						{saving ? 'Saving...' : 'Save details'}
					</button>
				</div>
			</form>
		</div>
	)
}

export default function ResumesHub() {
	const navigate = useNavigate()
	const [savedResumes, setSavedResumes] = useState({ items: [], max: 3 })
	const [isLoading, setIsLoading] = useState(true)
	const [query, setQuery] = useState('')
	const [activeTab, setActiveTab] = useState('all')
	const [statusFilter, setStatusFilter] = useState('all')
	const [openMenuId, setOpenMenuId] = useState(null)
	const [editingResume, setEditingResume] = useState(null)
	const [isSavingDetails, setIsSavingDetails] = useState(false)

	const handleLogout = useCallback(() => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}, [navigate])

	const fetchSavedResumes = useCallback(async () => {
		try {
			const res = await listSavedResumes()
			const data = res.data || res
			setSavedResumes({ items: data.items || [], max: data.max ?? 3 })
		} catch {
			setSavedResumes({ items: [], max: 3 })
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')
		if (!token || !userData) {
			navigate('/auth')
			return
		}
		fetchSavedResumes()
	}, [fetchSavedResumes, navigate])

	const stats = useMemo(() => {
		const items = savedResumes.items
		const ready = items.filter((resume) => draftMeta(resume).status === 'ready').length
		const drafts = items.filter((resume) => draftMeta(resume).status === 'draft').length
		const tailored = items.filter((resume) => Boolean(draftMeta(resume).role || resume.resume_data?.tailorIntent)).length
		return { total: items.length, ready, drafts, tailored }
	}, [savedResumes.items])

	const filteredResumes = useMemo(() => {
		const needle = query.trim().toLowerCase()
		return savedResumes.items.filter((resume) => {
			const meta = draftMeta(resume)
			const hay = `${resume.name || ''} ${meta.role} ${meta.company} ${meta.status} ${meta.tags.join(' ')} ${resume.template || ''}`.toLowerCase()
			if (needle && !hay.includes(needle)) return false
			if (activeTab === 'tailored' && !meta.role && !resume.resume_data?.tailorIntent) return false
			if (activeTab === 'draft' && meta.status !== 'draft') return false
			if (activeTab === 'ready' && meta.status !== 'ready') return false
			if (statusFilter !== 'all' && meta.status !== statusFilter) return false
			return true
		})
	}, [activeTab, query, savedResumes.items, statusFilter])

	const handleOpen = (id) => {
		navigate('/resume/preview', { state: { loadSavedId: id } })
	}

	const handleDelete = async (id) => {
		try {
			await deleteSavedResume(id)
			await fetchSavedResumes()
			toast.success('Draft deleted')
		} catch {
			toast.error('Failed to delete')
		}
	}

	const handleSaveDetails = async (id, updates) => {
		setIsSavingDetails(true)
		try {
			await updateSavedResume(id, updates)
			await fetchSavedResumes()
			setEditingResume(null)
			setOpenMenuId(null)
			toast.success('Draft details updated')
		} catch {
			toast.error('Failed to update draft')
		} finally {
			setIsSavingDetails(false)
		}
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
				<header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Resume Hub</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Organize every draft</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Search, tag, rename, and reopen the resume versions you save from the editor.
						</p>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="relative">
							<FontAwesomeIcon icon={faMagnifyingGlass} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search resumes..."
								className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-medium outline-none transition focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10 sm:w-72"
							/>
						</div>
						<button
							type="button"
							onClick={() => navigate('/resume/create')}
							className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-pink px-4 text-sm font-black text-white shadow-sm transition hover:bg-brand-pink-dark"
						>
							<FontAwesomeIcon icon={faPlus} className="size-4" />
							Create new resume
						</button>
					</div>
				</header>

				<section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<StatCard icon={faFileAlt} value={stats.total} label="Saved drafts" hint={`${savedResumes.items.length} of ${savedResumes.max} slots used`} className="bg-brand-pink/10 text-brand-pink-dark" />
					<StatCard icon={faWandMagicSparkles} value={stats.tailored} label="Tailored" hint="Role-specific versions" className="bg-sky-100 text-sky-700" />
					<StatCard icon={faPenToSquare} value={stats.drafts} label="In progress" hint="Still being shaped" className="bg-violet-100 text-violet-700" />
					<StatCard icon={faBookmark} value={stats.ready} label="Ready" hint="Marked ready to use" className="bg-emerald-100 text-emerald-700" />
				</section>

				<section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
					<div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-white">
						<div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
							<div className="flex min-w-0 gap-1 overflow-x-auto">
								{TABS.map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setActiveTab(tab.id)}
										className={`shrink-0 rounded-xl px-3 py-2 text-sm font-black transition ${
											activeTab === tab.id ? 'bg-brand-pink/10 text-brand-pink-dark' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
							<div className="flex items-center gap-2">
								<FontAwesomeIcon icon={faFilter} className="size-4 text-gray-400" />
								<select
									value={statusFilter}
									onChange={(event) => setStatusFilter(event.target.value)}
									className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10"
								>
									<option value="all">All statuses</option>
									<option value="draft">Draft</option>
									<option value="ready">Ready</option>
									<option value="submitted">Submitted</option>
									<option value="needs_review">Needs review</option>
								</select>
							</div>
						</div>

						{isLoading ? (
							<div className="p-6 text-sm font-medium text-gray-600">
								<span className="mr-3 inline-block size-3 animate-pulse rounded-full bg-brand-pink/50" aria-hidden />
								Loading drafts...
							</div>
						) : filteredResumes.length === 0 ? (
							<div className="px-6 py-14 text-center">
								<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-pink/[0.08] text-brand-pink-dark">
									<FontAwesomeIcon icon={faFileAlt} className="size-5" />
								</div>
								<p className="font-black text-gray-950">No drafts found</p>
								<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
									Save a draft from the preview editor, or adjust your search and filters.
								</p>
							</div>
						) : (
							<div>
								{filteredResumes.map((resume, index) => (
									<ResumeRow
										key={resume.id}
										resume={resume}
										index={index}
										menuOpen={openMenuId === resume.id}
										onToggleMenu={setOpenMenuId}
										onOpen={handleOpen}
										onEdit={(item) => {
											setEditingResume(item)
											setOpenMenuId(null)
										}}
										onDelete={handleDelete}
									/>
								))}
							</div>
						)}
					</div>

					<aside className="space-y-4">
						<div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
							<p className="font-black text-gray-950">Quick actions</p>
							<div className="mt-4 space-y-2">
								<button type="button" onClick={() => navigate('/resume/create')} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50">
									Create a new resume
									<FontAwesomeIcon icon={faArrowRight} className="size-3 text-gray-400" />
								</button>
								<button type="button" onClick={() => navigate('/templates')} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50">
									Browse templates
									<FontAwesomeIcon icon={faArrowRight} className="size-3 text-gray-400" />
								</button>
								<button type="button" onClick={() => navigate('/info')} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50">
									Update profile data
									<FontAwesomeIcon icon={faArrowRight} className="size-3 text-gray-400" />
								</button>
							</div>
						</div>

						<div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
							<div className="flex items-start gap-3">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink-dark">
									<FontAwesomeIcon icon={faClockRotateLeft} className="size-4" />
								</span>
								<div>
									<p className="font-black text-gray-950">Draft slots</p>
									<p className="mt-1 text-sm leading-relaxed text-gray-600">
										{savedResumes.items.length} of {savedResumes.max} saved. Delete an older draft when you need room.
									</p>
								</div>
							</div>
						</div>
					</aside>
				</section>
			</div>

			<EditDraftModal
				resume={editingResume}
				saving={isSavingDetails}
				onClose={() => setEditingResume(null)}
				onSave={handleSaveDetails}
			/>
		</DashboardShell>
	)
}
