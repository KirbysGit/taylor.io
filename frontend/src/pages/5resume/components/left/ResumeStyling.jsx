// components / left / ResumeStyling.jsx

// Tab strip: Template (picker + template-specific tokens) vs Format (global output rules for all layouts).

import { useEffect, useState } from 'react'

const STYLING_SECTION_TABS = [
	{ id: 'template', label: 'Template' },
	{ id: 'format', label: 'Format' },
]

const STYLING_MODES = {
	themeable: {
		label: 'Themeable',
		tagClass: 'bg-brand-pink/12 text-brand-pink border-brand-pink/20',
		hint: 'Adjust type size, fonts, margins, and line spacing below. Preview, PDF update, and Word use the same token set.',
	},
	hybrid: {
		label: 'Hybrid',
		tagClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
		hint: 'Layout is fixed; only the options below change how this template prints.',
	},
	locked: {
		label: 'Fixed',
		tagClass: 'bg-gray-100 text-gray-600 border-gray-200',
		hint: 'This template keeps a curated look. Style options are limited.',
	},
}

function modeForMeta(stylingMode) {
	return STYLING_MODES[stylingMode] ? stylingMode : 'themeable'
}

function ModeGlyph({ mode, className = 'w-3.5 h-3.5' }) {
	const cn = `${className} shrink-0`
	if (mode === 'themeable') {
		return (
			<svg className={cn} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
				<path d="M8 1.5a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 8 1.5zM4.5 4.5a.75.75 0 0 1 0 1.06l-.88.88a.75.75 0 1 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 0zM1.5 8a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H2.25A.75.75 0 0 1 1.5 8zm9.94 2.56a.75.75 0 1 0-1.06 1.06l.88.88a.75.75 0 1 0 1.06-1.06l-.88-.88zM8 12.25a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V13a.75.75 0 0 1 .75-.75zm4.25-6.5a.75.75 0 0 1-.75-.75V4.25a.75.75 0 0 1 1.5 0V5a.75.75 0 0 1-.75.75z" />
				<path d="M8 5.25A2.75 2.75 0 1 0 8 10.75 2.75 2.75 0 0 0 8 5.25z" opacity=".35" />
			</svg>
		)
	}
	if (mode === 'hybrid') {
		return (
			<svg className={cn} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
				<path d="M2 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm0 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9zm7-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3zm0 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V7z" />
			</svg>
		)
	}
	return (
		<svg className={cn} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
			<path
				fillRule="evenodd"
				d="M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm1 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
				clipRule="evenodd"
			/>
			<path d="M8 6.5a1.5 1.5 0 0 0-1.415 1H5.5a.5.5 0 0 0 0 1h1.085A1.5 1.5 0 1 0 8 6.5z" />
		</svg>
	)
}

function ModeTag({ mode, size = 'sm' }) {
	const m = STYLING_MODES[mode]
	const isSmall = size === 'sm'
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border font-semibold tabular-nums backdrop-blur-[2px] ${
				isSmall ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
			} ${m.tagClass}`}
		>
			<ModeGlyph mode={mode} className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
			{m.label}
		</span>
	)
}

function StylingTabStrip({ value, onChange }) {
	return (
		<div
			className="flex gap-1 border-b border-slate-200/80 bg-slate-50/90 px-3 py-2.5"
			role="tablist"
			aria-label="Resume styling sections"
		>
			{STYLING_SECTION_TABS.map((tab) => {
				const active = value === tab.id
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={active}
						id={`resume-styling-tab-${tab.id}`}
						onClick={() => onChange(tab.id)}
						className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 focus-visible:ring-offset-2 ${
							active
								? 'bg-white text-brand-pink-dark shadow-sm shadow-slate-200/40 ring-1 ring-slate-200/80'
								: 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
						}`}
					>
						{tab.label}
					</button>
				)
			})}
		</div>
	)
}

