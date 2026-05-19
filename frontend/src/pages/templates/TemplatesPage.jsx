// pages/templates/TemplatesPage.jsx
// Clean template library — search, filters, grid/list, and a detail panel for the selected layout.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faCheck,
	faEye,
	faMagnifyingGlass,
	faStar,
	faXmark,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import ThemedSelect from '@/components/inputs/ThemedSelect'
import { listTemplates } from '@/api/services/templates'
import { DEFAULT_STYLE_PREFERENCES } from '@/pages/5resume/utils/resumePreviewConstants'
import {
	getStyleControlOptions,
	getVisibleTemplateStyleControls,
	STYLE_CONTROL_LABELS,
	STYLE_PREFERENCE_KEYS,
	templateSupportsControl,
} from '@/pages/5resume/utils/resumeStyleControls'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SORT_OPTIONS = [
	{ value: 'recommended', label: 'Recommended' },
	{ value: 'name-asc', label: 'Name (A–Z)' },
	{ value: 'name-desc', label: 'Name (Z–A)' },
]

const FILTER_PILLS = [
	{ id: 'all', label: 'All' },
	{ id: 'themeable', label: 'Themeable' },
	{ id: 'ats', label: 'ATS-friendly' },
	{ id: 'one-page', label: 'One-page' },
	{ id: 'sidebar', label: 'Sidebar' },
	{ id: 'classic', label: 'Classic' },
]

const MODE_CHIP = {
	themeable: 'Themeable',
	hybrid: 'Hybrid',
	locked: 'Fixed',
}

/** Grid cards split ~50/50 preview vs copy; list/panel use fixed thumbs. */
const CARD_MIN_H = 'min-h-[19rem] sm:min-h-[21rem]'
const LIST_PREVIEW_H = 'h-[7.5rem]'
const PANEL_PREVIEW_H = 'h-[7rem] w-[5.25rem]'

function templateTags(slug, meta) {
	const tags = []
	if (Array.isArray(meta?.tags)) tags.push(...meta.tags)
	if (meta?.family) tags.push(meta.family)
	if (meta?.variantLabel) tags.push(meta.variantLabel)
	const mode = meta?.stylingMode
	if (mode && MODE_CHIP[mode]) tags.push(MODE_CHIP[mode])
	if (meta?.docxMaxPages === 1) tags.push('One-page')
	if (!tags.length) tags.push(slug)
	return [...new Set(tags)].slice(0, 3)
}

function matchesFilter(slug, meta, filterId) {
	if (filterId === 'all') return true
	const mode = meta?.stylingMode || 'themeable'
	const hay = `${slug} ${meta?.family || ''} ${meta?.displayName || ''} ${meta?.layoutProfile || ''} ${
		meta?.intent || ''
	} ${(meta?.tags || []).join(' ')}`.toLowerCase()
	if (filterId === 'themeable') return mode === 'themeable'
	if (filterId === 'ats') return hay.includes('ats')
	if (filterId === 'one-page') return meta?.docxMaxPages === 1
	if (filterId === 'sidebar') return hay.includes('sidebar') || hay.includes('split')
	if (filterId === 'classic') return hay.includes('classic')
	return true
}

function sortTemplates(slugs, templateStyling, sortBy) {
	const list = [...slugs]
	if (sortBy === 'name-desc') {
		return list.sort((a, b) =>
			(templateStyling[b]?.displayName || b).localeCompare(templateStyling[a]?.displayName || a),
		)
	}
	if (sortBy === 'name-asc') {
		return list.sort((a, b) =>
			(templateStyling[a]?.displayName || a).localeCompare(templateStyling[b]?.displayName || b),
		)
	}
	// Recommended: themeable first, then display name.
	const rank = { themeable: 0, hybrid: 1, locked: 2 }
	return list.sort((a, b) => {
		const ra = rank[templateStyling[a]?.stylingMode] ?? 1
		const rb = rank[templateStyling[b]?.stylingMode] ?? 1
		if (ra !== rb) return ra - rb
		return (templateStyling[a]?.displayName || a).localeCompare(templateStyling[b]?.displayName || b)
	})
}

