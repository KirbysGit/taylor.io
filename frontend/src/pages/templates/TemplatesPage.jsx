// pages/templates/TemplatesPage.jsx
// Gallery of resume templates from the API (folders + meta.json). Optional previewImage + shortDescription in meta.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '@/components/TopNav'
import { listTemplates } from '@/api/services/templates'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MODE_LABELS = {
	themeable: 'Themeable',
	hybrid: 'Hybrid',
	locked: 'Fixed look',
}

/** Generic “page with lines” when no image or load error. */
function FallbackMiniPreview() {
	return (
		<div
			className="mb-4 flex aspect-[8.5/11] max-h-52 w-full flex-col rounded-xl bg-gradient-to-br from-white via-slate-50 to-cream p-4 ring-1 ring-slate-200/80"
			aria-hidden
		>
			<div className="mx-auto mb-2 h-2 w-24 rounded bg-slate-300/90" />
			<div className="mx-auto mb-3 h-1 w-16 rounded bg-brand-pink/50" />
			<div className="mx-auto mb-2 h-1 w-40 rounded bg-slate-200" />
			<div className="mx-auto mb-1 h-1 w-36 rounded bg-slate-100" />
			<div className="mx-auto mt-auto h-1.5 w-20 rounded bg-slate-200" />
			<div className="mx-auto mt-1 h-1 w-32 rounded bg-slate-100" />
		</div>
	)
}

function TemplatePreviewFrame({ meta }) {
	const src = meta?.previewUrl ? `${API_BASE}${meta.previewUrl}` : null
	const [imgOk, setImgOk] = useState(!!src)

	useEffect(() => {
		setImgOk(!!src)
	}, [src])

	if (!src || !imgOk) {
		return <FallbackMiniPreview />
	}

	return (
		<div className="mb-4 aspect-[8.5/11] max-h-52 w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/80">
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
	const mode = MODE_LABELS[meta?.stylingMode] || MODE_LABELS.themeable

	return (
		<article
			className="flex flex-col rounded-2xl border-2 border-gray-200 bg-white-bright p-5 shadow-lg transition-all hover:border-brand-pink/50 hover:shadow-xl"
			style={{
				boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
			}}
		>
			<TemplatePreviewFrame meta={meta} />
			<div className="mb-2 flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-brand-pink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-pink-dark">
					{mode}
				</span>
				{meta?.layoutLocked ? (
					<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
						Layout fixed
					</span>
				) : null}
				<span className="ml-auto font-mono text-[10px] text-slate-400">{folder}</span>
			</div>
			<h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
			{blurb ? (
				<p
					className={`mt-2 flex-1 text-slate-600 leading-relaxed ${short ? 'text-xs line-clamp-3' : 'text-xs line-clamp-2'}`}
				>
					{blurb}
				</p>
			) : (
				<p className="mt-2 flex-1 text-xs italic text-slate-400">No description yet.</p>
			)}
			<button
				type="button"
				onClick={() => onUse(folder)}
				className="mt-4 w-full rounded-xl bg-brand-pink py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
			>
				Use in editor
			</button>
		</article>
	)
}

function TemplatesPage() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
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
		if (!token || !userData) {
			navigate('/auth')
			return
		}
		try {
			setUser(JSON.parse(userData))
		} catch {
			navigate('/auth')
		}
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
			} catch (e) {
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

	const handleUse = (folder) => {
		navigate('/resume/preview', { state: { selectTemplate: folder } })
	}

	return (
		<div className="info-scrollbar flex min-h-screen flex-col overflow-y-auto bg-cream" style={{ height: '100vh' }}>
			<TopNav user={user} onLogout={handleLogout} />

			<main className="flex-1 py-10 bg-cream">
				<div className="mx-auto max-w-6xl px-8">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900">Resume templates</h1>
						<p className="mt-2 max-w-xl text-sm text-gray-600">
							Each template can ship its own look—cards show a small preview and a short blurb when the template provides them.
						</p>
					</div>

					{loading && (
						<div className="flex items-center gap-3 text-gray-600">
							<span className="h-4 w-4 animate-pulse rounded-full bg-brand-pink/40" aria-hidden />
							Loading templates…
						</div>
					)}

					{error && (
						<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
					)}

					{!loading && !error && sorted.length === 0 && (
						<p className="text-gray-600">No templates found.</p>
					)}

					{!loading && !error && sorted.length > 0 && (
						<ul className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
							{sorted.map((folder) => (
								<li key={folder}>
									<TemplateCard folder={folder} meta={templateStyling[folder]} onUse={handleUse} />
								</li>
							))}
						</ul>
					)}
				</div>
			</main>
		</div>
	)
}

export default TemplatesPage
