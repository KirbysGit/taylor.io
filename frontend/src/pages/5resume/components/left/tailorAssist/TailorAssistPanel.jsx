// Tailor flow: shows intent + status. Full resume merge happens in ResumePreview (no per-change patch UI yet).
import { useState } from 'react'

function labelize(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
}

function chipClass(tone) {
	if (tone === 'safe') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
	if (tone === 'action') return 'border-brand-pink/25 bg-brand-pink/[0.08] text-brand-pink-dark'
	if (tone === 'caution') return 'border-amber-200 bg-amber-50 text-amber-800'
	return 'border-gray-200 bg-gray-50 text-gray-700'
}

function TailorAssistPanel({
	tailorIntent,
	aiTailorResult,
	aiTailorPhase,
	tailorLayoutPreview,
	onShowTailorFinalLayout = () => {},
}) {
	const [detailsOpen, setDetailsOpen] = useState(false)
	if (!tailorIntent) return null

	const phaseLabelMap = {
		idle: 'Ready to tailor',
		requesting: 'Generating tailored draft…',
		reviewing: 'Draft loaded — edit below',
		error: 'Tailor run failed',
	}
	const phaseLabel = phaseLabelMap[aiTailorPhase] || 'Ready'
	const tailorExplanation = aiTailorResult?.tailorExplanation
	const explanationParagraph = tailorExplanation?.paragraph || aiTailorResult?.summary
	const explanationChips = Array.isArray(tailorExplanation?.chips) ? tailorExplanation.chips : []
	const warnings = Array.isArray(aiTailorResult?.warnings) ? aiTailorResult.warnings : []
	const changeReasons = Array.isArray(aiTailorResult?.changeReasons) ? aiTailorResult.changeReasons : []
	const changeReasonLines = changeReasons
		.map((row) =>
			typeof row === 'string' ? row : row && typeof row.reason === 'string' ? row.reason : ''
		)
		.filter((t) => String(t).trim().length > 0)

	return (
		<section className="landing-hero-mesh relative mb-5 overflow-hidden rounded-xl border border-brand-pink/25 p-4 text-white shadow-[0_14px_36px_-16px_rgba(214,86,86,0.45)]">
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
			<div className="landing-hero-orb pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
			<div className="relative min-w-0">
				<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
					<span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
						<span className="relative h-1.5 w-1.5 rounded-full bg-white" />
					</span>
					Tailor Assist
				</div>
				<p className="mt-2 truncate text-sm font-semibold text-white">
					{tailorIntent.jobTitle || 'Role not set'}
					{tailorIntent.company ? ` · ${tailorIntent.company}` : ''}
				</p>
				<p className="mt-1 text-xs text-white/90">{phaseLabel}</p>
			</div>

			<div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-xs text-white/90">
				<span className="rounded bg-white/15 px-2 py-0.5 capitalize ring-1 ring-white/25">
					Focus: {tailorIntent.focus || 'balanced'}
				</span>
				<span className="rounded bg-white/15 px-2 py-0.5 capitalize ring-1 ring-white/25">
					Tone: {tailorIntent.tone || 'balanced'}
				</span>
				<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">
					Length: {labelize(tailorIntent.lengthTarget || 'balanced')}
				</span>
				<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">
					Rewrite: {labelize(tailorIntent.rewriteFreedom || 'balanced')}
				</span>
				{tailorIntent.strictTruth ? (
					<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">Strict truth</span>
				) : null}
			</div>

			{aiTailorPhase === 'reviewing' ? (
				<div className="relative mt-3 rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
					{explanationParagraph ? (
						<p className="text-xs leading-relaxed text-gray-700">{explanationParagraph}</p>
					) : (
						<p className="text-xs leading-relaxed text-gray-600">
							Tailored resume content was applied to the editor. A short summary was not included in this response.
						</p>
					)}
					{explanationChips.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-1.5">
							{explanationChips.map((chip, i) => (
								<span
									key={`${chip.label || 'chip'}-${i}`}
									className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chipClass(chip.tone)}`}
								>
									{chip.label}
								</span>
							))}
						</div>
					) : null}
					{changeReasonLines.length > 0 ? (
						<div className="mt-2 border-t border-gray-200/80 pt-2">
							<button
								type="button"
								onClick={() => setDetailsOpen((v) => !v)}
								className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 transition hover:text-brand-pink-dark"
								aria-expanded={detailsOpen}
							>
								{detailsOpen ? 'Hide details' : 'Show details'}
							</button>
							{detailsOpen ? (
								<ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-700">
									{changeReasonLines.map((line, i) => (
										<li key={i}>{line}</li>
									))}
								</ul>
							) : null}
						</div>
					) : null}
					{warnings.length > 0 ? (
						<div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2">
							<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">Notes</p>
							<ul className="space-y-1 text-xs leading-relaxed text-amber-900">
								{warnings.map((w, i) => (
									<li key={i}>- {w}</li>
								))}
							</ul>
						</div>
					) : null}
					{tailorLayoutPreview === 'compare' ? (
						<div className="mt-3 border-t border-gray-200/80 pt-3">
							<p className="text-xs text-gray-700">
								Like what you see? You can open a print-accurate view that matches your PDF download.
							</p>
							<button
								type="button"
								onClick={onShowTailorFinalLayout}
								className="mt-2 w-full rounded-lg border border-brand-pink/50 bg-white px-3 py-2 text-center text-sm font-semibold text-brand-pink shadow-sm transition hover:bg-brand-pink/10"
							>
								Show print layout
							</button>
						</div>
					) : null}
				</div>
			) : null}

			{aiTailorPhase === 'requesting' ? (
				<div className="relative mt-3 rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
					<p className="text-xs font-semibold text-gray-900">Working…</p>
					<p className="mt-1 text-xs leading-relaxed text-gray-700">
						Building a tailored draft from your profile and the job description.
					</p>
				</div>
			) : null}

			{aiTailorPhase === 'error' ? (
				<div className="relative mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
					<p className="text-xs font-semibold">Something went wrong</p>
					<p className="mt-1 text-xs">Try again from the tailor setup step.</p>
				</div>
			) : null}
		</section>
	)
}

export default TailorAssistPanel
