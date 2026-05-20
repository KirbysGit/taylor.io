// Tailor review: first-run coach card, then compact receipt while the editor takes over.
import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faCheck,
	faChevronDown,
	faChevronUp,
	faEye,
	faPenToSquare,
	faTriangleExclamation,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'

function chipClass(tone) {
	if (tone === 'safe') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
	if (tone === 'action') return 'border-brand-pink/25 bg-brand-pink/[0.08] text-brand-pink-dark'
	if (tone === 'caution') return 'border-amber-200 bg-amber-50 text-amber-800'
	return 'border-gray-200 bg-gray-50 text-gray-700'
}

function unique(items, limit = 8) {
	const out = []
	const seen = new Set()
	for (const item of items || []) {
		const text = String(item || '').trim()
		if (!text) continue
		const key = text.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		out.push(text)
		if (out.length >= limit) break
	}
	return out
}

function getGroup(details, title) {
	const match = (details || []).find((group) => String(group?.title || '').toLowerCase() === title.toLowerCase())
	return Array.isArray(match?.items) ? match.items.filter(Boolean) : []
}

function shortParagraph(text) {
	const raw = String(text || '').trim()
	if (!raw) return ''
	const sentences = raw.match(/[^.!?]+[.!?]+/g) || [raw]
	return sentences.slice(0, 3).join(' ').trim()
}

