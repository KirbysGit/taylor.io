// pages/templates/TemplatesPage.jsx
// Gallery of resume templates from the API (folders + meta.json). Optional previewImage + shortDescription in meta.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faLayerGroup,
	faPalette,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { listTemplates } from '@/api/services/templates'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MODE_LABELS = {
	themeable: 'Themeable',
	hybrid: 'Hybrid',
	locked: 'Fixed look',
}

const modeStyles = {
	themeable: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
	hybrid: 'bg-violet-50 text-violet-700 ring-violet-200',
	locked: 'bg-slate-100 text-slate-700 ring-slate-200',
}

function groupTemplateSections(sortedSlugs, templateStyling) {
	const byFamily = new Map()
	const ungrouped = []
	for (const slug of sortedSlugs) {
		const fam = ((templateStyling[slug]?.family) || '').trim()
		if (fam) {
			if (!byFamily.has(fam)) byFamily.set(fam, [])
			byFamily.get(fam).push(slug)
		} else {
			ungrouped.push(slug)
		}
	}
	const familyNames = [...byFamily.keys()].sort((a, b) => a.localeCompare(b))
	const sections = familyNames.map((name) => ({
		key: `family:${name}`,
		heading: name,
		slugs: byFamily.get(name),
	}))
	if (ungrouped.length) {
		sections.push({
			key: 'ungrouped',
			heading: familyNames.length > 0 ? 'Other' : null,
			slugs: ungrouped,
		})
	}
	return sections
}

function FallbackMiniPreview() {
	return (
		<div
			className="flex aspect-[8.5/11] max-h-56 w-full flex-col rounded-2xl border border-brand-pink/10 bg-gradient-to-br from-white via-slate-50 to-brand-pink/[0.04] p-4 shadow-inner"
			aria-hidden
		>
			<div className="mx-auto mb-3 size-9 rounded-full bg-brand-pink/12" />
			<div className="mx-auto mb-2 h-2.5 w-24 rounded-full bg-brand-pink/60" />
			<div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-200" />
			<div className="space-y-2">
				<div className="h-1.5 w-full rounded-full bg-slate-200" />
				<div className="h-1.5 w-[82%] rounded-full bg-slate-200/80" />
				<div className="h-1.5 w-[70%] rounded-full bg-slate-200/60" />
			</div>
			<div className="mt-auto space-y-2">
				<div className="h-1.5 w-[88%] rounded-full bg-slate-200/80" />
				<div className="h-1.5 w-[62%] rounded-full bg-slate-200/60" />
			</div>
		</div>
	)
}

