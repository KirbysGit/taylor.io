// Decorative pipeline glob + résumé mock for the landing hero

import {
	faAward,
	faBriefcase,
	faCertificate,
	faChartLine,
	faCheck,
	faCode,
	faCompass,
	faCube,
	faEnvelope,
	faGraduationCap,
	faHandshake,
	faLayerGroup,
	faLightbulb,
	faListCheck,
	faPhone,
	faQuestion,
	faRocket,
	faStar,
	faTag,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** Pipeline + résumé mock icons — Font Awesome for optically centered, app-wide consistent glyphs */
const faPipelineBadge = 'size-[1.125rem]'

const floatingCardLayout = {
	education: { x: 250, y: 60, w: 214, h: 74, delay: '-0.2s' },
	profile: { x: 230, y: 150, w: 268, h: 80, delay: '-0.95s' },
	experience: { x: 300, y: 245, w: 214, h: 80, delay: '-1.55s' },
	skills: { x: 20, y: 135, w: 178, h: 76, delay: '-2.2s' },
	projects: { x: 240, y: 380, w: 252, h: 75, delay: '-3.1s' },
	awards: { x: 280, y: 465, w: 192, h: 74, delay: '-3.65s' },
	summary: { x: 150, y: 555, w: 304, h: 88, delay: '-4.45s' },
	contact: { x: 108, y: 240, w: 178, h: 74, delay: '-1.9s' },
	tagNote: { x: 10, y: 330, w: 164, h: 76, delay: '-3.85s' },
	momentum: { x: 45, y: 35, w: 178, h: 74, delay: '-1.25s' },
	direction: { x: 70, y: 422.5, w: 150, h: 72, delay: '-4.05s' },
}

const floatingChipLayout = {
	upperRight: { x: 190, y: 325, w: 104, h: 46, delay: '-0.65s' },
	upperSkill: { x: 365, y: 334, w: 96, h: 38, delay: '-1.1s' },
	leftAward: { x: 170, y: 507.5, w: 92, h: 36, delay: '-3.25s' },
	rightProject: { x: 0, y: 225, w: 92, h: 42, delay: '-2.95s' },
	lowerPhone: { x: 55, y: 510, w: 96, h: 42, delay: '-4.15s' },
}

const floatingQuestionLayout = [
	{ x: 50, y: 277.5, size: 42, tone: 'teal', delay: '-0.35s' },
	{ x: 315, y: 337.5, size: 32, tone: 'violet', delay: '-1.05s' },
	{ x: 100, y: 565, size: 38, tone: 'sky', delay: '-1.55s' },
	{ x: 475, y: 340, size: 28, tone: 'amber', delay: '-2.05s' },
	{ x: 192.5, y: 380, size: 30, tone: 'rose', delay: '-2.85s' },
	{ x: 205, y: 115, size: 34, tone: 'slate', delay: '-3.35s' },
	{ x: 14, y: 422.5, size: 44, tone: 'lime', delay: '-4.1s' },
	{ x: 234, y: 464, size: 32, tone: 'fuchsia', delay: '-4.7s' },
]

function floatingLayoutVars(layout) {
	return {
		left: `${layout.x}px`,
		top: `${layout.y}px`,
		width: `${layout.w}px`,
		height: `${layout.h}px`,
		animationDelay: layout.delay,
	}
}

function floatingQuestionVars(layout) {
	return {
		left: `${layout.x}px`,
		top: `${layout.y}px`,
		width: `${layout.size}px`,
		height: `${layout.size}px`,
		animationDelay: layout.delay,
	}
}

function handleResumeParallaxMove(event) {
	const target = event.currentTarget
	const rect = target.getBoundingClientRect()
	const x = event.clientX - rect.left
	const y = event.clientY - rect.top
	const px = x / rect.width
	const py = y / rect.height
	const rotateY = (px - 0.5) * 10
	const rotateX = (0.5 - py) * 8
	const shineX = 100 - px * 100
	const shineY = 100 - py * 100
	const sparkleX = 50 + (px - 0.5) * 18
	const sparkleY = 50 + (py - 0.5) * 18

	target.style.setProperty('--resume-rotate-x', `${rotateX.toFixed(2)}deg`)
	target.style.setProperty('--resume-rotate-y', `${rotateY.toFixed(2)}deg`)
	target.style.setProperty('--resume-shine-x', `${shineX.toFixed(2)}%`)
	target.style.setProperty('--resume-shine-y', `${shineY.toFixed(2)}%`)
	target.style.setProperty('--resume-sparkle-x', `${sparkleX.toFixed(2)}%`)
	target.style.setProperty('--resume-sparkle-y', `${sparkleY.toFixed(2)}%`)
	target.style.setProperty('--resume-glimmer-opacity', '0.82')
}

function handleResumeParallaxLeave(event) {
	const target = event.currentTarget
	target.style.removeProperty('--resume-rotate-x')
	target.style.removeProperty('--resume-rotate-y')
	target.style.removeProperty('--resume-shine-x')
	target.style.removeProperty('--resume-shine-y')
	target.style.removeProperty('--resume-sparkle-x')
	target.style.removeProperty('--resume-sparkle-y')
	target.style.removeProperty('--resume-glimmer-opacity')
}

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
		<article className={`floating-data-card ${props.className ?? ''}`} style={props.style} aria-hidden>
			<div className="floating-data-card-inner">
				<span className={`floating-data-icon-box floating-data-icon-box--${tones}`}>
					<FontAwesomeIcon icon={props.icon} className={faPipelineBadge} aria-hidden />
				</span>
				<div className="floating-data-line-group">
					{props.lines.map((w, i) => (
						<span key={`${w}-${i}`} className="floating-data-line" style={{ width: `${w}px` }} />
					))}
					{props.bullets ? (
						<span className="floating-data-bullet-group" aria-hidden>
							{props.bullets.map((w, i) => (
								<span key={`${w}-${i}`} className="floating-data-bullet-row">
									<span className={`floating-data-bullet-dot floating-data-bullet-dot--${tones}`} />
									<span className="floating-data-bullet-line" style={{ width: `${w}px` }} />
								</span>
							))}
						</span>
					) : null}
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
		<div className={`floating-data-chip ${props.className ?? ''}`} style={props.style} aria-hidden>
			{props.children}
		</div>
	)
}