function FallbackMiniPreview({ className = '' }) {
	return (
		<div
			className={`flex w-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-brand-pink/[0.03] p-2.5 shadow-inner ${className}`}
			aria-hidden
		>
			<div className="mx-auto mb-1.5 size-5 rounded-full bg-brand-pink/12" />
			<div className="mx-auto mb-1 h-1 w-12 rounded-full bg-brand-pink/50" />
			<div className="mx-auto mb-2 h-0.5 w-8 rounded-full bg-slate-200" />
			<div className="space-y-1">
				<div className="h-1 w-full rounded-full bg-slate-200" />
				<div className="h-1 w-[82%] rounded-full bg-slate-200/80" />
				<div className="h-1 w-[70%] rounded-full bg-slate-200/60" />
			</div>
		</div>
	)
}

function TemplatePreviewFrame({ meta, className = '' }) {
	const src = meta?.previewUrl ? `${API_BASE}${meta.previewUrl}` : null
	const [imgOk, setImgOk] = useState(!!src)

	useEffect(() => {
		setImgOk(!!src)
	}, [src])

	if (!src || !imgOk) {
		return <FallbackMiniPreview className={className} />
	}

	return (
		<div
			className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 shadow-inner ${className}`}
		>
			<img
				src={src}
				alt=""
				className="h-full w-full object-cover object-top"
				loading="lazy"
				decoding="async"
				onError={() => setImgOk(false)}
			/>
		</div>
	)
}

function TemplateCard({ folder, meta, selected, viewMode, onSelect, onPreview, onUse }) {
	const displayName = meta?.displayName || folder
	const blurb = (meta?.shortDescription || meta?.description || '').trim()
	const tags = templateTags(folder, meta)

	const isList = viewMode === 'list'

	if (isList) {
		return (
			<article
				className={`flex gap-5 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
					selected ? 'border-brand-pink ring-2 ring-brand-pink/25' : 'border-slate-200/90'
				}`}
			>
				<button type="button" onClick={() => onSelect(folder)} className="relative w-[4.75rem] shrink-0 text-left sm:w-20">
					<TemplatePreviewFrame meta={meta} className={`${LIST_PREVIEW_H} w-full rounded-lg`} />
					{selected ? (
						<span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-brand-pink text-white shadow">
							<FontAwesomeIcon icon={faCheck} className="size-2.5" aria-hidden />
						</span>
					) : null}
				</button>
				<div className="flex min-w-0 flex-1 flex-col">
					<button type="button" onClick={() => onSelect(folder)} className="text-left">
						<h2 className="text-sm font-bold text-slate-900">{displayName}</h2>
						{blurb ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{blurb}</p> : null}
						<div className="mt-2.5 flex flex-wrap gap-2">
							{tags.map((t) => (
								<span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
									{t}
								</span>
							))}
						</div>
					</button>
					<div className="mt-auto flex flex-wrap gap-2.5 pt-4">
						<button
							type="button"
							onClick={() => onPreview(folder)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
						>
							<FontAwesomeIcon icon={faEye} className="size-3.5 opacity-70" />
							Preview
						</button>
						<button
							type="button"
							onClick={() => onUse(folder)}
							className="inline-flex items-center gap-1.5 rounded-xl bg-brand-pink px-3 py-2 text-xs font-semibold text-white hover:bg-brand-pink-dark"
						>
							Use template
						</button>
					</div>
				</div>
			</article>
		)
	}

	return (
		<article
			className={`flex h-full ${CARD_MIN_H} flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
				selected ? 'border-brand-pink ring-2 ring-brand-pink/25' : 'border-slate-200/90'
			}`}
		>
			{/* Top half — résumé preview */}
			<button
				type="button"
				onClick={() => onSelect(folder)}
				className="relative flex min-h-0 flex-1 flex-col bg-slate-50/60 p-4 pb-3 text-left"
			>
				<TemplatePreviewFrame meta={meta} className="h-full min-h-0 w-full flex-1 rounded-xl border-slate-200/80" />
				{selected ? (
					<span className="absolute right-5 top-5 flex size-6 items-center justify-center rounded-full bg-brand-pink text-white shadow-md">
						<FontAwesomeIcon icon={faCheck} className="size-3" aria-hidden />
					</span>
				) : null}
			</button>

			{/* Bottom half — title, blurb, tags, actions */}
			<div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 px-5 py-4">
				<div className="flex min-h-0 flex-1 flex-col">
					<h2 className="text-sm font-bold text-slate-900">{displayName}</h2>
					{blurb ? (
						<p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{blurb}</p>
					) : (
						<div className="flex-1" />
					)}
					<div className="mt-2.5 flex flex-wrap gap-2">
						{tags.map((t) => (
							<span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
								{t}
							</span>
						))}
					</div>
				</div>
				<div className="mt-3 flex shrink-0 gap-2.5 pt-1">
					<button
						type="button"
						onClick={() => onPreview(folder)}
						className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
					>
						<FontAwesomeIcon icon={faEye} className="size-3.5 opacity-70" />
						Preview
					</button>
					<button
						type="button"
						onClick={() => onUse(folder)}
						className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-pink py-2.5 text-xs font-semibold text-white hover:bg-brand-pink-dark"
					>
						Use template
					</button>
				</div>
			</div>
		</article>
	)
}

function PanelSegment({ label, value, options, onChange }) {
	return (
		<div>
			<p className="mb-2.5 text-xs font-semibold text-slate-700">{label}</p>
			<div className="flex rounded-xl border border-slate-200 bg-slate-50/80 p-1.5">
				{options.map((opt) => {
					const active = value === opt.id
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onChange(opt.id)}
							className={`min-w-0 flex-1 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition ${
								active ? 'bg-white text-brand-pink-dark shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500 hover:text-slate-800'
							}`}
						>
							{opt.label}
						</button>
					)
				})}
			</div>
		</div>
	)
}

function SelectedTemplatePanel({ slug, meta, styleDraft, onStyleChange, onClose, onPreview, onUse }) {
	if (!slug) return null
	const displayName = meta?.displayName || slug
	const visibleTemplateControls = getVisibleTemplateStyleControls(meta)
	const showMargins = templateSupportsControl(meta, 'marginPreset')
	const showSpacing = templateSupportsControl(meta, 'lineSpacingPreset')
	const showType = templateSupportsControl(meta, 'typeScale')
	const showFonts = templateSupportsControl(meta, 'fontPairing')
	const hasTuners = visibleTemplateControls.length > 0
	const onePage = meta?.docxMaxPages === 1

	return (
		<aside className="flex w-full shrink-0 flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm lg:w-[min(100%,20rem)] xl:w-80">
			<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<p className="text-sm font-semibold text-slate-800">Selected template</p>
				<button
					type="button"
					onClick={onClose}
					className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
					aria-label="Close panel"
				>
					<FontAwesomeIcon icon={faXmark} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto px-5 py-5">
				<div className="flex gap-4">
					<TemplatePreviewFrame meta={meta} className={`${PANEL_PREVIEW_H} shrink-0 rounded-lg`} />
					<div className="min-w-0">
						<p className="text-sm font-bold text-slate-900">{displayName}</p>
						{onePage ? (
							<span className="mt-2 inline-block rounded-full bg-brand-pink/10 px-2 py-0.5 text-[10px] font-semibold text-brand-pink-dark">
								One-page optimized
							</span>
						) : (
							<span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
								Multi-page friendly
							</span>
						)}
					</div>
				</div>

				{hasTuners ? (
					<div className="mt-6 space-y-5">
						<p className="text-xs leading-relaxed text-slate-500">
							Quick tweaks carry into the editor. Full styling is available after you open your résumé.
						</p>
						{showMargins ? (
							<PanelSegment
								label={STYLE_CONTROL_LABELS.marginPreset}
								value={styleDraft[STYLE_PREFERENCE_KEYS.marginPreset]}
								options={getStyleControlOptions('marginPreset', meta, { shortLabels: true })}
								onChange={(id) => onStyleChange(STYLE_PREFERENCE_KEYS.marginPreset, id)}
							/>
						) : null}
						{showSpacing ? (
							<PanelSegment
								label={STYLE_CONTROL_LABELS.lineSpacingPreset}
								value={styleDraft[STYLE_PREFERENCE_KEYS.lineSpacingPreset]}
								options={getStyleControlOptions('lineSpacingPreset', meta, { shortLabels: true })}
								onChange={(id) => onStyleChange(STYLE_PREFERENCE_KEYS.lineSpacingPreset, id)}
							/>
						) : null}
						{showType ? (
							<PanelSegment
								label={STYLE_CONTROL_LABELS.typeScale}
								value={styleDraft[STYLE_PREFERENCE_KEYS.typeScale]}
								options={getStyleControlOptions('typeScale', meta, { shortLabels: true })}
								onChange={(id) => onStyleChange(STYLE_PREFERENCE_KEYS.typeScale, id)}
							/>
						) : null}
						{showFonts ? (
							<PanelSegment
								label={STYLE_CONTROL_LABELS.fontPairing}
								value={styleDraft[STYLE_PREFERENCE_KEYS.fontPairing]}
								options={getStyleControlOptions('fontPairing', meta, { shortLabels: true })}
								onChange={(id) => onStyleChange(STYLE_PREFERENCE_KEYS.fontPairing, id)}
							/>
						) : null}
					</div>
				) : (
					<p className="mt-5 text-sm leading-relaxed text-slate-500">
						This layout keeps a fixed look. Open it in the editor to fill in your content and export.
					</p>
				)}
			</div>

			<div className="space-y-3 border-t border-slate-100 p-5">
				<button
					type="button"
					onClick={() => onUse(slug)}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-pink-dark"
				>
					<FontAwesomeIcon icon={faStar} className="size-3.5 opacity-90" />
					Use this template
				</button>
				<button
					type="button"
					onClick={() => onPreview(slug)}
					className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/40 bg-white py-2.5 text-sm font-semibold text-brand-pink-dark hover:bg-brand-pink/[0.04]"
				>
					<FontAwesomeIcon icon={faEye} className="size-3.5" />
					Preview with my résumé
				</button>
			</div>
		</aside>
	)
}

function TemplatesPage() {
	const navigate = useNavigate()
	const [templates, setTemplates] = useState([])
	const [templateStyling, setTemplateStyling] = useState({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

	const [search, setSearch] = useState('')
	const [activeFilter, setActiveFilter] = useState('all')
	const [sortBy, setSortBy] = useState('recommended')
	const [viewMode, setViewMode] = useState('grid')
	const [selectedSlug, setSelectedSlug] = useState(null)
	const [styleDraft, setStyleDraft] = useState(() => ({ ...DEFAULT_STYLE_PREFERENCES }))

	const handleLogout = useCallback(() => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}, [navigate])

	useEffect(() => {
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')
		if (!token || !userData) navigate('/auth')
	}, [navigate])

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await listTemplates()
				const body = res.data || res
				if (cancelled) return
				const list = Array.isArray(body.templates) ? body.templates : []
				setTemplates(list)
				setTemplateStyling(body.templateStyling || {})
				if (list.length > 0) {
					setSelectedSlug((prev) => (prev && list.includes(prev) ? prev : list[0]))
				}
			} catch {
				if (!cancelled) setError('Could not load templates.')
			} finally {
				if (!cancelled) setLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase()
		let list = templates.filter((slug) => {
			const meta = templateStyling[slug] || {}
			if (!matchesFilter(slug, meta, activeFilter)) return false
			if (!q) return true
			const blob = `${slug} ${meta.displayName || ''} ${meta.shortDescription || ''} ${meta.description || ''} ${
				meta.family || ''
			} ${meta.intent || ''} ${(meta.tags || []).join(' ')}`.toLowerCase()
			return blob.includes(q)
		})
		return sortTemplates(list, templateStyling, sortBy)
	}, [templates, templateStyling, search, activeFilter, sortBy])

	const selectedMeta = selectedSlug ? templateStyling[selectedSlug] : null

	const goPreview = useCallback(
		(folder) => {
			navigate('/resume/preview', {
				state: {
					selectTemplate: folder,
					stylePreferences: styleDraft,
				},
			})
		},
		[navigate, styleDraft],
	)

	const goUse = useCallback(
		(folder) => {
			setSelectedSlug(folder)
			goPreview(folder)
		},
		[goPreview],
	)

	const onStyleChange = useCallback((key, value) => {
		setStyleDraft((prev) => ({ ...prev, [key]: value }))
	}, [])

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto flex max-w-[90rem] flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
				<div className="min-w-0 flex-1">
					<header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Templates</h1>
							<p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
								Browse layouts, compare styles, and start from one that fits your role and industry.
							</p>
						</div>
						<button
							type="button"
							onClick={() => goPreview(selectedSlug || templates[0])}
							disabled={loading || templates.length === 0}
							className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-pink/50 bg-white px-4 py-2.5 text-sm font-semibold text-brand-pink-dark shadow-sm hover:bg-brand-pink/[0.04] disabled:opacity-50"
						>
							<FontAwesomeIcon icon={faEye} className="size-4" />
							Preview with my résumé
						</button>
					</header>

					<div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
						<label className="relative min-w-0 flex-1">
							<span className="sr-only">Search templates</span>
							<FontAwesomeIcon
								icon={faMagnifyingGlass}
								className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
							/>
							<input
								type="search"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search templates…"
								className="input w-full rounded-2xl border-slate-200/90 py-2.5 pl-10 pr-4 text-sm shadow-sm"
							/>
						</label>
						<div className="flex flex-wrap items-center gap-3">
							<div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
								{['grid', 'list'].map((mode) => {
									const active = viewMode === mode
									return (
										<button
											key={mode}
											type="button"
											onClick={() => setViewMode(mode)}
											className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
												active ? 'bg-brand-pink/10 text-brand-pink-dark' : 'text-slate-500 hover:text-slate-800'
											}`}
										>
											{mode}
										</button>
									)
								})}
							</div>
							<div className="w-[11.5rem]">
								<ThemedSelect
									value={sortBy}
									onChange={setSortBy}
									options={SORT_OPTIONS}
									placeholder="Sort by"
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]">
						{FILTER_PILLS.map((pill) => {
							const active = activeFilter === pill.id
							return (
								<button
									key={pill.id}
									type="button"
									onClick={() => setActiveFilter(pill.id)}
									className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
										active
											? 'border-brand-pink bg-brand-pink/10 text-brand-pink-dark'
											: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
									}`}
								>
									{pill.label}
								</button>
							)
						})}
					</div>

					{loading && (
						<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
							<span className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-brand-pink/60" aria-hidden />
							Loading templates…
						</div>
					)}

					{error && (
						<div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
							{error}
						</div>
					)}

					{!loading && !error && filtered.length === 0 && (
						<div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600">
							No templates match your search. Try another filter or clear the search box.
						</div>
					)}

					{!loading && !error && filtered.length > 0 && (
						<ul
							className={`mt-10 ${
								viewMode === 'grid'
									? 'grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 sm:gap-7 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-8'
									: 'flex flex-col gap-5'
							}`}
						>
							{filtered.map((folder) => (
								<li key={folder} className={viewMode === 'grid' ? 'h-full' : undefined}>
									<TemplateCard
										folder={folder}
										meta={templateStyling[folder]}
										selected={selectedSlug === folder}
										viewMode={viewMode}
										onSelect={setSelectedSlug}
										onPreview={goPreview}
										onUse={goUse}
									/>
								</li>
							))}
						</ul>
					)}
				</div>

				{!loading && selectedSlug && (
					<SelectedTemplatePanel
						slug={selectedSlug}
						meta={selectedMeta}
						styleDraft={styleDraft}
						onStyleChange={onStyleChange}
						onClose={() => setSelectedSlug(null)}
						onPreview={goPreview}
						onUse={goUse}
					/>
				)}
			</div>
		</DashboardShell>
	)
}

export default TemplatesPage