function TemplatePreviewFrame({ meta }) {
	const src = meta?.previewUrl ? `${API_BASE}${meta.previewUrl}` : null
	const [imgOk, setImgOk] = useState(!!src)

	useEffect(() => {
		setImgOk(!!src)
	}, [src])

	if (!src || !imgOk) return <FallbackMiniPreview />

	return (
		<div className="aspect-[8.5/11] max-h-56 w-full overflow-hidden rounded-2xl border border-brand-pink/10 bg-slate-100 shadow-inner">
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

function TemplateCard({ folder, meta, onUse }) {
	const displayName = meta?.displayName || folder
	const short = (meta?.shortDescription || '').trim()
	const long = (meta?.description || '').trim()
	const blurb = short || long
	const modeKey = meta?.stylingMode || 'themeable'
	const mode = MODE_LABELS[modeKey] || MODE_LABELS.themeable
	const modeClass = modeStyles[modeKey] || modeStyles.themeable

	return (
		<article className="group flex h-full flex-col rounded-[1.35rem] border border-brand-pink/13 bg-white/82 p-4 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-pink/28 hover:shadow-[0_24px_54px_-34px_rgba(214,86,86,0.36)]">
			<TemplatePreviewFrame meta={meta} />

			<div className="mt-4 flex flex-wrap items-center gap-2">
				<span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ring-1 ${modeClass}`}>
					{mode}
				</span>
				{meta?.layoutLocked ? (
					<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
						Layout fixed
					</span>
				) : null}
			</div>

			<div className="mt-3">
				<h2 className="text-xl font-black tracking-tight text-gray-950">{displayName}</h2>
				{(meta?.variantLabel || '').trim() ? (
					<p className="mt-1 text-xs font-bold text-brand-pink-dark">{(meta.variantLabel || '').trim()}</p>
				) : null}
			</div>

			{blurb ? (
				<p className={`mt-3 flex-1 text-sm leading-relaxed text-gray-600 ${short ? 'line-clamp-3' : 'line-clamp-2'}`}>
					{blurb}
				</p>
			) : (
				<p className="mt-3 flex-1 text-sm italic text-gray-400">No description yet.</p>
			)}

			<div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
				<span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{folder}</span>
				<button
					type="button"
					onClick={() => onUse(folder)}
					className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-pink px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_-18px_rgba(214,86,86,0.72)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
				>
					Use
					<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
				</button>
			</div>
		</article>
	)
}

function TemplatesPage() {
	const navigate = useNavigate()
	const [templates, setTemplates] = useState([])
	const [templateStyling, setTemplateStyling] = useState({})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)

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
				setTemplates(Array.isArray(body.templates) ? body.templates : [])
				setTemplateStyling(body.templateStyling || {})
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

	const sorted = [...templates].sort((a, b) => {
		const na = (templateStyling[a]?.displayName || a).toLowerCase()
		const nb = (templateStyling[b]?.displayName || b).toLowerCase()
		return na.localeCompare(nb)
	})

	const sections = groupTemplateSections(sorted, templateStyling)

	const handleUse = (folder) => {
		navigate('/resume/preview', { state: { selectTemplate: folder } })
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
				<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">
							<FontAwesomeIcon icon={faLayerGroup} className="size-3.5" />
							Templates
						</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Choose a r&eacute;sum&eacute; style</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Start from a layout direction, then tune the content and styling inside the editor.
						</p>
					</div>
					<button
						type="button"
						onClick={() => navigate('/resume/create')}
						className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
						Create new r&eacute;sum&eacute;
					</button>
				</header>

				<section className="mb-6 rounded-[1.35rem] border border-brand-pink/13 bg-white/78 p-5 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-4">
							<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark">
								<FontAwesomeIcon icon={faPalette} className="size-5" />
							</span>
							<div>
								<p className="font-black text-gray-950">Template gallery</p>
								<p className="mt-1 text-sm text-gray-600">
									{loading ? 'Loading available designs...' : `${sorted.length} template${sorted.length === 1 ? '' : 's'} available`}
								</p>
							</div>
						</div>
						<p className="max-w-md text-sm leading-relaxed text-gray-500">
							Templates with the same family are grouped together, usually as the same structure with a different skin.
						</p>
					</div>
				</section>

				{loading && (
					<div className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 p-6 text-gray-600 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)]">
						<span className="mr-3 inline-block size-3 animate-pulse rounded-full bg-brand-pink/50" aria-hidden />
						Loading templates...
					</div>
				)}

				{error && (
					<div className="rounded-[1.35rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">{error}</div>
				)}

				{!loading && !error && sorted.length === 0 && (
					<div className="rounded-[1.35rem] border border-dashed border-brand-pink/24 bg-white/70 px-6 py-12 text-center text-gray-600">
						No templates found.
					</div>
				)}

				{!loading && !error && sorted.length > 0 &&
					sections.map((section) => (
						<section key={section.key} className="mb-10 last:mb-0">
							{section.heading ? (
								<div className="mb-5 flex items-center gap-3">
									<h2 className="text-lg font-black tracking-tight text-gray-950">{section.heading}</h2>
									<span className="h-px flex-1 bg-gradient-to-r from-brand-pink/20 to-transparent" />
								</div>
							) : null}
							<ul className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
								{section.slugs.map((folder) => (
									<li key={folder}>
										<TemplateCard folder={folder} meta={templateStyling[folder]} onUse={handleUse} />
									</li>
								))}
							</ul>
						</section>
					))}
			</div>
		</DashboardShell>
	)
}

export default TemplatesPage