function RowList({ items, tone = 'positive' }) {
	if (!items.length) return null
	const toneClass =
		tone === 'warning'
			? 'border-amber-200 bg-amber-50 text-amber-700'
			: 'border-emerald-200 bg-emerald-50 text-emerald-700'
	const icon = tone === 'warning' ? faTriangleExclamation : faCheck
	return (
		<ul className="space-y-1.5">
			{items.map((item, i) => (
				<li key={`${item}-${i}`} className="flex min-w-0 items-start gap-2 text-xs leading-snug text-gray-700">
					<span className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${toneClass}`}>
						<FontAwesomeIcon icon={icon} />
					</span>
					<span className="min-w-0 break-words">{item}</span>
				</li>
			))}
		</ul>
	)
}

function ReviewSection({ title, children }) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-3">
			<p className="text-[11px] font-black uppercase tracking-wide text-gray-900">{title}</p>
			<div className="mt-2">{children}</div>
		</div>
	)
}

function buildReviewData(tailorIntent, aiTailorResult) {
	const explanation = aiTailorResult?.tailorExplanation || {}
	const details = Array.isArray(explanation.details) ? explanation.details : []
	const evidence = explanation.evidence || {}
	const warnings = Array.isArray(aiTailorResult?.warnings) ? aiTailorResult.warnings : []
	const changeReasons = Array.isArray(aiTailorResult?.changeReasons) ? aiTailorResult.changeReasons : []
	const changeReasonLines = changeReasons
		.map((row) => (typeof row === 'string' ? row : row && typeof row.reason === 'string' ? row.reason : ''))
		.filter((t) => String(t).trim().length > 0)

	const prioritized = unique(
		[
			...(Array.isArray(evidence.jobPriorityTerms) ? evidence.jobPriorityTerms : []),
			...(Array.isArray(evidence.matchedTerms) ? evidence.matchedTerms : []),
			...getGroup(details, 'Why it changed')
				.join(' ')
				.replace(/^Target story:/i, '')
				.split(/,| and |\./)
				.map((x) => x.trim())
				.filter((x) => x.length > 3 && x.length < 32),
		],
		7
	)

	return {
		targetLabel: `${tailorIntent?.jobTitle || 'Tailored draft'}${tailorIntent?.company ? ` - ${tailorIntent.company}` : ''}`,
		paragraph: shortParagraph(explanation.paragraph || aiTailorResult?.summary),
		chips: Array.isArray(explanation.chips) ? explanation.chips : [],
		prioritized,
		spotlighted: unique(getGroup(details, 'What I spotlighted'), 5),
		trimmed: unique(getGroup(details, 'What I trimmed'), 6),
		beforeSend: unique(getGroup(details, 'Worth checking'), 4),
		warnings,
		changeReasonLines,
	}
}

function TailorAssistPanel({
	tailorIntent,
	aiTailorResult,
	aiTailorPhase,
	tailorLayoutPreview,
	onShowTailorFinalLayout = () => {},
	mode = 'expanded',
	onContinue = () => {},
	onReopen = () => {},
}) {
	const [detailsOpen, setDetailsOpen] = useState(false)
	const review = useMemo(() => buildReviewData(tailorIntent, aiTailorResult), [tailorIntent, aiTailorResult])
	if (!tailorIntent) return null

	const phaseLabelMap = {
		idle: 'Ready to tailor',
		requesting: 'Building your tailored draft...',
		reviewing: 'Your tailored draft is ready.',
		error: 'Tailor run failed',
	}
	const phaseLabel = phaseLabelMap[aiTailorPhase] || 'Ready'
	const isReady = aiTailorPhase === 'reviewing'
	const isCollapsed = mode === 'collapsed' && isReady
	const fallbackParagraph =
		'Taylor applied a tailored draft to the editor. Review the main changes, then keep editing like normal.'

	if (isCollapsed) {
		return (
			<button
				type="button"
				onClick={onReopen}
				className="mb-4 flex w-full items-center gap-3 rounded-xl border border-brand-pink/20 bg-white p-3 text-left shadow-sm transition hover:border-brand-pink/40 hover:bg-brand-pink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/30"
			>
				<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.10] text-brand-pink">
					<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-xs font-black text-gray-950">Taylor tailored this draft</span>
					<span className="mt-0.5 block truncate text-[11px] font-medium text-gray-500">{review.targetLabel}</span>
				</span>
				<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-bold text-gray-600">
					View review
					<FontAwesomeIcon icon={faChevronDown} className="size-2.5" />
				</span>
			</button>
		)
	}

	return (
		<section className="mb-5 overflow-hidden rounded-xl border border-brand-pink/15 bg-[#fffafa] shadow-[0_16px_34px_-24px_rgba(214,86,86,0.55)]">
			<div className="border-b border-brand-pink/10 bg-white px-4 py-3">
				<div className="flex items-start gap-3">
					<div className="relative shrink-0">
						<div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink/20 to-rose-100 text-brand-pink ring-1 ring-brand-pink/20">
							<FontAwesomeIcon icon={faWandMagicSparkles} className="size-5" />
						</div>
						<span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white ring-2 ring-white">
							<FontAwesomeIcon icon={faCheck} />
						</span>
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex min-w-0 items-center gap-2">
							<h2 className="truncate text-sm font-black text-gray-950">Taylor's Review</h2>
							<span className="rounded-full bg-brand-pink/[0.10] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-pink-dark">
								AI
							</span>
						</div>
						<p className="mt-0.5 truncate text-[11px] font-semibold text-brand-pink-dark">{review.targetLabel}</p>
						<p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
							<FontAwesomeIcon icon={faCheck} className="size-2.5" />
							{phaseLabel}
						</p>
					</div>
				</div>

				{aiTailorPhase === 'requesting' ? (
					<div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
						<p className="text-xs font-semibold text-gray-900">Taylor is reading the role and your profile.</p>
						<p className="mt-1 text-xs leading-relaxed text-gray-600">
							Building a draft that prioritizes the strongest matching evidence.
						</p>
					</div>
				) : null}

				{aiTailorPhase === 'error' ? (
					<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
						<p className="text-xs font-semibold">Something went wrong</p>
						<p className="mt-1 text-xs">Try again from the tailor setup step.</p>
					</div>
				) : null}

				{isReady ? (
					<p className="mt-3 text-xs leading-relaxed text-gray-700">{review.paragraph || fallbackParagraph}</p>
				) : null}
			</div>

			{isReady ? (
				<div className="space-y-3 p-3">
					{review.chips.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{review.chips.map((chip, i) => (
								<span
									key={`${chip.label || 'chip'}-${i}`}
									className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${chipClass(chip.tone)}`}
								>
									{chip.label}
								</span>
							))}
						</div>
					) : null}

					{review.prioritized.length > 0 ? (
						<ReviewSection title="What I prioritized">
							<div className="flex flex-wrap gap-1.5">
								{review.prioritized.map((item, i) => (
									<span key={`${item}-${i}`} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-700">
										{item}
									</span>
								))}
							</div>
						</ReviewSection>
					) : null}

					{review.spotlighted.length > 0 ? (
						<ReviewSection title="What I spotlighted">
							<RowList items={review.spotlighted} />
						</ReviewSection>
					) : null}

					{review.trimmed.length > 0 ? (
						<ReviewSection title="What I moved lower">
							<RowList items={review.trimmed} tone="warning" />
						</ReviewSection>
					) : null}

					{review.beforeSend.length > 0 ? (
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
							<p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">
								<FontAwesomeIcon icon={faTriangleExclamation} className="size-3" />
								Before you send
							</p>
							<ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
								{review.beforeSend.map((item, i) => (
									<li key={`${item}-${i}`}>{item}</li>
								))}
							</ul>
						</div>
					) : null}

					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => {
								if (tailorLayoutPreview === 'compare') onShowTailorFinalLayout()
								onContinue()
							}}
							className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-pink px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40"
						>
							<FontAwesomeIcon icon={faEye} className="size-3" />
							Review resume
						</button>
						<button
							type="button"
							onClick={onContinue}
							className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/25"
						>
							<FontAwesomeIcon icon={faPenToSquare} className="size-3" />
							Keep editing
						</button>
					</div>

					{review.warnings.length > 0 || review.changeReasonLines.length > 0 ? (
						<div className="border-t border-gray-200 pt-2">
							<button
								type="button"
								onClick={() => setDetailsOpen((v) => !v)}
								className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/25"
								aria-expanded={detailsOpen}
							>
								<span>{detailsOpen ? 'Hide technical audit' : 'See what changed'}</span>
								<FontAwesomeIcon icon={detailsOpen ? faChevronUp : faChevronDown} className="size-3" />
							</button>
							{detailsOpen ? (
								<div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
									{review.warnings.length > 0 ? (
										<>
											<p className="text-[11px] font-black uppercase tracking-wide text-amber-800">Technical audit</p>
											<ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-gray-700">
												{review.warnings.map((w, i) => (
													<li key={`${w}-${i}`}>- {w}</li>
												))}
											</ul>
										</>
									) : null}
									{review.changeReasonLines.length > 0 ? (
										<>
											<p className={`${review.warnings.length ? 'mt-3' : ''} text-[11px] font-black uppercase tracking-wide text-gray-800`}>
												Change log
											</p>
											<ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-gray-700">
												{review.changeReasonLines.slice(0, 8).map((line, i) => (
													<li key={`${line}-${i}`}>- {line}</li>
												))}
											</ul>
										</>
									) : null}
								</div>
							) : null}
						</div>
					) : null}
				</div>
			) : null}
		</section>
	)
}

export default TailorAssistPanel
