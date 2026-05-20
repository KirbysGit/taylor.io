// components / left / ResumeStyling.jsx
// Compact template shelf + selected-style controls.

import { useEffect, useMemo, useState } from 'react'
import {
	getPlannedTemplateControls,
	getStyleControlOptions,
	getVisibleTemplateStyleControls,
	STYLE_CONTROL_LABELS,
	STYLE_PREFERENCE_KEYS,
	templateSupportsControl,
} from '@/pages/5resume/utils/resumeStyleControls'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TEMPLATE_RECENT_KEY = 'resumeEditorRecentTemplates'
const TEMPLATE_SHELF_TABS = [
	{ id: 'popular', label: 'Popular' },
	{ id: 'recent', label: 'Recent' },
	{ id: 'favorites', label: 'Favorites' },
]
const POPULAR_TEMPLATE_HINTS = ['classic', 'ats', 'compact', 'modern', 'project', 'sidebar']

const STYLING_MODES = {
	themeable: {
		label: 'Flexible',
		className: 'border-brand-pink/20 bg-brand-pink/[0.08] text-brand-pink-dark',
		hint: 'These settings change the look only. Your resume content stays the same.',
	},
	hybrid: {
		label: 'Guided',
		className: 'border-sky-200 bg-sky-50 text-sky-800',
		hint: 'This template has a guided layout with a smaller set of safe adjustments.',
	},
	locked: {
		label: 'Fixed',
		className: 'border-slate-200 bg-slate-100 text-slate-600',
		hint: 'This template keeps a curated look. Style options are limited.',
	},
}

function modeForMeta(stylingMode) {
	return STYLING_MODES[stylingMode] ? stylingMode : 'themeable'
}

function readRecentTemplates() {
	try {
		const parsed = JSON.parse(localStorage.getItem(TEMPLATE_RECENT_KEY) || '[]')
		return Array.isArray(parsed) ? parsed.filter(Boolean) : []
	} catch {
		return []
	}
}

function recordRecentTemplate(slug) {
	if (!slug) return
	const next = [slug, ...readRecentTemplates().filter((item) => item !== slug)].slice(0, 6)
	try {
		localStorage.setItem(TEMPLATE_RECENT_KEY, JSON.stringify(next))
	} catch {
		//
	}
}

function pickPopularTemplates(availableTemplates, templateStyling, limit = 6) {
	const list = Array.isArray(availableTemplates) ? availableTemplates : []
	const scored = list.map((slug, index) => {
		const meta = templateStyling?.[slug] || {}
		const hay = `${slug} ${meta.displayName || ''} ${meta.family || ''} ${meta.layoutProfile || ''} ${(meta.tags || []).join(' ')}`.toLowerCase()
		let score = 0
		POPULAR_TEMPLATE_HINTS.forEach((hint, i) => {
			if (hay.includes(hint)) score += 20 - i
		})
		if (meta.docxMaxPages === 1) score += 4
		if (meta.stylingMode === 'themeable') score += 3
		return { slug, score, index }
	})
	return scored
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map((item) => item.slug)
		.slice(0, limit)
}

function tagsForTemplate(slug, meta) {
	const tags = []
	if (meta?.docxMaxPages === 1) tags.push('One-page')
	if (meta?.layoutProfile) tags.push(meta.layoutProfile)
	if (meta?.family) tags.push(meta.family)
	if (Array.isArray(meta?.tags)) tags.push(...meta.tags)
	if (!tags.length) tags.push(slug)
	return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 2)
}

function ModeTag({ mode }) {
	const shaped = STYLING_MODES[modeForMeta(mode)]
	return (
		<span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${shaped.className}`}>
			{shaped.label}
		</span>
	)
}

function TemplatePreview({ slug, meta }) {
	const src = meta?.previewUrl ? `${API_BASE}${meta.previewUrl}` : null
	const [imageOk, setImageOk] = useState(Boolean(src))

	useEffect(() => {
		setImageOk(Boolean(src))
	}, [src])

	if (src && imageOk) {
		return (
			<img
				src={src}
				alt=""
				className="h-full w-full object-cover object-top"
				loading="lazy"
				decoding="async"
				onError={() => setImageOk(false)}
			/>
		)
	}

	return (
		<div className="flex h-full flex-col bg-gradient-to-b from-white to-slate-50 p-2">
			<div className="mb-1.5 h-2 w-10 rounded bg-brand-pink/35" />
			<div className="space-y-1">
				<div className="h-1 rounded bg-slate-200" />
				<div className="h-1 w-5/6 rounded bg-slate-200" />
				<div className="h-1 w-2/3 rounded bg-slate-200" />
			</div>
			<div className="mt-2 grid flex-1 grid-cols-[0.32fr_1fr] gap-2">
				<div className="space-y-1">
					<div className="h-1 rounded bg-brand-pink/20" />
					<div className="h-1 rounded bg-brand-pink/10" />
					<div className="h-1 rounded bg-brand-pink/10" />
				</div>
				<div className="space-y-1">
					<div className="h-1 rounded bg-slate-100" />
					<div className="h-1 rounded bg-slate-100" />
					<div className="h-1 w-3/4 rounded bg-slate-100" />
				</div>
			</div>
		</div>
	)
}

function TemplateCard({ slug, meta, selected, onSelect }) {
	const tags = tagsForTemplate(slug, meta)
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`min-w-0 rounded-xl border bg-white p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/35 ${
				selected
					? 'border-brand-pink shadow-md shadow-brand-pink/10 ring-1 ring-brand-pink/20'
					: 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
			}`}
		>
			<div className="relative aspect-[1.04] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
				<TemplatePreview slug={slug} meta={meta} />
				{selected ? (
					<span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-pink text-[10px] font-black text-white shadow">
						✓
					</span>
				) : null}
			</div>
			<p className={`mt-2 truncate text-[11px] font-black ${selected ? 'text-brand-pink-dark' : 'text-slate-900'}`}>
				{meta?.displayName || slug}
			</p>
			<div className="mt-1 flex flex-wrap gap-1">
				{tags.map((tag) => (
					<span key={tag} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
						{tag}
					</span>
				))}
			</div>
		</button>
	)
}

function ShelfTabs({ value, onChange }) {
	return (
		<div className="mt-3 flex gap-2" role="tablist" aria-label="Template shelf">
			{TEMPLATE_SHELF_TABS.map((tab) => {
				const active = value === tab.id
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(tab.id)}
						className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
							active
								? 'border-brand-pink bg-brand-pink text-white shadow-sm'
								: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
						}`}
					>
						{tab.label}
					</button>
				)
			})}
		</div>
	)
}