/** Rounded-square icon shell — résumé column only; tones match output column */
function QuestionBubble(props) {
	return (
		<span className={`floating-question-bubble floating-question-bubble--${props.tone}`} style={props.style} aria-hidden>
			<FontAwesomeIcon icon={faQuestion} />
		</span>
	)
}

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

function PipelineConnectorSvg(props) {
	const compact = props.compact === true
	const markerPrefix = compact ? 'compact' : 'full'
	const straightStartX = compact ? 795 : 818
	const endX = compact ? 810 : 844
	const paths = [
		{
			id: 'education',
			d: `M506 150 C 620 150, 618 226, 682 282 C 728 322, 766 322, ${straightStartX} 322 L${endX} 322`,
			color: '#6ed7c8',
			check: [670, 270],
			delay: '0s',
		},
		{
			id: 'profile',
			d: `M506 238 C 620 238, 628 292, 688 330 C 730 356, 766 354, ${straightStartX} 354 L${endX} 354`,
			color: '#a78bfa',
			check: [672, 318],
			delay: '-0.2s',
		},
		{
			id: 'experience',
			d: `M512 334 C 626 334, 648 366, 696 380 C 734 392, 770 386, ${straightStartX} 386 L${endX} 386`,
			color: '#7db8ff',
			check: [682, 370],
			delay: '-0.35s',
		},
		{
			id: 'projects',
			d: `M506 474 C 626 474, 648 438, 696 424 C 734 412, 770 418, ${straightStartX} 418 L${endX} 418`,
			color: '#94a3b8',
			check: [684, 436],
			delay: '-0.7s',
		},
		{
			id: 'awards',
			d: `M506 570 C 620 570, 628 512, 688 474 C 730 448, 766 450, ${straightStartX} 450 L${endX} 450`,
			color: '#fb8b99',
			check: [672, 486],
			delay: '-1.05s',
		},
		{
			id: 'skills',
			d: `M506 662 C 620 662, 618 580, 682 522 C 728 482, 766 482, ${straightStartX} 482 L${endX} 482`,
			color: '#f5b86f',
			check: [668, 532],
			delay: '-1.4s',
		},
	]

	return (
		<svg
			className={props.className}
			viewBox="0 0 1100 680"
			preserveAspectRatio="none"
			aria-hidden
		>
			<defs>
				{paths.map((path) => (
					<marker
						key={`${path.id}-arrow`}
						id={`heroPipelineArrow-${markerPrefix}-${path.id}`}
						markerWidth="12"
						markerHeight="12"
						refX="9.4"
						refY="6"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path
							d="M1.5 1.5 L9.5 6 L1.5 10.5"
							fill="none"
							stroke={path.color}
							strokeWidth="2.4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</marker>
				))}
			</defs>

			{paths.map((path) => (
				<g key={path.id}>
					<path
						d={path.d}
						fill="none"
						stroke={path.color}
						strokeWidth="8"
						strokeLinecap="round"
						strokeOpacity="0.2"
					/>
					<path
						d={path.d}
						fill="none"
						stroke={path.color}
						strokeWidth="3.25"
						strokeLinecap="round"
						strokeOpacity="0.9"
						markerEnd={`url(#heroPipelineArrow-${markerPrefix}-${path.id})`}
					/>
					<circle cx={path.check[0]} cy={path.check[1]} r="16" fill="white" fillOpacity="0.9" />
					<circle cx={path.check[0]} cy={path.check[1]} r="13" fill={path.color} fillOpacity="0.96" />
					<circle cx={path.check[0]} cy={path.check[1]} r="19" fill={path.color} fillOpacity="0.12" />
					<path
						d={`M${path.check[0] - 5} ${path.check[1]} L${path.check[0] - 1.5} ${path.check[1] + 4} L${path.check[0] + 6} ${path.check[1] - 5}`}
						fill="none"
						stroke="white"
						strokeWidth="2.4"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			))}

		</svg>
	)
}