/** Single-track segmented control — reads as one control, not loose chips. */
function SegmentedRow({ label, value, options, onChange }) {
	return (
		<div className="rounded-xl border border-slate-200/70 bg-white/95 p-3 shadow-sm shadow-slate-200/30 ring-1 ring-black/[0.02]">
			<div className="mb-2.5 flex items-center gap-2">
				<span
					className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark shadow-sm shadow-brand-pink/30"
					aria-hidden
				/>
				<span className="text-xs font-semibold tracking-tight text-slate-700">{label}</span>
			</div>
			<div
				className="flex w-full gap-0.5 rounded-[10px] bg-slate-100/90 p-1 ring-1 ring-inset ring-slate-200/50"
				role="group"
				aria-label={label}
			>
				{options.map((opt) => {
					const active = value === opt.id
					return (
						<button
							key={opt.id}
							type="button"
							onClick={() => onChange(opt.id)}
							className={`min-w-0 flex-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
								active
									? 'bg-white text-brand-pink-dark shadow-md shadow-slate-300/25 ring-1 ring-slate-200/90'
									: 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
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

function LookSpacingIcon({ className = 'w-3.5 h-3.5' }) {
	return (
		<svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
			<path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 1-1 0v-1zm12 0A1.5 1.5 0 0 0 12.5 2h-1a.5.5 0 0 0 0 1h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 0 1 0v-1zM3.5 14h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 0-1 0v1A1.5 1.5 0 0 0 3.5 14zm9.5-1.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 1 1 0zM8 4.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 8 4.75zM5.25 8a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 5.25 8z" />
		</svg>
	)
}

function LinkFormatIcon({ className = 'w-3.5 h-3.5' }) {
	return (
		<svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
			<path d="M6.879 7.121a3 3 0 0 1 4.243 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 0-1.414 0L7.586 9.586a1 1 0 1 1-1.414-1.414l.707-.707zm2.242 1.758a1 1 0 0 1 1.414 0l.707.707a3 3 0 0 1-4.243 4.243l-1.415 1.414a1 1 0 1 1-1.414-1.414l1.414-1.415a1 1 0 0 0 0-1.414 1 1 0 0 1 1.414-1.414z" />
			<path d="M9.121 6.879a3 3 0 0 0-4.243 0L3.465 8.293a1 1 0 1 0 1.414 1.414l1.415-1.415a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a3 3 0 1 1 4.242-4.243z" opacity=".45" />
		</svg>
	)
}

const MARGIN_OPTIONS = [
	{ id: 'balanced', label: 'Balanced' },
	{ id: 'tight', label: 'Tight' },
	{ id: 'spacious', label: 'Spacious' },
]

const LINE_SPACING_OPTIONS = [
	{ id: 'standard', label: 'Standard' },
	{ id: 'compact', label: 'Compact' },
	{ id: 'relaxed', label: 'Relaxed' },
]

const TYPE_SCALE_OPTIONS = [
	{ id: 'standard', label: 'Standard' },
	{ id: 'compact', label: 'Smaller' },
	{ id: 'large', label: 'Larger' },
]

const FONT_PAIRING_OPTIONS = [
	{ id: 'serif_classic', label: 'Serif classic' },
	{ id: 'calibri_modern', label: 'Calibri modern' },
]

/** Global: LinkedIn / GitHub / portfolio labels (backend still emits full href). */
const CONTACT_URL_DISPLAY_OPTIONS = [
	{ id: 'full', label: 'Full URL' },
	{ id: 'strip_protocol', label: 'Hide https://' },
]

/** Control IDs listed in meta but not implemented yet — show under “Coming”. */
const PLANNED_CONTROL_IDS = []

const ResumeStyling = ({
	template,
	onTemplateChange,
	availableTemplates,
	templateStyling = {},
	isLoadingTemplates,
	stylePreferences = {},
	onStylePreferenceChange,
}) => {
	const [sectionTab, setSectionTab] = useState('template')

	const meta = templateStyling[template] || {}
	const allowed = meta.allowedControls ?? []
	const modeKey = modeForMeta(meta.stylingMode)
	const mode = STYLING_MODES[modeKey]

	const showMargins = allowed.includes('marginPreset')
	const showLineSpacing = allowed.includes('lineSpacingPreset')
	const showTypeScale = allowed.includes('typeScale')
	const showFontPairing = allowed.includes('fontPairing')
	const showStyleTuners =
		showMargins || showLineSpacing || showTypeScale || showFontPairing

	const upcomingLabels = PLANNED_CONTROL_IDS.filter((id) => allowed.includes(id))

	const hasStyleControls =
		(showStyleTuners && onStylePreferenceChange) || upcomingLabels.length > 0
	const showCustomizeRow = hasStyleControls || meta.layoutLocked

	const templateScroll = availableTemplates.length > 3

	const [customizeOpen, setCustomizeOpen] = useState(() => showStyleTuners)

	// Whole panel (template + format) can tuck away so the left column focuses on resume fields.
	const [stylingPanelOpen, setStylingPanelOpen] = useState(
		() => typeof localStorage !== 'undefined' && localStorage.getItem('resumeEditorStylingCollapsed') !== '1',
	)

	useEffect(() => {
		const m = templateStyling[template] || {}
		const a = m.allowedControls ?? []
		const hasLive =
			a.includes('marginPreset') ||
			a.includes('lineSpacingPreset') ||
			a.includes('typeScale') ||
			a.includes('fontPairing')
		setCustomizeOpen(hasLive)
	}, [template, templateStyling])

	const templateDisplayName = meta.displayName || template

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
		<div className="@container/resume-style mb-5 overflow-hidden rounded-2xl border border-slate-200/75 bg-gradient-to-b from-white via-white to-slate-50/50 shadow-md shadow-slate-200/45 ring-1 ring-black/[0.03]">
			<button
				type="button"
				id="resume-styling-panel-toggle"
				aria-expanded={stylingPanelOpen}
				aria-controls="resume-styling-panel-body"
				onClick={toggleStylingPanel}
				className={[
					'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 focus-visible:ring-inset rounded-t-[0.9375rem]',
					!stylingPanelOpen ? 'rounded-b-[0.9375rem]' : '',
				].join(' ')}
			>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="text-sm font-semibold tracking-tight text-slate-800">Resume styling</span>
						<span className="rounded-full bg-slate-100/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
							Template &amp; format
						</span>
					</span>
					{!stylingPanelOpen ? (
						<p className="mt-1 truncate text-[11px] text-slate-500" title={`${templateDisplayName} (${sectionTab})`}>
							{templateDisplayName}
							<span className="text-slate-400"> · </span>
							{sectionTab === 'format' ? 'Format' : 'Template'}
						</p>
					) : null}
				</span>
				<span className="flex shrink-0 items-center gap-1.5">
					<span className="text-[11px] font-medium text-slate-400">{stylingPanelOpen ? 'Hide' : 'Show'}</span>
					<svg
						className={`h-4 w-4 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${
							stylingPanelOpen ? 'rotate-180' : ''
						}`}
						viewBox="0 0 16 16"
						fill="currentColor"
						aria-hidden
					>
						<path d="M4.47 6.97a.75.75 0 0 1 1.06 0L8 9.44l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06z" />
					</svg>
				</span>
			</button>

			<div
				className="h-px w-full bg-gradient-to-r from-brand-pink/80 via-brand-pink-light/90 to-transparent"
				aria-hidden
			/>

			<div
				id="resume-styling-panel-body"
				className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none motion-reduce:duration-150"
				style={{ gridTemplateRows: stylingPanelOpen ? '1fr' : '0fr' }}
			>
				<div className="min-h-0 overflow-hidden">
					<StylingTabStrip value={sectionTab} onChange={setSectionTab} />

			{sectionTab === 'format' && onStylePreferenceChange && (
				<div
					className="border-b border-slate-100/90 bg-white/50 px-4 py-4"
					role="tabpanel"
					aria-labelledby="resume-styling-tab-format"
				>
					<div className="mb-3">
						<h2 className="text-sm font-semibold tracking-tight text-slate-800">Format</h2>
						<p className="mt-1 text-[11px] leading-relaxed text-slate-500">
							How text appears in preview, PDF, and Word—same choices for every template.
						</p>
					</div>
					<div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 via-white to-sky-50/40 p-3 shadow-inner shadow-slate-200/30">
						<div className="mb-3 flex items-center gap-2 px-0.5">
							<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-800">
								<LinkFormatIcon className="h-4 w-4" />
							</span>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
									Contact links
								</p>
								<p className="text-[10px] text-slate-400">LinkedIn, GitHub, portfolio line — links still work</p>
							</div>
						</div>
						<SegmentedRow
							label="URL text"
							value={stylePreferences.contactUrlDisplay ?? 'full'}
							options={CONTACT_URL_DISPLAY_OPTIONS}
							onChange={(id) => onStylePreferenceChange('contactUrlDisplay', id)}
						/>
					</div>
				</div>
			)}

			{sectionTab === 'template' && (
				<>
					<div className="border-b border-slate-100/90 bg-white/40 px-4 py-4 backdrop-blur-[2px]">
						<div className="flex items-baseline justify-between gap-2">
							<h2 className="text-sm font-semibold tracking-tight text-slate-800">Templates</h2>
							<span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Choose</span>
						</div>
						<p className="mt-1 text-[11px] leading-relaxed text-slate-500">
							Favorites &amp; recents will live here later—for now, select a layout.
						</p>
						{isLoadingTemplates ? (
							<div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
								<span className="h-3.5 w-3.5 animate-pulse rounded-full bg-slate-200" aria-hidden />
								Loading…
							</div>
						) : (
							<div
								className={
									templateScroll
										? 'mt-3 grid max-h-44 grid-cols-1 gap-2.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]'
										: 'mt-3 grid grid-cols-1 gap-2.5'
								}
							>
								{availableTemplates.map((t) => {
									const rowMeta = templateStyling[t] || {}
									const rowMode = modeForMeta(rowMeta.stylingMode)
									const label = rowMeta.displayName || t
									const selected = template === t
									return (
										<button
											key={t}
											type="button"
											onClick={() => onTemplateChange(t)}
											className={`flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 focus-visible:ring-offset-2 ${
												selected
													? 'border-2 border-brand-pink/90 bg-gradient-to-r from-brand-pink/[0.12] to-brand-pink/[0.06] shadow-md shadow-brand-pink/10'
													: 'border border-slate-200/80 bg-white/90 shadow-sm hover:border-slate-300 hover:shadow-md'
											}`}
										>
											<span
												className={`min-w-0 truncate text-sm font-semibold ${
													selected ? 'text-brand-pink-dark' : 'text-slate-800'
												}`}
											>
												{label}
											</span>
											<ModeTag mode={rowMode} size="sm" />
										</button>
									)
								})}
							</div>
						)}
					</div>

					{!isLoadingTemplates && showCustomizeRow && (
						<div className="p-4" role="tabpanel" aria-labelledby="resume-styling-tab-template">
							<button
								type="button"
								onClick={() => setCustomizeOpen((o) => !o)}
								className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/35 focus-visible:ring-offset-2 ${
									customizeOpen
										? 'border-brand-pink/25 bg-gradient-to-r from-white to-brand-pink/[0.06] shadow-md'
										: 'border-slate-200/80 bg-gradient-to-r from-white to-slate-50/90 hover:border-slate-300 hover:shadow-md'
								}`}
								aria-expanded={customizeOpen}
							>
								<span
									className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
										customizeOpen
											? 'border-brand-pink/30 bg-brand-pink/10 text-brand-pink-dark'
											: 'border-slate-200/90 bg-white text-slate-600 group-hover:border-slate-300'
									}`}
								>
									<ModeGlyph mode={modeKey} className="h-4 w-4" />
								</span>
								<div className="flex min-w-0 flex-wrap items-center gap-2">
									<ModeTag mode={modeKey} size="md" />
								</div>
								<span className="min-w-0 flex-1 text-xs font-medium text-slate-500">Template style</span>
								<svg
									className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
										customizeOpen ? 'rotate-180' : ''
									}`}
									viewBox="0 0 16 16"
									fill="currentColor"
									aria-hidden
								>
									<path d="M4.47 6.97a.75.75 0 0 1 1.06 0L8 9.44l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06z" />
								</svg>
							</button>

							{customizeOpen && (
								<div className="mt-4 space-y-4">
									<p className="rounded-xl border border-brand-pink/15 bg-gradient-to-br from-brand-pink/[0.06] to-transparent px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
										{mode.hint}
									</p>
									{meta.layoutLocked ? (
										<p className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-amber-50/30 px-3 py-2.5 text-[11px] font-medium text-amber-950/80">
											Layout is fixed; only the controls here affect PDF and Word output.
										</p>
									) : null}

									{showStyleTuners && onStylePreferenceChange && (
										<div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 via-white to-brand-pink/[0.04] p-3 shadow-inner shadow-slate-200/30">
											<div className="mb-3 flex items-center gap-2 px-0.5">
												<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-pink/10 text-brand-pink-dark">
													<LookSpacingIcon className="h-4 w-4" />
												</span>
												<div>
													<p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
														Look &amp; spacing
													</p>
													<p className="text-[10px] text-slate-400">This template only</p>
												</div>
											</div>
											<div className="grid grid-cols-1 gap-3 @md/resume-style:grid-cols-2 @md/resume-style:gap-x-3 @md/resume-style:gap-y-4">
												{showTypeScale && (
													<div className="min-w-0">
														<SegmentedRow
															label="Type scale"
															value={stylePreferences.typeScalePreset ?? 'standard'}
															options={TYPE_SCALE_OPTIONS}
															onChange={(id) => onStylePreferenceChange('typeScalePreset', id)}
														/>
													</div>
												)}
												{showFontPairing && (
													<div className="min-w-0">
														<SegmentedRow
															label="Fonts"
															value={stylePreferences.fontPairing ?? 'serif_classic'}
															options={FONT_PAIRING_OPTIONS}
															onChange={(id) => onStylePreferenceChange('fontPairing', id)}
														/>
													</div>
												)}
												{showMargins && (
													<div className="min-w-0">
														<SegmentedRow
															label="Page margins"
															value={stylePreferences.marginPreset ?? 'balanced'}
															options={MARGIN_OPTIONS}
															onChange={(id) => onStylePreferenceChange('marginPreset', id)}
														/>
													</div>
												)}
												{showLineSpacing && (
													<div className="min-w-0">
														<SegmentedRow
															label="Line spacing"
															value={stylePreferences.lineSpacingPreset ?? 'standard'}
															options={LINE_SPACING_OPTIONS}
															onChange={(id) => onStylePreferenceChange('lineSpacingPreset', id)}
														/>
													</div>
												)}
											</div>
										</div>
									)}

									{upcomingLabels.length > 0 ? (
										<div className="rounded-xl border border-dashed border-slate-300/80 bg-white/60 px-3 py-2.5">
											<p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
												Coming for this template
											</p>
											<ul className="list-inside list-disc space-y-0.5 text-xs text-slate-500 marker:text-slate-300">
												{upcomingLabels.map((text) => (
													<li key={text}>{text}</li>
												))}
											</ul>
										</div>
									) : null}

									{!hasStyleControls && !meta.layoutLocked && modeKey === 'locked' ? (
										<p className="text-xs text-slate-500">No adjustable style options for this template.</p>
									) : null}
								</div>
							)}
						</div>
					)}

					{!isLoadingTemplates && !showCustomizeRow && (
						<div className="px-4 pb-4 pt-0">
							<p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
								This template does not expose template-specific style tweaks in Tailor yet. Use the{' '}
								<strong className="font-semibold text-slate-700">Format</strong> tab for options that apply to
								all layouts.
							</p>
						</div>
					)}
				</>
			)}
				</div>
			</div>
		</div>
	)
}

export default ResumeStyling