function SegmentedControl({ label, value, options, onChange }) {
	if (!options?.length) return null
	return (
		<div>
			<p className="mb-1.5 text-xs font-black text-slate-900">{label}</p>
			<div className="grid grid-flow-col auto-cols-fr overflow-hidden rounded-lg border border-slate-200 bg-white">
				{options.map((opt) => {
					const active = value === opt.id
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onChange(opt.id)}
							className={`min-h-9 border-r border-slate-200 px-2 text-[11px] font-semibold last:border-r-0 transition ${
								active ? 'bg-brand-pink/[0.10] text-brand-pink-dark' : 'text-slate-600 hover:bg-slate-50'
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

const ResumeStyling = ({
	template,
	onTemplateChange,
	availableTemplates,
	templateStyling = {},
	isLoadingTemplates,
	stylePreferences = {},
	onStylePreferenceChange,
}) => {
	const [templateShelfTab, setTemplateShelfTab] = useState('popular')
	const [recentTemplates, setRecentTemplates] = useState(() => readRecentTemplates())
	const [stylingPanelOpen, setStylingPanelOpen] = useState(
		() => typeof localStorage !== 'undefined' && localStorage.getItem('resumeEditorStylingCollapsed') !== '1',
	)

	const meta = templateStyling[template] || {}
	const modeKey = modeForMeta(meta.stylingMode)
	const mode = STYLING_MODES[modeKey]
	const visibleTemplateControls = getVisibleTemplateStyleControls(meta)
	const showMargins = templateSupportsControl(meta, 'marginPreset')
	const showLineSpacing = templateSupportsControl(meta, 'lineSpacingPreset')
	const showTypeScale = templateSupportsControl(meta, 'typeScale')
	const showFontPairing = templateSupportsControl(meta, 'fontPairing')
	const showStyleTuners = visibleTemplateControls.length > 0 && onStylePreferenceChange
	const upcomingLabels = getPlannedTemplateControls(meta).map((controlId) => STYLE_CONTROL_LABELS[controlId] || controlId)
	const selectedTemplateName = meta.displayName || template

	useEffect(() => {
		recordRecentTemplate(template)
	}, [template])

	const popularTemplates = useMemo(
		() => pickPopularTemplates(availableTemplates, templateStyling, 6),
		[availableTemplates, templateStyling],
	)

	const recentVisible = useMemo(() => {
		const available = new Set(availableTemplates || [])
		return recentTemplates.filter((slug) => available.has(slug)).slice(0, 6)
	}, [availableTemplates, recentTemplates])

	const shelfTemplates =
		templateShelfTab === 'recent'
			? recentVisible
			: templateShelfTab === 'favorites'
				? []
				: popularTemplates

	const handleShelfChange = (tabId) => {
		if (tabId === 'recent') setRecentTemplates(readRecentTemplates())
		setTemplateShelfTab(tabId)
	}

	const handleTemplateSelect = (slug) => {
		recordRecentTemplate(slug)
		onTemplateChange(slug)
	}

	const toggleStylingPanel = () => {
		setStylingPanelOpen((prev) => {
			const next = !prev
			try {
				localStorage.setItem('resumeEditorStylingCollapsed', next ? '0' : '1')
			} catch {
				//
			}
			return next
		})
	}

	return (
		<section className="@container/resume-style mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<button
				type="button"
				aria-expanded={stylingPanelOpen}
				onClick={toggleStylingPanel}
				className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/35 focus-visible:ring-inset"
			>
				<span className="min-w-0">
					<span className="block text-sm font-black text-slate-950">Resume styling</span>
					<span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
						Pick a layout, then fine-tune the look.
					</span>
					{!stylingPanelOpen ? (
						<span className="mt-1 block truncate text-[11px] font-semibold text-brand-pink-dark">{selectedTemplateName}</span>
					) : null}
				</span>
				<span className="mt-0.5 shrink-0 text-[11px] font-bold text-slate-400">{stylingPanelOpen ? 'Hide' : 'Show'}</span>
			</button>

			{stylingPanelOpen ? (
				<div className="border-t border-slate-100 px-4 pb-4 pt-3">
					<div>
						<div className="flex items-center justify-between gap-2">
							<div>
								<h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Template</h3>
								<p className="mt-0.5 text-[11px] text-slate-500">Limited choices for this draft.</p>
							</div>
							<ModeTag mode={modeKey} />
						</div>

						<ShelfTabs value={templateShelfTab} onChange={handleShelfChange} />

						{isLoadingTemplates ? (
							<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
								Loading templates...
							</div>
						) : templateShelfTab === 'favorites' && shelfTemplates.length === 0 ? (
							<div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center">
								<p className="text-xs font-bold text-slate-700">Favorites are coming soon.</p>
								<p className="mt-1 text-[11px] text-slate-500">Popular templates are ready for now.</p>
							</div>
						) : templateShelfTab === 'recent' && shelfTemplates.length === 0 ? (
							<div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center">
								<p className="text-xs font-bold text-slate-700">No recent templates yet.</p>
								<p className="mt-1 text-[11px] text-slate-500">Pick from Popular to start building this list.</p>
							</div>
						) : (
							<div className="mt-3 grid max-h-[21rem] grid-cols-2 gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable] @md/resume-style:grid-cols-3">
								{shelfTemplates.map((slug) => (
									<TemplateCard
										key={slug}
										slug={slug}
										meta={templateStyling[slug] || {}}
										selected={template === slug}
										onSelect={() => handleTemplateSelect(slug)}
									/>
								))}
							</div>
						)}
					</div>

					<div className="mt-4 border-t border-slate-200 pt-4">
						<h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Customize selected style</h3>
						<p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{mode.hint}</p>

						{meta.layoutLocked ? (
							<p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
								This layout is mostly fixed, so only safe style controls are shown.
							</p>
						) : null}

						<div className="mt-3 space-y-3">
							{showStyleTuners ? (
								<>
									{showMargins ? (
										<SegmentedControl
											label={STYLE_CONTROL_LABELS.marginPreset}
											value={stylePreferences[STYLE_PREFERENCE_KEYS.marginPreset] ?? 'balanced'}
											options={getStyleControlOptions('marginPreset', meta, { shortLabels: true })}
											onChange={(id) => onStylePreferenceChange(STYLE_PREFERENCE_KEYS.marginPreset, id)}
										/>
									) : null}
									{showLineSpacing ? (
										<SegmentedControl
											label={STYLE_CONTROL_LABELS.lineSpacingPreset}
											value={stylePreferences[STYLE_PREFERENCE_KEYS.lineSpacingPreset] ?? 'standard'}
											options={getStyleControlOptions('lineSpacingPreset', meta, { shortLabels: true })}
											onChange={(id) => onStylePreferenceChange(STYLE_PREFERENCE_KEYS.lineSpacingPreset, id)}
										/>
									) : null}
									{showTypeScale ? (
										<SegmentedControl
											label={STYLE_CONTROL_LABELS.typeScale}
											value={stylePreferences[STYLE_PREFERENCE_KEYS.typeScale] ?? 'standard'}
											options={getStyleControlOptions('typeScale', meta, { shortLabels: true })}
											onChange={(id) => onStylePreferenceChange(STYLE_PREFERENCE_KEYS.typeScale, id)}
										/>
									) : null}
									{showFontPairing ? (
										<SegmentedControl
											label={STYLE_CONTROL_LABELS.fontPairing}
											value={stylePreferences[STYLE_PREFERENCE_KEYS.fontPairing] ?? 'serif_classic'}
											options={getStyleControlOptions('fontPairing', meta, { shortLabels: true })}
											onChange={(id) => onStylePreferenceChange(STYLE_PREFERENCE_KEYS.fontPairing, id)}
										/>
									) : null}
								</>
							) : (
								<p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
									This template does not expose detailed style controls yet.
								</p>
							)}

							{onStylePreferenceChange ? (
								<SegmentedControl
									label={STYLE_CONTROL_LABELS.contactUrlDisplay}
									value={stylePreferences[STYLE_PREFERENCE_KEYS.contactUrlDisplay] ?? 'full'}
									options={getStyleControlOptions('contactUrlDisplay', meta, { shortLabels: true })}
									onChange={(id) => onStylePreferenceChange(STYLE_PREFERENCE_KEYS.contactUrlDisplay, id)}
								/>
							) : null}
						</div>

						{upcomingLabels.length > 0 ? (
							<div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
								<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Coming next</p>
								<p className="mt-1 text-[11px] text-slate-500">{upcomingLabels.join(', ')}</p>
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</section>
	)
}

export default ResumeStyling
