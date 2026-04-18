// Tailor flow: shows intent + status. Full resume merge happens in ResumePreview (no per-change patch UI yet).

function TailorAssistPanel({ tailorIntent, aiTailorResult, aiTailorPhase }) {
	if (!tailorIntent) return null

	const phaseLabelMap = {
		idle: 'Ready to tailor',
		requesting: 'Generating tailored draft…',
		reviewing: 'Draft loaded — edit below',
		error: 'Tailor run failed',
	}
	const phaseLabel = phaseLabelMap[aiTailorPhase] || 'Ready'
	const genSummary = aiTailorResult?.genSummary || aiTailorResult?.summary
	const warnings = Array.isArray(aiTailorResult?.warnings) ? aiTailorResult.warnings : []

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
				{tailorIntent.strictTruth ? (
					<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">Strict truth</span>
				) : null}
			</div>

			{aiTailorPhase === 'reviewing' ? (
				<div className="relative mt-3 rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
					{genSummary ? (
						<p className="text-xs leading-relaxed text-gray-700">{genSummary}</p>
					) : (
						<p className="text-xs leading-relaxed text-gray-600">
							Tailored resume content was applied to the editor. A short summary was not included in this response.
						</p>
					)}
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
