// Above-the-fold story + pipeline illustration — grabs attention before cream sections

import { useNavigate } from 'react-router-dom'
import HeroPipelineIllustration from './HeroPipelineIllustration'

export default function LandingHero() {
	const navigate = useNavigate()
	return (
		<section className="landing-hero-mesh relative flex min-h-0 flex-1 flex-col overflow-hidden text-white">
			<div className="landing-hero-orb pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
			<div className="landing-hero-orb-delayed pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.02),transparent_35%,rgba(0,0,0,0.06))]" />

			<div className="relative mx-auto flex min-h-0 w-full max-w-[min(1400px,98vw)] flex-1 flex-col justify-center px-4 py-8 md:px-6 md:py-8 xl:pl-5 xl:pr-10 2xl:pl-6 2xl:pr-12">
				<div className="grid gap-14 lg:grid-cols-[minmax(0,0.5fr)_minmax(288px,1.32fr)] lg:items-center lg:gap-12 xl:grid-cols-[minmax(0,0.46fr)_minmax(320px,1.42fr)] xl:gap-14 2xl:gap-16">
					<div className="animate-fade-in min-w-0 max-w-xl text-center lg:max-w-[22rem] lg:text-left xl:max-w-[23rem]">
						{/* Keep "tailored right" as one phrase so narrow columns don't split the product hook. */}
						<h1 className="mb-5 text-[2.75rem] font-bold leading-[1.07] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-[3.5rem]">
							Your story,{' '}
							<span className="whitespace-nowrap">tailored right.</span>
						</h1>
						<p className="mx-auto mb-8 max-w-xl pt-2 text-lg font-normal leading-relaxed text-white/[0.93] md:text-xl lg:mx-0 lg:max-w-none">
							Shape your narrative for the role you want, then ship a résumé that still sounds like you.
						</p>
						{/* Single-row CTAs: nowrap + shared baseline so the pair doesn't stack or wrap awkwardly in the narrow hero column. */}
						<div className="-mx-1 flex flex-nowrap items-center justify-center gap-2.5 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:gap-3 sm:overflow-visible sm:px-0 lg:justify-start [&::-webkit-scrollbar]:hidden">
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="inline-flex shrink-0 whitespace-nowrap rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl sm:px-7 sm:text-base"
							>
								Start free
							</button>
							<button
								type="button"
								onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
								className="inline-flex shrink-0 whitespace-nowrap rounded-xl border border-white/40 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:px-7 sm:text-base"
							>
								See what&apos;s inside
							</button>
						</div>
					</div>

					<div className="landing-hero-visual relative flex min-h-0 min-w-0 w-full justify-center lg:justify-start">
						<HeroPipelineIllustration />
					</div>
				</div>
			</div>
		</section>
	)
}
