// Decorative pipeline glob + résumé mock for the landing hero

import {
	faAward,
	faBriefcase,
	faCheck,
	faCode,
	faCube,
	faGraduationCap,
	faPhone,
	faPalette,
	faStar,
	faTag,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** Pipeline + résumé mock icons — Font Awesome for optically centered, app-wide consistent glyphs */
const faPipelineBadge = 'size-[1.125rem]'

/** Light placeholder rail — one thickness, kept faint so glass stays dominant */
function PhCapsule(props) {
	return (
		<span
			aria-hidden
			style={props.style}
			className={`block shrink-0 rounded-full bg-neutral-400/[0.26] ${props.h ?? 'h-[5px]'} ${props.className ?? ''}`}
		/>
	)
}

/** Ellipsis — same ink as rails */
function PhDots(props) {
	return (
		<span className={`inline-flex items-center gap-1.5 ${props.className ?? ''}`} aria-hidden>
			<span className="size-[4px] shrink-0 rounded-full bg-neutral-400/[0.26]" />
			<span className="size-[4px] shrink-0 rounded-full bg-neutral-400/[0.26]" />
			<span className="size-[4px] shrink-0 rounded-full bg-neutral-400/[0.26]" />
		</span>
	)
}

/**
 * Curated data card — fixed outer size from CSS; rails are abstracted resume-data fragments.
 */
function DataCard(props) {
	const tones = props.tone ?? 'slate'
	return (
		<article className={`floating-data-card ${props.className ?? ''}`} aria-hidden>
			<div className="floating-data-card-inner">
				<span className={`floating-data-icon-box floating-data-icon-box--${tones}`}>
					<FontAwesomeIcon icon={props.icon} className={faPipelineBadge} aria-hidden />
				</span>
				<div className="floating-data-line-group">
					{props.lines.map((w, i) => (
						<span key={`${w}-${i}`} className="floating-data-line" style={{ width: `${w}px` }} />
					))}
					{props.meta ? (
						<span className="floating-data-meta-row" aria-hidden>
							<PhDots className="floating-data-meta-dots" />
							<span className="floating-data-meta-line" style={{ width: `${props.meta}px` }} />
						</span>
					) : null}
				</div>
			</div>
		</article>
	)
}

/** Pill / compact chip — width/height from layout class */
function MiniChip(props) {
	return (
		<div className={`floating-data-chip ${props.className ?? ''}`} aria-hidden>
			{props.children}
		</div>
	)
}

/** Rounded-square icon shell — résumé column only; tones match output column */
function IcoBadge(props) {
	const tones = {
		violet: 'bg-[#f3e8ff] text-[#7c3aed]',
		sky: 'bg-[#e0f2fe] text-[#0284c7]',
		teal: 'bg-[#d1fae5] text-[#047857]',
		amber: 'bg-[#fef3c7] text-[#c2410c]',
		slate: 'bg-[#f1f5f9] text-[#64748b]',
		rose: 'bg-[#ffe4e6] text-brand-pink',
	}
	const sm = props.size === 'sm'
	return (
		<span
			className={`landing-pipeline-ico-badge flex shrink-0 items-center justify-center ${
				sm ? 'landing-pipeline-ico-badge-sm size-9 rounded-[10px]' : 'size-11 rounded-[12px]'
			} ${tones[props.tone ?? 'slate']} ${props.className ?? ''}`}
			aria-hidden
		>
			{props.children}
		</span>
	)
}

export default function HeroPipelineIllustration() {
	return (
		<div
			className="landing-preview-float relative w-full max-w-none shrink-0 select-none overflow-visible"
			aria-hidden="true"
		>
			<div className="relative flex min-h-0 w-full flex-col items-stretch gap-12 overflow-x-clip overflow-y-visible pt-1 sm:overflow-visible lg:min-h-0 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-16 xl:gap-20 2xl:gap-24">
				<div className="floating-data-graphic-wrap mx-auto shrink-0 lg:translate-x-2 lg:self-center">
					<section className="floating-data-graphic" aria-hidden>
						{/* 2 large anchors */}
						<DataCard className="card anchor-profile" tone="violet" icon={faUser} lines={[146, 118, 88]} />
						<DataCard className="card anchor-summary" tone="amber" icon={faCube} lines={[168, 142, 106]} />

						{/* 3 medium supporting cards */}
						<DataCard className="card medium-education" tone="teal" icon={faGraduationCap} lines={[98, 78]} />
						<DataCard className="card medium-experience" tone="sky" icon={faBriefcase} lines={[106, 88]} meta={46} />
						<DataCard className="card medium-projects" tone="slate" icon={faCode} lines={[118, 94]} />

						{/* 2 small cards */}
						<DataCard className="card small-skills" tone="amber" icon={faStar} lines={[74, 58]} />
						<DataCard className="card small-awards" tone="rose" icon={faAward} lines={[78, 62]} />

						{/* 2 tiny chips (max) */}
						<MiniChip className="chip chip-upper-right">
							<FontAwesomeIcon icon={faTag} className="floating-data-chip-ico floating-data-chip-ico--sky" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--pill" aria-hidden />
						</MiniChip>
						<MiniChip className="chip chip-mid-meta">
							<FontAwesomeIcon icon={faPalette} className="floating-data-chip-ico floating-data-chip-ico--violet" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--tiny" aria-hidden />
						</MiniChip>
					</section>
				</div>
				<div className="relative flex min-w-0 w-full flex-1 items-start justify-center lg:justify-end">
					{/* US Letter mock — polished final resume using full card height and the same icon language */}
					<div className="relative aspect-[8.5/11] w-full max-w-[22rem] shrink-0 sm:max-w-[23rem] xl:max-w-[24rem]">
						<div className="pointer-events-none absolute -inset-2 z-20" aria-hidden>
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--large resume-shine--tr1" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--medium resume-shine--tr2" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine--tr3" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine--tr4" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--large resume-shine--bl1" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--medium resume-shine--bl2" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine--bl3" />
							<span className="resume-shine resume-shine--subtle resume-shine--tilt-safe resume-shine--small resume-shine--bl4" />
						</div>
						<div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-200/85 bg-[#fdfcfa] shadow-[0_10px_40px_-8px_rgb(24_24_27_/_0.12)] md:rounded-xl">
							<div className="flex h-full min-h-0 flex-1">
								<div
									className="landing-resume-sidebar flex w-[22%] min-w-[3.55rem] max-w-[5.5rem] shrink-0 flex-col border-r border-violet-200/35 bg-[#eef0ff]/95 px-[clamp(0.32rem,2.8%,0.55rem)] py-[clamp(1.2rem,6.8%,2rem)]"
									aria-hidden
								>
									<span className="landing-resume-ring mx-auto inline-flex size-[clamp(2.4rem,10.75%,3.35rem)] items-center justify-center rounded-full bg-[#f3e8ff] text-[#7c3aed] ring-[3px] ring-white/90">
										<FontAwesomeIcon icon={faUser} className="size-[clamp(0.88rem,2.6vw,1.24rem)]" aria-hidden />
									</span>
									<div className="mt-[clamp(0.62rem,3.8%,0.95rem)] space-y-[0.35rem]" aria-hidden>
										<span className="block h-[8px] w-[82%] rounded-md bg-[#7c3aed]/88" aria-hidden />
										<PhCapsule className="max-w-none w-full" />
										<PhCapsule className="max-w-none w-[70%]" />
									</div>
									<div className="mt-[clamp(0.95rem,5%,1.55rem)] flex flex-1 flex-col justify-between gap-[clamp(0.62rem,4.1%,1rem)]" aria-hidden>
										{[
											{ Icon: faPhone, tone: 'text-[#0e7490]', bg: 'bg-[#cffafe]', label: 'sidebar-contact' },
											{ Icon: faBriefcase, tone: 'text-[#0284c7]', bg: 'bg-[#e0f2fe]', label: 'sidebar-exp' },
											{ Icon: faGraduationCap, tone: 'text-[#047857]', bg: 'bg-[#d1fae5]', label: 'sidebar-edu' },
											{ Icon: faCode, tone: 'text-[#64748b]', bg: 'bg-[#f1f5f9]', label: 'sidebar-proj' },
											{ Icon: faStar, tone: 'text-[#c2410c]', bg: 'bg-[#fef3c7]', label: 'sidebar-skills' },
											{ Icon: faAward, tone: 'text-brand-pink', bg: 'bg-[#ffe4e6]', label: 'sidebar-award' },
										].map((row) => (
											<div key={row.label} className="flex flex-col items-center gap-[0.28rem]">
												<span
													className={`flex size-[clamp(1.72rem,8.8%,2.2rem)] items-center justify-center rounded-[10px] ${row.bg}`}
													aria-hidden
												>
													<FontAwesomeIcon icon={row.Icon} className={`size-[clamp(0.76rem,2vw,0.98rem)] ${row.tone}`} aria-hidden />
												</span>
												<PhCapsule className="max-w-none w-[86%]" />
											</div>
										))}
									</div>
								</div>
								<div
									className="min-h-0 min-w-0 flex-1 bg-white px-[clamp(0.82rem,3.85%,1.55rem)] pb-[clamp(1.2rem,5.8%,2.45rem)] pt-[clamp(1.45rem,6.85%,2.1rem)]"
									aria-hidden
								>
									<div className="flex h-full min-h-0 flex-col">
										<div className="space-y-[0.42rem]">
										<span className="block h-[10px] w-[58%] rounded-md" style={{ backgroundColor: '#5b21b6' }} aria-hidden />
											<PhCapsule className="max-w-none w-[92%]" />
											<PhCapsule className="max-w-none w-[76%]" />
										</div>
										<div className="my-[clamp(0.58rem,2.55%,0.9rem)] h-px shrink-0 bg-neutral-200/88" aria-hidden />
										<div className="flex min-h-0 flex-1 flex-col justify-between gap-[clamp(0.5rem,2.4%,0.84rem)]">
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[44%] rounded-[4px]" style={{ backgroundColor: '#5b21b6' }} aria-hidden />
												<PhCapsule className="max-w-none w-full" />
												<PhCapsule className="max-w-none w-[91%]" />
												<PhCapsule className="max-w-none w-[74%]" />
											</section>
											<div className="h-px shrink-0 bg-neutral-200/86" aria-hidden />
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[46%] rounded-[4px]" style={{ backgroundColor: '#0369a1' }} aria-hidden />
												<PhCapsule className="max-w-none w-full" />
												<PhCapsule className="max-w-none w-[95%]" />
												<PhCapsule className="max-w-none w-[78%]" />
												<span className="flex items-start gap-2 pt-px">
													<span className="landing-resume-dot relative top-[3px] shrink-0 bg-sky-500/75" aria-hidden />
													<PhCapsule className="max-w-none w-[85%] pt-[2px]" />
												</span>
											</section>
											<div className="h-px shrink-0 bg-neutral-200/86" aria-hidden />
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[40%] rounded-[4px]" style={{ backgroundColor: '#047857' }} aria-hidden />
												<PhCapsule className="max-w-none w-[96%]" />
												<PhCapsule className="max-w-none w-[84%]" />
											</section>
											<div className="h-px shrink-0 bg-neutral-200/86" aria-hidden />
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[42%] rounded-[4px]" style={{ backgroundColor: '#475569' }} aria-hidden />
												<PhCapsule className="max-w-none w-full" />
												<PhCapsule className="max-w-none w-[88%]" />
											</section>
											<div className="h-px shrink-0 bg-neutral-200/86" aria-hidden />
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[36%] rounded-[4px]" style={{ backgroundColor: '#b45309' }} aria-hidden />
												<PhCapsule className="max-w-none w-[94%]" />
												<PhCapsule className="max-w-none w-[79%]" />
											</section>
											<div className="h-px shrink-0 bg-neutral-200/86" aria-hidden />
											<section className="space-y-[6px]" aria-hidden>
												<span className="block h-[7px] w-[46%] rounded-[4px]" style={{ backgroundColor: '#be4655' }} aria-hidden />
												<PhCapsule className="max-w-none w-[92%]" />
												<PhCapsule className="max-w-none w-[69%]" />
											</section>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
