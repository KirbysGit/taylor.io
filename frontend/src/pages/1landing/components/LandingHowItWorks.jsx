// Four-step flow — profile → build → generate → style (phone-style cards on cream; illustrations later)

import HowItWorksChooseBuildCard from './HowItWorksChooseBuildCard'
import HowItWorksCreateProfileCard from './HowItWorksCreateProfileCard'
import HowItWorksGenerateResumeCard from './HowItWorksGenerateResumeCard'
import HowItWorksStyleCard from './HowItWorksStyleCard'

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
	return (
		<section id="how-it-works" className="border-b border-gray-200/60 py-16 md:py-20">
			{/* No outer master card — section uses main bg-cream like the diagram. */}
			<div className="mx-auto max-w-[min(1280px,94vw)] px-3 sm:px-4 md:px-5">
				<div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
					<h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">How it works</h2>
					<p className="mt-3 text-gray-600">
						Four beats from a blank profile to something you are happy to send.
					</p>
				</div>

				{/* Phone shells ~400px tall — inner mocks use justify-between / padding to fill the frame. */}
				<div className="-mx-1 sm:-mx-4 md:mx-0">
					<ol className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-4 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 md:pt-0 lg:grid-cols-4 lg:gap-12 [&::-webkit-scrollbar]:hidden">
						{steps.map(({ id, title, subtitle }, index) => (
							<li
								key={id}
								className="flex w-[min(88vw,17.5rem)] shrink-0 snap-start snap-always flex-col items-center gap-3.5 sm:w-[min(86vw,18.5rem)] md:w-auto md:min-w-0"
							>
								<div className="mx-auto flex h-[min(52vh,400px)] w-full max-w-[17.5rem] flex-col overflow-visible rounded-[1.75rem] border border-gray-200/80 bg-white px-4 pb-4 pt-5 shadow-md md:max-w-[15.5rem] lg:max-w-[17rem] xl:max-w-[17.5rem]">
									{id === 'profile' ? (
										<HowItWorksCreateProfileCard />
									) : id === 'build' ? (
										<HowItWorksChooseBuildCard />
									) : id === 'generate' ? (
										<HowItWorksGenerateResumeCard />
									) : (
										<HowItWorksStyleCard />
									)}
								</div>
								<div className="mx-auto flex w-full max-w-[17.5rem] flex-col items-center gap-2 text-center md:max-w-[15.5rem] lg:max-w-[17rem] xl:max-w-[18rem]">
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark text-sm font-bold text-white shadow-md ring-4 ring-cream">
										{index + 1}
									</div>
									<h3 className="text-base font-bold leading-snug text-gray-900 md:text-lg">{title}</h3>
									<p className="text-sm leading-relaxed text-gray-600">{subtitle}</p>
								</div>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	)
}
