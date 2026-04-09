import { useState } from 'react'

function pickReasoningFeed(aiTailorResult) {
	const top = aiTailorResult?.reasoning_feed
	if (top && typeof top === 'object') {
		return { feed: top, source: 'top-level' }
	}
	const usage = aiTailorResult?.usage?.reasoning_feed
	if (usage && typeof usage === 'object') {
		return { feed: usage, source: 'usage' }
	}
	return { feed: {}, source: 'none' }
}

function TailorAssistPanel({
	tailorIntent,
	aiTailorResult,
	aiAppliedChanges,
	aiPendingChanges,
	aiRejectedChanges,
	aiTailorPhase,
	onAiUndoLastChange,
	onAiRevertAllChanges,
	onAiAcceptAllPending,
	onAiRejectAllPending,
	onAiAcceptChange,
	onAiRejectChange,
	onAiRevertSingleChange,
	onAiRevertSection,
}) {
	const [isOpen, setIsOpen] = useState(true)
	if (!tailorIntent) return null

	const hasOutput = Boolean(aiTailorResult)
	const isThinking = aiTailorPhase === 'requesting' || aiTailorPhase === 'applying'
	const showThinkingCard = isThinking && !hasOutput
	const showOutputCard = !showThinkingCard
	const keywords = (aiTailorResult?.ats_keywords || []).slice(0, 3)
	const { feed: reasoningFeed, source: reasoningSource } = pickReasoningFeed(aiTailorResult)
	const highlights = Array.isArray(reasoningFeed?.overview?.highlights) ? reasoningFeed.overview.highlights.slice(0, 6) : []
	const gaps = Array.isArray(reasoningFeed?.overview?.gaps) ? reasoningFeed.overview.gaps.slice(0, 6) : []
	const roleSignals = Array.isArray(reasoningFeed.role_signals) ? reasoningFeed.role_signals.slice(0, 4) : []
	const resumeEvidence = Array.isArray(reasoningFeed.resume_evidence_used) ? reasoningFeed.resume_evidence_used.slice(0, 3) : []
	const sectionPriorities = Array.isArray(reasoningFeed.section_priorities) ? reasoningFeed.section_priorities.slice(0, 4) : []
	const safetyNotes = Array.isArray(reasoningFeed.safety_notes) ? reasoningFeed.safety_notes.slice(0, 4) : []
	const appliedCount = Array.isArray(aiAppliedChanges) ? aiAppliedChanges.length : 0
	const pendingCount = Array.isArray(aiPendingChanges) ? aiPendingChanges.length : 0
	const rejectedCount = Array.isArray(aiRejectedChanges) ? aiRejectedChanges.length : 0
	const flaggedCount = Array.isArray(aiPendingChanges)
		? aiPendingChanges.filter((x) => String(x?.risk_level || '') === 'high').length
		: 0
	const phaseLabelMap = {
		idle: 'Ready to tailor',
		requesting: 'Analyzing role requirements...',
		applying: 'Applying safe updates...',
		reviewing: 'Ready for review',
		error: 'Tailor run failed',
	}
	const phaseLabel = phaseLabelMap[aiTailorPhase] || 'Ready'

	console.log('aiTailorResult', aiTailorResult)

	return (
		<section className="landing-hero-mesh relative mb-5 overflow-hidden rounded-xl border border-brand-pink/25 p-4 text-white shadow-[0_14px_36px_-16px_rgba(214,86,86,0.45)]">
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
			<div className="landing-hero-orb pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
			<div className="flex items-start justify-between gap-3">
				<div className="relative min-w-0">
					<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
						<span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
							<span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white/80" />
							<span className="relative h-1.5 w-1.5 rounded-full bg-white" />
						</span>
						Taylor.io Assist
					</div>
					<p className="mt-2 text-sm font-semibold text-white truncate">
						{tailorIntent.jobTitle || 'Role not set'}
						{tailorIntent.company ? ` · ${tailorIntent.company}` : ''}
					</p>
					<p className="mt-1 text-xs text-white/90">{phaseLabel}</p>
				</div>
				<button
					type="button"
					onClick={() => setIsOpen((v) => !v)}
					className="relative rounded-md border border-white/25 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
				>
					{isOpen ? 'Hide' : 'Show'}
				</button>
			</div>

			{isOpen && (
				<div className="relative mt-3 space-y-3">
					<div className="flex flex-wrap items-center gap-1.5 text-xs text-white/90">
						<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25 capitalize">
							Focus: {tailorIntent.focus || 'balanced'}
						</span>
						<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25 capitalize">
							Tone: {tailorIntent.tone || 'balanced'}
						</span>
						{tailorIntent.strictTruth ? (
							<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">Strict truth</span>
						) : null}
					</div>

					{showOutputCard ? (
						<div className="rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
							<div className="mb-2 flex items-center gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/30">
									<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m6 5H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z" />
									</svg>
								</div>
								<p className="text-xs font-semibold text-gray-900">Assist output</p>
								<span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
									reasoning: {reasoningSource}
								</span>
							</div>
							<div className="space-y-2 rounded-md bg-white p-2.5 ring-1 ring-gray-200">
								{reasoningFeed?.headline ? (
									<p className="text-xs font-semibold text-gray-900">{reasoningFeed.headline}</p>
								) : null}
								<p className="text-xs leading-relaxed">
									From the description for <span className="font-semibold">{tailorIntent.jobTitle || 'this role'}</span>, we noticed they are looking for{' '}
									<span className="font-semibold">{keywords.length ? keywords.join(', ') : 'role-relevant outcomes'}</span>.
								</p>
								<p className="text-xs leading-relaxed text-gray-700">
									Applied automatically: <span className="font-semibold">{appliedCount}</span> low-risk changes.
									{' '}Pending review: <span className="font-semibold">{pendingCount}</span>.
								</p>
								<p className="text-xs leading-relaxed text-gray-700">
									Flagged high-risk: <span className="font-semibold">{flaggedCount}</span>. Rejected: <span className="font-semibold">{rejectedCount}</span>.
								</p>
								{highlights.length > 0 ? (
									<p className="text-xs leading-relaxed text-gray-700">
										Highlights: <span className="font-semibold">{highlights.join(', ')}</span>
									</p>
								) : null}
								{gaps.length > 0 ? (
									<p className="text-xs leading-relaxed text-gray-700">
										Gaps: <span className="font-semibold">{gaps.join(', ')}</span>
									</p>
								) : null}
								{roleSignals.length > 0 ? (
									<div className="rounded border border-gray-200 bg-gray-50 p-2">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Role signals</p>
										<ul className="space-y-1 text-xs leading-relaxed text-gray-700">
											{roleSignals.map((line, idx) => (
												<li key={`${idx}-${line.slice(0, 20)}`}>- {line}</li>
											))}
										</ul>
									</div>
								) : null}
								{resumeEvidence.length > 0 ? (
									<div className="rounded border border-gray-200 bg-gray-50 p-2">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Grounded evidence</p>
										<ul className="space-y-1 text-xs leading-relaxed text-gray-700">
											{resumeEvidence.map((line, idx) => (
												<li key={`${idx}-${line.slice(0, 20)}`}>- {line}</li>
											))}
										</ul>
									</div>
								) : null}
								{sectionPriorities.length > 0 ? (
									<div className="rounded border border-gray-200 bg-gray-50 p-2">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Section priorities</p>
										<ul className="space-y-1 text-xs leading-relaxed text-gray-700">
											{sectionPriorities.map((item, idx) => (
												<li key={`${idx}-${item.section || 'section'}`}>
													- {item.section}: {item.action}
												</li>
											))}
										</ul>
									</div>
								) : null}
								{safetyNotes.length > 0 ? (
									<div className="rounded border border-amber-200 bg-amber-50 p-2">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Safety notes</p>
										<ul className="space-y-1 text-xs leading-relaxed text-amber-800">
											{safetyNotes.map((note, idx) => (
												<li key={`${idx}-${note.slice(0, 24)}`}>- {note}</li>
											))}
										</ul>
									</div>
								) : null}
								{aiTailorResult?.summary ? (
									<p className="text-xs leading-relaxed text-gray-700">{aiTailorResult.summary}</p>
								) : (
									<p className="text-xs leading-relaxed text-gray-600">
										The tailor request finished, but no summary text was returned in this run.
									</p>
								)}
							</div>

							<div className="mt-3 rounded-md bg-white p-2.5 ring-1 ring-gray-200">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Review controls</p>
								<div className="flex flex-wrap gap-2">
									<button type="button" onClick={onAiUndoLastChange} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
										Undo last
									</button>
									<button type="button" onClick={onAiRevertAllChanges} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
										Revert all AI
									</button>
									<button type="button" onClick={onAiAcceptAllPending} className="rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
										Accept all pending
									</button>
									<button type="button" onClick={onAiRejectAllPending} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
										Reject all pending
									</button>
								</div>
							</div>

							{pendingCount > 0 ? (
								<div className="mt-3 rounded-md bg-white p-2.5 ring-1 ring-gray-200">
									<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Pending review</p>
									<div className="space-y-2">
										{aiPendingChanges.slice(0, 6).map((change) => (
											<div key={change.change_id} className="rounded-md border border-gray-200 p-2">
												<div className="flex items-center justify-between gap-2">
													<p className="text-xs font-semibold text-gray-800">
														{change.section} · {change.change_type}
													</p>
													<span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
														{change.risk_level || 'medium'} · {Math.round((Number(change.confidence || 0)) * 100)}%
													</span>
												</div>
												<p className="mt-1 text-xs text-gray-600">{change.reason}</p>
												<div className="mt-2 flex flex-wrap gap-1.5">
													<button type="button" onClick={() => onAiAcceptChange(change.change_id)} className="rounded border border-green-300 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-100">
														Apply
													</button>
													<button type="button" onClick={() => onAiRejectChange(change.change_id)} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100">
														Dismiss
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							) : null}

							{appliedCount > 0 ? (
								<div className="mt-3 rounded-md bg-white p-2.5 ring-1 ring-gray-200">
									<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Applied changes</p>
									<div className="space-y-2">
										{aiAppliedChanges.slice(0, 6).map((change) => (
											<div key={change.change_id} className="rounded-md border border-gray-200 p-2">
												<div className="flex items-center justify-between gap-2">
													<p className="text-xs font-semibold text-gray-800">
														{change.section} · {change.change_type}
													</p>
													<button type="button" onClick={() => onAiRevertSingleChange(change.change_id)} className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-50">
														Revert
													</button>
												</div>
												<div className="mt-1 flex flex-wrap gap-1.5">
													<button type="button" onClick={() => onAiRevertSection(change.section)} className="rounded border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">
														Revert section
													</button>
												</div>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
					) : (
						<div className="rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
							<div className="mb-2 flex items-center gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/30">
									<svg className="h-3.5 w-3.5 animate-wave" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a3.75 3.75 0 00-3.75 3.75v.24a6.75 6.75 0 105.7 0v-.24A3.75 3.75 0 009.75 3zM14.25 3a3.75 3.75 0 013.75 3.75v.24a6.75 6.75 0 11-5.7 0v-.24A3.75 3.75 0 0114.25 3z" />
									</svg>
								</div>
								<p className="text-xs font-semibold text-gray-900">Thinking...</p>
							</div>
							<p className="text-xs leading-relaxed">
								We are reviewing your profile and identifying the entries most applicable to this role. Next, we will recommend how to prioritize and phrase your content for stronger ATS fit.
							</p>
						</div>
					)}
				</div>
			)}
		</section>
	)
}

export default TailorAssistPanel