function PipelineConnectors() {
	return (
		<>
			<PipelineConnectorSvg
				compact
				className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full -translate-y-4 lg:block 2xl:hidden xl:-translate-y-10"
			/>
			<PipelineConnectorSvg
				className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full -translate-y-4 2xl:block xl:-translate-y-10"
			/>
		</>
	)
}

export default function HeroPipelineIllustration() {
	return (
		<div
			className="landing-preview-float relative w-full max-w-none shrink-0 select-none overflow-visible"
			aria-hidden="true"
		>
			<div className="relative flex min-h-0 w-full flex-col items-stretch gap-12 overflow-x-clip overflow-y-visible pt-1 sm:overflow-visible lg:min-h-0 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-16 xl:gap-20 2xl:gap-24">
				<PipelineConnectors />
				<div className="floating-data-graphic-wrap relative z-20 mx-auto shrink-0 lg:translate-x-2 lg:self-center">
					<section className="floating-data-graphic" aria-hidden>
						{/* 2 large anchors */}
						<DataCard className="card anchor-profile" style={floatingLayoutVars(floatingCardLayout.profile)} tone="violet" icon={faUser} lines={[146, 118]} bullets={[92, 74]} />
						<DataCard className="card anchor-summary" style={floatingLayoutVars(floatingCardLayout.summary)} tone="rust" icon={faCube} lines={[172, 138]} bullets={[118, 154, 96]} />
						<DataCard className="card big-momentum" style={floatingLayoutVars(floatingCardLayout.momentum)} tone="lime" icon={faRocket} lines={[98, 72]} bullets={[84]} />

						{/* 3 medium supporting cards */}
						<DataCard className="card medium-education" style={floatingLayoutVars(floatingCardLayout.education)} tone="teal" icon={faGraduationCap} lines={[106, 82]} />
						<DataCard className="card medium-experience" style={floatingLayoutVars(floatingCardLayout.experience)} tone="sky" icon={faBriefcase} lines={[112, 92]} bullets={[82, 108]} />
						<DataCard className="card medium-projects" style={floatingLayoutVars(floatingCardLayout.projects)} tone="slate" icon={faCode} lines={[118, 94]} bullets={[88]} />

						{/* 2 small cards */}
						<DataCard className="card small-skills" style={floatingLayoutVars(floatingCardLayout.skills)} tone="amber" icon={faStar} lines={[82, 62]} />
						<DataCard className="card small-awards" style={floatingLayoutVars(floatingCardLayout.awards)} tone="rose" icon={faAward} lines={[78, 62]} />
						<DataCard className="card small-contact" style={floatingLayoutVars(floatingCardLayout.contact)} tone="cyan" icon={faPhone} lines={[82, 58]} />
						<DataCard className="card small-tag-note" style={floatingLayoutVars(floatingCardLayout.tagNote)} tone="yellow" icon={faLightbulb} lines={[72]} bullets={[54]} />
						<DataCard className="card small-direction" style={floatingLayoutVars(floatingCardLayout.direction)} tone="fuchsia" icon={faCompass} lines={[70, 50]} />

						{/* 2 tiny chips (max) */}
						<MiniChip className="chip chip-upper-right" style={floatingLayoutVars(floatingChipLayout.upperRight)}>
							<FontAwesomeIcon icon={faTag} className="floating-data-chip-ico floating-data-chip-ico--sky" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--pill" aria-hidden />
						</MiniChip>
						<MiniChip className="chip chip-upper-skill" style={floatingLayoutVars(floatingChipLayout.upperSkill)}>
							<FontAwesomeIcon icon={faChartLine} className="floating-data-chip-ico floating-data-chip-ico--amber" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--tiny" aria-hidden />
						</MiniChip>
						<MiniChip className="chip chip-left-award" style={floatingLayoutVars(floatingChipLayout.leftAward)}>
							<FontAwesomeIcon icon={faCertificate} className="floating-data-chip-ico floating-data-chip-ico--rose" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--tiny" aria-hidden />
						</MiniChip>
						<MiniChip className="chip chip-right-project" style={floatingLayoutVars(floatingChipLayout.rightProject)}>
							<FontAwesomeIcon icon={faLayerGroup} className="floating-data-chip-ico floating-data-chip-ico--slate" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--tiny" aria-hidden />
						</MiniChip>
						<MiniChip className="chip chip-lower-phone" style={floatingLayoutVars(floatingChipLayout.lowerPhone)}>
							<FontAwesomeIcon icon={faEnvelope} className="floating-data-chip-ico floating-data-chip-ico--sky" aria-hidden />
							<span className="floating-data-chip-line floating-data-chip-line--tiny" aria-hidden />
						</MiniChip>
						{floatingQuestionLayout.map((bubble, index) => (
							<QuestionBubble
								key={`floating-question-${index}`}
								tone={bubble.tone}
								style={floatingQuestionVars(bubble)}
							/>
						))}
					</section>
				</div>
				<div className="relative z-30 translate-x-[35%] flex min-w-0 w-full flex-1 items-start justify-center lg:justify-end">
					{/* US Letter mock — polished final resume using full card height and the same icon language */}
					<div
						className="hero-resume-parallax-frame relative aspect-[8.5/11] w-full max-w-[22rem] shrink-0 sm:max-w-[23rem] xl:max-w-[24rem]"
						onPointerMove={handleResumeParallaxMove}
						onPointerLeave={handleResumeParallaxLeave}
						onPointerCancel={handleResumeParallaxLeave}
					>
						<div className="hero-resume-parallax-card relative h-full w-full">
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
		</div>
	)
}
