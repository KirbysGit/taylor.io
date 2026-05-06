// Four-step flow — profile → build → generate → style (phone-style cards on bright white below cream “helps”; illustrations later)

import { Fragment, useEffect, useState } from 'react'

import HowItWorksChooseBuildCard from './HowItWorksChooseBuildCard'
import HowItWorksCreateProfileCard from './HowItWorksCreateProfileCard'
import HowItWorksGenerateResumeCard from './HowItWorksGenerateResumeCard'
import HowItWorksStepArrow from './HowItWorksStepArrow'
import HowItWorksStyleCard from './HowItWorksStyleCard'

const DEMO_MS = 4000

/** Landing-only: pauses auto-advance so WCAG prefers-reduced-motion users get stable “done” mocks, not looping motion. */
function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false)
	useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
		const sync = () => setReduced(mq.matches)
		sync()
		mq.addEventListener('change', sync)
		return () => mq.removeEventListener('change', sync)
	}, [])
	return reduced
}

const steps = [
	{
		id: 'profile',
		title: 'Create Profile',
		subtitle: 'Add your background so later steps have something real to work from.',
	},
	{
		id: 'build',
		title: 'Choose Build Style',
		subtitle: 'Job description or what is already in your profile — then a couple of build switches.',
	},
	{
		id: 'generate',
		title: 'Generate Resume',
		subtitle: 'Get a structured draft you can scan and tweak in minutes.',
	},
	{
		id: 'style',
		title: 'Style It!',
		subtitle: 'Dial in layout and accents before you export or share.',
	},
]

export default function LandingHowItWorks() {
	const prefersReducedMotion = usePrefersReducedMotion()
	const [demoStepIndex, setDemoStepIndex] = useState(0)

	// Cycle which step reads as “live” so placeholders and controls can choreograph without user input.
	useEffect(() => {
		if (prefersReducedMotion) return
		const id = window.setInterval(() => {
			setDemoStepIndex((i) => (i + 1) % steps.length)
		}, DEMO_MS)
		return () => window.clearInterval(id)
	}, [prefersReducedMotion])

	return (
		<section
			id="how-it-works"
			className="border-b border-gray-200/60 bg-white-bright py-16 md:py-20 shadow-[inset_0_1px_0_0_rgba(214,86,86,0.05)]"
		>
			{/* No outer master card — section uses main bg-cream like the diagram. */}
			<div className="mx-auto max-w-[min(1280px,94vw)] px-3 sm:px-4 md:px-5">
				<div className="mx-auto mb-10 max-w-xl text-center md:mb-14">
					<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-pink">How it works</p>
					<h2 className="mt-3 text-balance text-2xl font-bold tracking-tight text-gray-900 md:mt-3.5 md:text-3xl">
						Four steps to a résumé you&apos;ll send
					</h2>
					<p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-gray-600 md:mt-4 md:text-lg">
						Profile, build, generate, style—each step has one job.
					</p>
				</div>

				{/* Phone shells ~400px tall — symmetric padding so every step mock shares the same inset from the rim. */}
				<div className="-mx-1 sm:-mx-4 md:mx-0">
					{/*
						Flex row + connectors (not ol/li): dashed arc traces + hub between snaps.
						Sub-lg: horizontal scroll; lg+: single centered row.
					*/}
					<div
						role="list"
						className="flex flex-nowrap items-start justify-start gap-x-0 overflow-x-auto pb-1 pl-3 pr-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:pl-4 sm:pr-3 lg:justify-center lg:gap-x-0 lg:overflow-visible lg:pb-0 lg:pl-0 lg:pr-0 lg:pt-0 [&::-webkit-scrollbar]:hidden"
					>
						{steps.map(({ id, title, subtitle }, index) => (
							<Fragment key={id}>
								<div
									role="listitem"
									className="flex w-[min(92vw,19.5rem)] shrink-0 snap-start snap-always flex-col items-center gap-6 sm:gap-7 md:gap-8 sm:w-[min(90vw,20.5rem)] lg:w-[18.5rem] xl:w-[19.5rem]"
								>
									{(() => {
										// Content “filled” on every card when motion is reduced; otherwise only the timed step plays the demo.
										const demoContentActive =
											prefersReducedMotion || demoStepIndex === index
										const shellPulse =
											!prefersReducedMotion && demoStepIndex === index
										return (
									<div
										className={[
											'relative z-10 mx-auto flex h-[min(52vh,400px)] min-h-0 w-full max-w-[19.5rem] flex-col overflow-visible rounded-[1.75rem] border bg-white p-4 lg:max-w-none motion-safe:transition-[box-shadow,transform,border-color] motion-safe:duration-500 motion-safe:ease-out',
											shellPulse
												? 'border-brand-pink/35 shadow-[0_18px_40px_-12px_rgba(214,86,86,0.28)] shadow-md ring-1 ring-brand-pink/25 motion-safe:scale-[1.02]'
												: 'border-gray-200/80 shadow-md',
										].join(' ')}
									>
										{id === 'profile' ? (
											<HowItWorksCreateProfileCard demoActive={demoContentActive} />
										) : id === 'build' ? (
											<HowItWorksChooseBuildCard demoActive={demoContentActive} />
										) : id === 'generate' ? (
											<HowItWorksGenerateResumeCard demoActive={demoContentActive} />
										) : (
											<HowItWorksStyleCard demoActive={demoContentActive} />
										)}
									</div>
										)
									})()}
									<div className="mx-auto flex w-full max-w-[19.5rem] flex-col items-center gap-2 text-center lg:max-w-none xl:max-w-[20rem]">
										<div
											className={[
												'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark text-sm font-bold text-white shadow-md ring-4 ring-cream motion-safe:transition-[transform,box-shadow,opacity]',
												'motion-safe:duration-500 motion-safe:ease-out',
												!prefersReducedMotion && demoStepIndex === index
													? 'motion-safe:scale-110 shadow-lg ring-brand-pink/55'
													: !prefersReducedMotion
														? 'opacity-[0.85]'
														: '',
											].join(' ')}
										>
											{index + 1}
										</div>
										<h3 className="text-base font-bold leading-snug text-gray-900 md:text-lg">{title}</h3>
										<p className="text-sm leading-relaxed text-gray-600">{subtitle}</p>
									</div>
								</div>
								{index < steps.length - 1 ? (
									<div
										className="relative z-0 mt-[15%] flex w-11 shrink-0 flex-col items-center self-start [scroll-snap-align:none] sm:w-12 lg:mt-[15%] lg:w-14"
										aria-hidden
									>
										<HowItWorksStepArrow />
									</div>
								) : null}
							</Fragment>
						))}
					</div>
				</div>
			</div>
		</section>
	)
}
