// One profile, many resumes — scaffolding the left-side layout first

import { faBriefcase, faBullseye, faChartBar, faCheck, faCode, faFileLines, faGraduationCap, faRightLeft, faStar, faUser, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const pinkWell = {
	box: 'bg-brand-pink-lighter/60 ring-1 ring-brand-pink/15',
	icon: 'text-brand-pink-dark',
}

function SavedProfileMock() {
	const rows = [
		{ label: 'Experience', icon: faBriefcase },
		{ label: 'Education', icon: faGraduationCap },
		{ label: 'Projects', icon: faCode },
		{ label: 'Skills', icon: faStar },
	]

	return (
		<div
			aria-hidden
			className="w-full max-w-[520px] rounded-[28px] border border-gray-200/80 bg-white/95 p-6 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_22px_64px_-28px_rgba(17,24,39,0.3)] backdrop-blur-[1.5px] sm:p-7"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-start gap-3">
					<span className={`mt-0.5 inline-flex h-20 w-20 shrink-0 aspect-square items-center justify-center rounded-full ${pinkWell.box}`}>
						<img src="/alex.png" alt="" className="h-full w-full rounded-full object-cover" />
					</span>
					<div className="min-w-0">
						<div className="text-lg font-semibold tracking-tight text-brand-pink">Alex's saved profile</div>
						<div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-brand-pink/20 bg-brand-pink-lighter/30 px-2.5 py-0.5 text-[12px] font-semibold text-brand-pink-dark">
							Product Design • Operations • Analytics
						</div>
						<div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-pink/30 bg-gradient-to-r from-brand-pink to-rose-400 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(225,29,72,0.85)] ring-1 ring-white/45">
							<span className="inline-flex size-3.5 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/45">
								<FontAwesomeIcon icon={faCheck} className="size-2.5 text-white" aria-hidden />
							</span>
							<span className="tracking-[0.02em]">Single source of truth</span>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 space-y-3.5">
				{rows.map((r) => (
					<div key={r.label} className="rounded-2xl border border-gray-200/75 bg-white/80 px-4 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]">
						<div className="grid grid-cols-[auto_1fr] items-center gap-5">

							{/* Icon sits visually “in the middle” of the row, like the mock. */}
							<span className={`inline-flex size-12 items-center justify-center rounded-2xl ${pinkWell.box}`}>
								<FontAwesomeIcon icon={r.icon} className={`size-6 ${pinkWell.icon}`} aria-hidden />
							</span>

							<div className="min-w-0 text-left">
								<div className="text-[13px] font-semibold tracking-tight text-gray-900/80">{r.label}</div>
								{r.label === 'Skills' ? (
									<div className="mt-2.5 flex flex-wrap gap-2">
										<div className="h-3 w-16 rounded-full bg-gray-300/70" />
										<div className="h-3 w-10 rounded-full bg-gray-300/70" />
										<div className="h-3 w-20 rounded-full bg-gray-300/55" />
										<div className="h-3 w-12 rounded-full bg-gray-300/45" />
									</div>
								) : (
									<>
										<div className="mt-2 h-2 w-[86%] rounded-full bg-gray-300/70" />
										<div className="mt-2 h-2 w-[62%] rounded-full bg-gray-300/45" />
									</>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

const resumeVariants = [
	{
		border: 'border-brand-pink/35',
		accent: 'bg-brand-pink',
		accentSoft: 'bg-brand-pink-lighter/55',
		accentText: 'text-brand-pink',
		roleTarget: 'Product Designer @ Apple',
		title: 'For a product role',
		description: "Highlights Alex's product design, user feedback synthesis, and roadmap support.",
		icon: faBullseye,
		well: 'bg-brand-pink-lighter/70',
		iconColor: 'text-brand-pink-dark',
	},
	{
		border: 'border-violet-300/70',
		accent: 'bg-violet-500',
		accentSoft: 'bg-violet-100/80',
		accentText: 'text-violet-600',
		roleTarget: 'Operations Manager @ Netflix',
		title: 'For an operations role',
		description: "Highlights Alex's process improvement, cross-team coordination, and execution.",
		icon: faRightLeft,
		well: 'bg-violet-100/80',
		iconColor: 'text-violet-600',
	},
	{
		border: 'border-sky-300/80',
		accent: 'bg-sky-500',
		accentSoft: 'bg-sky-100/80',
		accentText: 'text-sky-600',
		roleTarget: 'Data Analyst @ Spotify',
		title: 'For an analyst role',
		description: "Highlights Alex's reporting, metric tracking, and data-driven problem-solving.",
		icon: faChartBar,
		well: 'bg-sky-100/80',
		iconColor: 'text-sky-600',
	},
]

const profileFlowSteps = [
	{
		icon: faFileLines,
		title: "1. Save Alex's profile",
		description: 'Keep her wins, projects, and impact organized in one place.',
		well: 'bg-brand-pink-lighter/60',
		iconColor: 'text-brand-pink',
	},
	{
		icon: faRightLeft,
		title: '2. Choose the direction',
		description: 'Try product design, operations, or analytics without rewriting everything.',
		well: 'bg-violet-100/80',
		iconColor: 'text-violet-600',
	},
	{
		icon: faWandMagicSparkles,
		title: '3. Generate the right version',
		description: 'Taylor.io highlights the experience that best matches each role.',
		well: 'bg-sky-100/80',
		iconColor: 'text-sky-600',
	},
]

function ResumePreviewCard({ variant }) {
	return (
		<div
			className={`h-[168px] rounded-[26px] border ${variant.border} bg-white p-4 shadow-[0_8px_24px_-20px_rgba(17,24,39,0.35)] transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-24px_rgba(17,24,39,0.4)] motion-reduce:transform-none motion-reduce:transition-none`}
		>
			<div className="flex h-full flex-col gap-1.5">
				<div className="flex items-start gap-2.5">
					<div className={`inline-flex size-11 items-center justify-center rounded-full ${variant.accent}`}>
							<FontAwesomeIcon icon={faUser} className="size-8 translate-y-1.5 text-white" aria-hidden />
					</div>
					<div className="pt-0.5">
						<div className={`text-[12px] font-semibold tracking-tight ${variant.accentText}`}>{variant.roleTarget}</div>
						<div className="mt-1.5 h-1.5 w-48 rounded-full bg-gray-200/90" />
						<div className="mt-2 h-1.5 w-32 rounded-full bg-gray-200/85" />
					</div>
				</div>

				{/* Keep body placeholders and mini resume parallel like the reference layout. */}
				<div className="grid flex-1 grid-cols-[1fr_auto] items-end gap-3">
					<div className="space-y-2 pb-1">
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[92%] rounded-full bg-gray-300/85" />
						</div>
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[84%] rounded-full bg-gray-300/80" />
						</div>
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[88%] rounded-full bg-gray-300/80" />
						</div>
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[82%] rounded-full bg-gray-300/75" />
						</div>
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[68%] rounded-full bg-gray-300/70" />
						</div>
						<div className="flex items-center gap-2">
							<div className={`size-1.5 rounded-full ${variant.accent}`} />
							<div className="h-1.5 w-[76%] rounded-full bg-gray-300/70" />
						</div>
					</div>

					<div className={`self-end rounded-xl p-2.5 ${variant.accent}`}>
						<div className="space-y-1.5">
							<div className="mb-1.5 flex items-center gap-1.5">
								<div className="size-1 rounded-full bg-white/90" />
								<div className="h-1.5 w-8 rounded-full bg-white/90" />
							</div>
							<div className="h-1.5 w-11 rounded-full bg-white/85" />
							<div className="h-1.5 w-10 rounded-full bg-white/70" />
							<div className="mt-1 flex items-center gap-1.5">
								<div className="size-1 rounded-full bg-white/85" />
								<div className="h-1.5 w-7 rounded-full bg-white/80" />
							</div>
							<div className="flex items-center gap-1.5">
								<div className="size-1 rounded-full bg-white/80" />
								<div className="h-1.5 w-6 rounded-full bg-white/75" />
							</div>
							<div className="mt-2 flex gap-1.5">
								<div className="h-2 w-5 rounded-full bg-white/85" />
								<div className="h-2 w-5 rounded-full bg-white/75" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function ResumeVariantCallout({ variant }) {
	return (
		<div className="flex h-[168px] flex-col justify-start gap-2.5 pt-1 transition-colors duration-300">
			<div className="inline-flex w-fit items-center gap-1.5">
				<p className="text-[1.03rem] font-semibold tracking-tight text-gray-900">{variant.title}</p>
				<div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant.well}`}>
					<FontAwesomeIcon icon={variant.icon} className={`size-5 ${variant.iconColor}`} aria-hidden />
				</div>
			</div>
			<p className="max-w-[280px] text-[0.98rem] leading-[1.55] text-gray-600">{variant.description}</p>
		</div>
	)
}

function ProfileFlowStrip() {
	return (
		<div className="rounded-[24px] border border-gray-200/80 bg-white/95 px-4 py-4 shadow-[0_14px_34px_-28px_rgba(17,24,39,0.35)] md:px-5 md:py-4">

			<div className="grid gap-3 md:grid-cols-3 md:gap-0">
				{profileFlowSteps.map((step, idx) => (
					<div key={step.title} className={`flex items-start gap-2.5 ${idx > 0 ? 'md:border-l md:border-gray-200/75 md:pl-5' : ''}`}>
						<div className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${step.well}`}>
							<FontAwesomeIcon icon={step.icon} className={`size-4 ${step.iconColor}`} aria-hidden />
						</div>
						<div className="min-w-0 pt-0.5">
							<p className="text-[0.98rem] font-semibold tracking-tight text-gray-900">{step.title}</p>
							<p className="mt-0.5 text-[0.9rem] leading-relaxed text-gray-600">{step.description}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default function LandingOneProfileManyResumes() {
	return (
		<section
			id="one-profile-many-resumes"
			aria-labelledby="one-profile-many-resumes-heading"
			className="relative overflow-hidden border-t border-gray-200/65 bg-cream py-16 md:py-20"
		>
			<div className="pointer-events-none absolute -left-24 top-20 hidden h-48 w-48 rounded-full bg-brand-pink-lighter/35 blur-3xl lg:block" aria-hidden />
			<div className="pointer-events-none absolute right-8 bottom-16 hidden h-40 w-40 rounded-full bg-sky-100/60 blur-3xl lg:block" aria-hidden />
			<div className="mx-auto max-w-[min(1280px,94vw)]">
				{/* Layout scaffold (desktop): left resume lane, center connector gap, right profile lane. */}
				<div className="items-start gap-10">
					{/* Desktop scaffold: 5 lanes = left breathing room, main lane, connector gap, right stack, reserved explanation space. */}
					<div className="relative rounded-[26px] p-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(18px,0.28fr)_minmax(0,2.9fr)_minmax(80px,1.15fr)_minmax(320px,1.7fr)_minmax(140px,0.95fr)] lg:grid-rows-[auto_auto] lg:gap-y-4">
						{/* Connector arrows (lg): tuned separately so mid-sized desktops don't inherit xl geometry. */}
						<svg className="pointer-events-none absolute inset-0 z-10 hidden lg:block xl:hidden lg:-translate-x-12" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden>
							<defs>
								<linearGradient id="profileToCustomerStrokeLg" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#fb7185" stopOpacity="0.85" />
									<stop offset="100%" stopColor="#e11d48" stopOpacity="0.9" />
								</linearGradient>
								<linearGradient id="profileToOpsStrokeLg" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#c084fc" stopOpacity="0.82" />
									<stop offset="100%" stopColor="#7c3aed" stopOpacity="0.88" />
								</linearGradient>
								<linearGradient id="profileToAnalystStrokeLg" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.82" />
									<stop offset="100%" stopColor="#0284c7" stopOpacity="0.88" />
								</linearGradient>
								<filter id="connectorGlowLg" x="-30%" y="-30%" width="160%" height="160%">
									<feGaussianBlur stdDeviation="2.4" />
								</filter>
								<marker id="arrowHeadCustomerLg" markerWidth="12" markerHeight="12" refX="9.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
								<marker id="arrowHeadOpsLg" markerWidth="12" markerHeight="12" refX="9.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
								<marker id="arrowHeadAnalystLg" markerWidth="12" markerHeight="12" refX="9.5" refY="5.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
							</defs>

							<path d="M400 365 C 468 365, 518 255, 575 220" fill="none" stroke="url(#profileToCustomerStrokeLg)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowLg)" />
							<path d="M400 365 C 468 365, 518 255, 575 220" fill="none" stroke="url(#profileToCustomerStrokeLg)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadCustomerLg)" />
							<path className="motion-reduce:hidden" d="M400 365 C 468 365, 518 255, 575 220" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.15" strokeLinecap="round" strokeDasharray="2 17">
								<animate attributeName="stroke-dashoffset" from="0" to="-38" dur="2.8s" repeatCount="indefinite" />
							</path>
							<circle cx="590" cy="214" r="13" fill="#e11d48" fillOpacity="0.92" />

							<path d="M400 365 C 482 365, 522 344, 575 336" fill="none" stroke="url(#profileToOpsStrokeLg)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowLg)" />
							<path d="M400 365 C 482 365, 522 344, 575 336" fill="none" stroke="url(#profileToOpsStrokeLg)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadOpsLg)" />
							<path className="motion-reduce:hidden" d="M400 365 C 482 365, 522 344, 575 336" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="2 17">
								<animate attributeName="stroke-dashoffset" from="-14" to="-52" dur="2.9s" repeatCount="indefinite" />
							</path>
							<circle cx="590" cy="334" r="13" fill="#7c3aed" fillOpacity="0.92" />

							<path d="M400 365 C 480 365, 525 430, 575 438" fill="none" stroke="url(#profileToAnalystStrokeLg)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowLg)" />
							<path d="M400 365 C 480 365, 525 430, 575 438" fill="none" stroke="url(#profileToAnalystStrokeLg)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadAnalystLg)" />
							<path className="motion-reduce:hidden" d="M400 365 C 480 365, 525 430, 575 438" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="2 17">
								<animate attributeName="stroke-dashoffset" from="-22" to="-60" dur="3s" repeatCount="indefinite" />
							</path>
							<circle cx="590" cy="442" r="13" fill="#0284c7" fillOpacity="0.92" />

							{/* Draw source dot last so it stays above all connector lines. */}
							<circle cx="400" cy="365" r="13" fill="#fb7185" fillOpacity="0.94" />
						</svg>

						{/* Connector arrows (xl+): keep your preferred large-desktop geometry. */}
						<svg className="pointer-events-none absolute inset-0 z-10 hidden xl:block xl:-translate-x-12" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden>
							<defs>
								<linearGradient id="profileToCustomerStrokeXl" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#fb7185" stopOpacity="0.85" />
									<stop offset="100%" stopColor="#e11d48" stopOpacity="0.9" />
								</linearGradient>
								<linearGradient id="profileToOpsStrokeXl" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#c084fc" stopOpacity="0.82" />
									<stop offset="100%" stopColor="#7c3aed" stopOpacity="0.88" />
								</linearGradient>
								<linearGradient id="profileToAnalystStrokeXl" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.82" />
									<stop offset="100%" stopColor="#0284c7" stopOpacity="0.88" />
								</linearGradient>
								<filter id="connectorGlowXl" x="-30%" y="-30%" width="160%" height="160%">
									<feGaussianBlur stdDeviation="2.4" />
								</filter>
								<marker id="arrowHeadCustomerXl" markerWidth="12" markerHeight="12" refX="9.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
								<marker id="arrowHeadOpsXl" markerWidth="12" markerHeight="12" refX="9.5" refY="6" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
								<marker id="arrowHeadAnalystXl" markerWidth="12" markerHeight="12" refX="9.5" refY="5.5" orient="auto" markerUnits="userSpaceOnUse">
									<path d="M1.5 1.5 L9.5 6 L1.5 10.5" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
								</marker>
							</defs>

							<path d="M415 370 C 500 370, 542 242, 596 194" fill="none" stroke="url(#profileToCustomerStrokeXl)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowXl)" />
							<path d="M415 370 C 500 370, 542 242, 596 194" fill="none" stroke="url(#profileToCustomerStrokeXl)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadCustomerXl)" />
							<path className="motion-reduce:hidden" d="M415 370 C 500 370, 542 242, 596 194" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.15" strokeLinecap="round" strokeDasharray="2 18">
								<animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2.8s" repeatCount="indefinite" />
							</path>
							<circle cx="610" cy="190" r="14" fill="#e11d48" fillOpacity="0.92" />

							<path d="M415 370 C 510 370, 548 352, 596 332" fill="none" stroke="url(#profileToOpsStrokeXl)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowXl)" />
							<path d="M415 370 C 510 370, 548 352, 596 332" fill="none" stroke="url(#profileToOpsStrokeXl)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadOpsXl)" />
							<path className="motion-reduce:hidden" d="M415 370 C 510 370, 548 352, 596 332" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="2 18">
								<animate attributeName="stroke-dashoffset" from="-14" to="-54" dur="2.9s" repeatCount="indefinite" />
							</path>
							<circle cx="610" cy="330" r="14" fill="#7c3aed" fillOpacity="0.92" />

							<path d="M415 370 C 505 370, 548 456, 596 470" fill="none" stroke="url(#profileToAnalystStrokeXl)" strokeWidth="7" strokeOpacity="0.28" strokeLinecap="round" filter="url(#connectorGlowXl)" />
							<path d="M415 370 C 505 370, 548 456, 596 470" fill="none" stroke="url(#profileToAnalystStrokeXl)" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrowHeadAnalystXl)" />
							<path className="motion-reduce:hidden" d="M415 370 C 505 370, 548 456, 596 470" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="2 18">
								<animate attributeName="stroke-dashoffset" from="-24" to="-62" dur="3s" repeatCount="indefinite" />
							</path>
							<circle cx="610" cy="470" r="14" fill="#0284c7" fillOpacity="0.92" />

							{/* Draw source dot last so it stays above all connector lines. */}
							<circle cx="415" cy="370" r="14" fill="#fb7185" fillOpacity="0.94" />
						</svg>

						<div className="row-span-1 lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:pr-4">
							<p className="text-[12px] mb-5 font-bold uppercase tracking-[0.18em] text-brand-pink">One profile, many resumes</p>
							<h2
								id="one-profile-many-resumes-heading"
								className="text-[2.5rem] font-bold leading-[1.06] tracking-tight text-gray-900 sm:text-[2.5rem] md:text-[3.35rem] lg:whitespace-nowrap"
							>
								You are more than one résumé.
							</h2>
							<div>
							<p className="max-w-[42rem] pt-2.5 text-[1.02rem] leading-relaxed text-gray-600 md:text-[1.06rem]">
								Here's a case with <span className="font-semibold text-gray-900">Alex</span>. She wants to grow
								into <span className="font-semibold text-gray-900">product design</span> and brings a strong
								background in <span className="font-semibold text-gray-900">operations management</span>,
								hands-on project execution, and <span className="font-semibold text-gray-900">analytics</span>,
								so <span className="font-semibold text-brand-pink-dark">Taylor.io</span> can shape the right
								version for each role she wants next.
							</p>
						</div>
						</div>

						<div className="relative z-20 lg:col-start-2 lg:col-span-1 lg:row-start-2 lg:self-start lg:ml-5 lg:max-w-[560px] lg:-translate-x-12">
							<div className="lg:pt-1">
								<SavedProfileMock />
							</div>
						</div>

						{/* Render each profile card and its copy from one shared variant config so rows stay aligned. */}
						<div className="relative z-20 hidden lg:grid lg:col-start-4 lg:col-span-2 lg:row-start-2 lg:row-span-1 lg:self-start lg:-translate-x-12 lg:-translate-y-14 lg:grid-cols-[minmax(320px,1fr)_minmax(280px,1.05fr)] lg:items-stretch lg:gap-x-6 lg:gap-y-4">
							{resumeVariants.map((variant) => (
								<div key={variant.title} className="contents">
									<ResumePreviewCard variant={variant} />
									<ResumeVariantCallout variant={variant} />
								</div>
							))}
						</div>
					</div>

					<ProfileFlowStrip />
				</div>
			</div>
		</section>
	)
}

