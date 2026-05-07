import { faArrowRight, faBriefcase, faCheck, faFileLines, faLayerGroup, faMousePointer, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'

const proofPoints = [
	{ label: 'One profile', icon: faLayerGroup },
	{ label: 'Tailored versions', icon: faWandMagicSparkles },
	{ label: 'Ready to send', icon: faCheck },
]

const floatingTokens = [
	{
		label: 'Experience',
		icon: faLayerGroup,
		className: 'left-4 top-8 rotate-[-5deg]',
		tone: 'text-brand-pink border-brand-pink/26 bg-white/[0.92]',
	},
	{
		label: 'Target role',
		icon: faBriefcase,
		className: 'right-8 top-12 rotate-[4deg]',
		tone: 'text-violet-600 border-violet-300/40 bg-white/[0.9]',
	},
	{
		label: 'Résumé draft',
		icon: faFileLines,
		className: 'left-10 bottom-10 rotate-[4deg]',
		tone: 'text-sky-600 border-sky-300/45 bg-white/[0.9]',
	},
	{
		label: 'Ready',
		icon: faCheck,
		className: 'right-10 bottom-8 rotate-[-4deg]',
		tone: 'text-teal-700 border-teal-300/45 bg-white/[0.92]',
	},
]

function FloatingToken({ token, index }) {
	return (
		<div
			className={`absolute hidden items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-bold shadow-[0_20px_40px_-30px_rgba(17,24,39,0.65)] ring-1 ring-white/70 backdrop-blur-sm sm:inline-flex ${token.className} ${token.tone}`}
			style={{
				animation: `cta-token-float ${7.2 + index * 0.6}s ease-in-out infinite`,
				animationDelay: `${index * -0.45}s`,
			}}
			aria-hidden
		>
			<span className="inline-flex size-7 items-center justify-center rounded-xl bg-current/10">
				<FontAwesomeIcon icon={token.icon} className="size-3.5" />
			</span>
			{token.label}
		</div>
	)
}

function StartButtonSpotlight({ onStart }) {
	return (
		<div className="relative mx-auto flex min-h-[20rem] w-full max-w-[39rem] items-center justify-center px-2 sm:min-h-[24rem]">
			<div className="landing-hero-orb pointer-events-none absolute left-8 top-8 h-44 w-44 rounded-full bg-white/16 blur-3xl" aria-hidden />
			<div className="landing-hero-orb-delayed pointer-events-none absolute bottom-2 right-8 h-56 w-56 rounded-full bg-white/14 blur-3xl" aria-hidden />
			<div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" aria-hidden />

			{floatingTokens.map((token, index) => (
				<FloatingToken key={token.label} token={token} index={index} />
			))}

			<div className="relative">
				<div className="absolute -inset-8 rounded-[2rem] bg-white/10 blur-2xl" aria-hidden />
				<div className="absolute -inset-3 rounded-[1.65rem] border border-white/18" aria-hidden />
				<button
					type="button"
					onClick={onStart}
					className="relative inline-flex min-w-[17rem] items-center justify-center gap-3 rounded-[1.45rem] border border-white/25 bg-white px-7 py-5 text-lg font-black text-brand-pink shadow-[0_30px_70px_-28px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-[0_36px_78px_-30px_rgba(0,0,0,0.58)] sm:min-w-[20rem] sm:px-9"
				>
					Try Taylor.io
					<FontAwesomeIcon icon={faArrowRight} className="size-4" aria-hidden />
				</button>
				<div className="absolute -right-7 -bottom-8 flex items-center gap-2 rounded-full border border-white/24 bg-white/[0.12] px-3 py-2 text-white shadow-[0_18px_34px_-26px_rgba(0,0,0,0.55)] backdrop-blur" aria-hidden>
					<FontAwesomeIcon icon={faMousePointer} className="size-4 -rotate-12" />
					<span className="size-2 rounded-full bg-white/85 shadow-[0_0_0_7px_rgba(255,255,255,0.16)]" />
				</div>
			</div>
		</div>
	)
}

export default function LandingCta() {
	const navigate = useNavigate()
	const handleStart = () => navigate('/auth')

	return (
		<section className="landing-hero-mesh relative overflow-hidden border-t border-white/10 py-16 text-white md:py-20">
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.04),rgba(0,0,0,0.14))]" />
			<div className="relative mx-auto grid max-w-[min(1280px,94vw)] items-center gap-10 px-3 sm:px-4 md:px-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(31rem,1fr)] lg:gap-12">
				<div className="max-w-xl text-center lg:text-left">
					<p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/72">Ready when you are</p>
					<h2 className="mt-4 text-pretty text-[2.35rem] font-bold leading-[1.08] tracking-tight sm:text-[3rem]">
						Ready to tailor your next résumé?
					</h2>
					<p className="mx-auto mt-5 max-w-[42rem] text-[1.05rem] leading-relaxed text-white/88 md:text-lg lg:mx-0">
						Start with your experience. Choose the role. Generate the version that fits.
					</p>

					<div className="mt-7 flex flex-wrap justify-center gap-2.5 lg:justify-start">
						{proofPoints.map((point) => (
							<div key={point.label} className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.09] px-3 py-1.5 text-[13px] font-semibold text-white/90 backdrop-blur">
								<FontAwesomeIcon icon={point.icon} className="size-3.5 text-white/82" aria-hidden />
								{point.label}
							</div>
						))}
					</div>

					<div className="mt-9 flex flex-nowrap justify-center gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:justify-start [&::-webkit-scrollbar]:hidden">
						<button
							type="button"
							onClick={handleStart}
							className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl sm:px-8 sm:text-base"
						>
							Try Taylor.io
							<FontAwesomeIcon icon={faArrowRight} className="size-3.5" aria-hidden />
						</button>
						<button
							type="button"
							onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
							className="inline-flex shrink-0 whitespace-nowrap rounded-xl border border-white/36 bg-white/[0.06] px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/[0.13] sm:px-8 sm:text-base"
						>
							See how it works
						</button>
					</div>
				</div>

				<StartButtonSpotlight onStart={handleStart} />
			</div>

			<style>{`
				@keyframes cta-token-float {
					0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--tw-rotate)); }
					45% { transform: translate3d(0, -7px, 0) rotate(var(--tw-rotate)); }
					72% { transform: translate3d(0, 3px, 0) rotate(var(--tw-rotate)); }
				}

				@media (prefers-reduced-motion: reduce) {
					[style*="cta-token-float"] {
						animation: none !important;
					}
				}
			`}</style>
		</section>
	)
}
