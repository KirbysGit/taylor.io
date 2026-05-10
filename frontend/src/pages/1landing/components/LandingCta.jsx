import {
	faArrowRight,
	faCalendarCheck,
	faCheck,
	faCommentDots,
	faEye,
	faFileLines,
	faShieldHalved,
	faStar,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'

const outcomeCards = [
	{
		title: 'New message',
		body: 'Someone replied to your application',
		icon: faCommentDots,
		className: 'left-[0%] top-[6%]',
		tone: 'text-violet-600 bg-violet-100 border-violet-200/80',
		dot: 'bg-violet-500',
	},
	{
		title: 'Next steps',
		body: "You've advanced to the next round",
		icon: faWandMagicSparkles,
		className: 'right-[0%] top-[10%]',
		tone: 'text-teal-700 bg-teal-100 border-teal-200/80',
		dot: 'bg-teal-600',
	},
	{
		title: 'Profile viewed',
		body: 'Your profile was viewed today',
		icon: faEye,
		className: 'left-[0%] top-[42%]',
		tone: 'text-sky-700 bg-sky-100 border-sky-200/80',
		dot: 'bg-sky-500',
	},
	{
		title: 'Interview',
		body: 'Interview scheduled for next week',
		icon: faCalendarCheck,
		className: 'right-[0%] top-[42%]',
		tone: 'text-brand-pink-dark bg-brand-pink-lighter/70 border-brand-pink-light/45',
		dot: 'bg-brand-pink',
	},
	{
		title: 'Your résumé',
		body: 'Tailored for the role',
		icon: faFileLines,
		className: 'left-[1%] bottom-[4%]',
		tone: 'text-brand-pink bg-brand-pink-lighter/65 border-brand-pink-light/45',
		dot: 'bg-brand-pink-light',
		wide: true,
	},
	{
		title: 'Strong fit',
		body: 'Great match for this role',
		icon: faStar,
		className: 'right-[1%] bottom-[12%]',
		tone: 'text-teal-700 bg-teal-100 border-teal-200/80',
		dot: 'bg-teal-600',
	},
]

const trustItems = [
	{ label: 'Free to try', icon: faShieldHalved },
	{ label: 'Edit before export', icon: faWandMagicSparkles },
	{ label: 'Drafts stay private', icon: faCheck },
]

function OutcomeCard({ card, index }) {
	return (
		<div
			className={[
				'absolute z-20 hidden rounded-2xl border bg-white/92 px-4 py-3 text-left shadow-[0_18px_42px_-28px_rgba(17,24,39,0.42)] ring-1 ring-white/80 backdrop-blur-sm sm:block',
				card.wide ? 'w-[13.25rem]' : 'w-[12.25rem]',
				card.className,
			].join(' ')}
			style={{
				animation: `cta-outcome-float ${7.5 + index * 0.45}s ease-in-out infinite`,
				animationDelay: `${index * -0.5}s`,
			}}
			aria-hidden
		>
			<span className={`absolute right-3 top-3 size-2 rounded-full ${card.dot}`} />
			<div className="flex items-start gap-3">
				<div className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border ${card.tone}`}>
					<FontAwesomeIcon icon={card.icon} className="size-5" />
				</div>
				<div className="min-w-0 pt-0.5">
					<p className="text-[0.92rem] font-bold leading-tight text-gray-900">{card.title}</p>
					<p className="mt-1 text-[12px] font-medium leading-relaxed text-gray-500">{card.body}</p>
				</div>
			</div>
			{card.wide ? (
				<div className="mt-3 space-y-1.5">
					<div className="h-1.5 w-[74%] rounded-full bg-gray-300/70" />
					<div className="h-1.5 w-[88%] rounded-full bg-gray-300/62" />
					<div className="h-1.5 w-[58%] rounded-full bg-gray-300/54" />
					<div className="mt-3 flex gap-2">
						<div className="h-2 w-20 rounded-full bg-violet-300/75" />
						<div className="h-2 w-16 rounded-full bg-teal-300/75" />
					</div>
				</div>
			) : null}
		</div>
	)
}

function CharacterAnchor() {
	return (
		<div className="pointer-events-none absolute inset-x-[18%] bottom-0 z-10 hidden h-[74%] sm:block" aria-hidden>
			{/* Soft wash behind the figure so the cutout reads on cream without a “card”. */}
			<div className="absolute bottom-0 left-1/2 h-[78%] w-[88%] max-w-[280px] -translate-x-1/2 rounded-t-[6rem] bg-gradient-to-b from-brand-pink-lighter/30 via-white/35 to-transparent" />
			<img
				src="/cta-person.png"
				alt=""
				className="absolute bottom-[-10%] left-1/2 h-[min(92%, 20rem)] w-auto max-w-[min(94%,440px)] -translate-x-1/2 object-contain object-bottom"
				loading="lazy"
				decoding="async"
			/>
			<div className="absolute bottom-0 left-1/2 h-[22%] w-[min(100%,18rem)] -translate-x-1/2 rounded-[50%] bg-brand-pink-lighter/22 blur-md" />
		</div>
	)
}

function CtaVisualStage() {
	return (
		<div className="relative min-h-[28rem] overflow-visible lg:min-h-[36rem]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_72%_at_50%_48%,rgba(250,205,205,0.22),transparent_55%),radial-gradient(circle_at_58%_68%,rgba(255,255,255,0.35),transparent_46%)]" aria-hidden />
			{/*
				Dashed halo: true ellipse so it stays circular (cubic paths with sharp peaks read “triangle”).
				cx,cy = center | rx,ry = radii. Bottom clips if cy+ry exceeds viewBox height (was 318+303 > 600).
			*/}
			<svg
				className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
				viewBox="0 0 960 624"
				preserveAspectRatio="none"
				aria-hidden
			>
				<ellipse
					cx="460"
					cy="328"
					rx="392"
					ry="318"
					fill="none"
					stroke="#f3aaa2"
					strokeWidth="2"
					strokeDasharray="9 11"
					opacity="0.5"
				/>
			</svg>

			<CharacterAnchor />

			{outcomeCards.map((card, index) => (
				<OutcomeCard key={card.title} card={card} index={index} />
			))}

			<div className="absolute bottom-[9%] left-1/2 z-30 flex size-20 -translate-x-1/2 items-center justify-center rounded-full border-[10px] border-brand-pink-lighter/75 bg-brand-pink text-white shadow-[0_24px_46px_-22px_rgba(214,86,86,0.75)]" aria-hidden>
				<FontAwesomeIcon icon={faCheck} className="size-8" />
			</div>

			<span className="absolute left-[4%] top-[28%] text-3xl font-bold text-violet-300/80" aria-hidden>+</span>
			<span className="absolute right-[4%] top-[32%] text-3xl font-bold text-teal-300/80" aria-hidden>+</span>
			<span className="absolute bottom-[11%] right-[4%] text-3xl font-bold text-amber-300/80" aria-hidden>+</span>
		</div>
	)
}

export default function LandingCta() {
	const navigate = useNavigate()
	const handleStart = () => navigate('/auth')

	return (
		<section className="relative overflow-hidden bg-cream px-3 py-14 sm:px-4 md:px-5 md:py-20">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-pink-lighter/28 to-transparent" aria-hidden />
			<div className="relative mx-auto max-w-[min(1420px,94vw)]">
				<div className="grid min-h-[42rem] items-center gap-8 px-2 py-8 sm:px-4 md:px-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(34rem,1fr)] lg:px-10 lg:py-12 xl:px-14">
					<div className="relative z-20 max-w-xl text-center lg:text-left">
						<p className="text-[12px] font-bold uppercase tracking-[0.18em] text-brand-pink">Ready when you are</p>
						<div className="mx-auto mt-5 h-1 w-16 rounded-full bg-brand-pink lg:mx-0" aria-hidden />
						<h2 className="mt-10 text-pretty text-[2.75rem] font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-[3.5rem] lg:text-[4.15rem]">
							Send a résumé worth reading.
						</h2>
						<p className="mx-auto mt-6 max-w-[38rem] text-[1.08rem] leading-relaxed text-gray-600 md:text-xl lg:mx-0">
							Start with your experience, tailor it to the role, and create a version that makes your fit easier to see.
						</p>

						<div className="mt-9 flex flex-nowrap justify-center gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:justify-start [&::-webkit-scrollbar]:hidden">
							<button
								type="button"
								onClick={handleStart}
								className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-pink px-7 py-4 text-base font-bold text-white shadow-[0_18px_32px_-20px_rgba(214,86,86,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark hover:shadow-[0_24px_42px_-24px_rgba(190,70,70,0.9)] sm:min-w-[13rem]"
							>
								Try Taylor.io
								<FontAwesomeIcon icon={faArrowRight} className="size-3.5" aria-hidden />
							</button>
							<button
								type="button"
								onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
								className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-brand-pink/45 bg-white px-7 py-4 text-base font-bold text-brand-pink shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-pink-lighter/22 sm:min-w-[13rem]"
							>
								See how it works
								<FontAwesomeIcon icon={faArrowRight} className="size-3.5" aria-hidden />
							</button>
						</div>

						<div className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-gray-500 lg:justify-start">
							{trustItems.map((item, index) => (
								<div key={item.label} className="inline-flex items-center gap-2">
									<FontAwesomeIcon icon={item.icon} className="size-4 text-brand-pink" aria-hidden />
									<span>{item.label}</span>
									{index < trustItems.length - 1 ? <span className="ml-2 size-1 rounded-full bg-brand-pink" aria-hidden /> : null}
								</div>
							))}
						</div>
					</div>

					<CtaVisualStage />
				</div>
			</div>

			<style>{`
				@keyframes cta-outcome-float {
					0%, 100% { transform: translate3d(0, 0, 0); }
					45% { transform: translate3d(0, -7px, 0); }
					72% { transform: translate3d(0, 3px, 0); }
				}

				@media (prefers-reduced-motion: reduce) {
					[style*="cta-outcome-float"] {
						animation: none !important;
					}
				}
			`}</style>
		</section>
	)
}
