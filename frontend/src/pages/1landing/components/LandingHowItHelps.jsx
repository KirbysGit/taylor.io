// How it helps — split layout: emotional intro (left), six compact proof cards (right, 2×3)

import {
	faArrowsRotate,
	faClipboardList,
	faEye,
	faFileLines,
	faLayerGroup,
	faLink,
	faSliders,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** Diamond glints — aligns with style-mock sparkle language on landing. */
function HelpsSparkle(props) {
	const base =
		'pointer-events-none absolute block shadow-sm ring-1 ring-white/70 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]'
	return <span className={`${base} ${props.className}`} aria-hidden />
}

/** Icon color only — wells share one neutral shell so every card matches. */
const laneIcon = {
	pink: 'text-brand-pink',
	violet: 'text-violet-600',
	teal: 'text-teal-600',
	sky: 'text-sky-600',
}

const laneSparkle = {
	pink: 'bg-gradient-to-br from-brand-pink to-brand-pink-dark',
	violet: 'bg-violet-500',
	teal: 'bg-teal-500',
	sky: 'bg-sky-500',
}

/** Border + shadow on hover — matches each lane’s icon accent (pink / violet / teal / sky). */
const laneHover = {
	pink: 'hover:border-brand-pink/42 hover:shadow-[0_12px_32px_-10px_rgba(214,86,86,0.26)]',
	violet: 'hover:border-violet-400/50 hover:shadow-[0_12px_32px_-10px_rgba(139,92,246,0.22)]',
	teal: 'hover:border-teal-400/50 hover:shadow-[0_12px_32px_-10px_rgba(20,184,166,0.24)]',
	sky: 'hover:border-sky-400/50 hover:shadow-[0_12px_32px_-10px_rgba(14,165,233,0.24)]',
}

const laneIconWellHover = {
	pink: 'group-hover/card:border-brand-pink/32 group-hover/card:shadow-[0_2px_12px_-4px_rgba(214,86,86,0.22)]',
	violet: 'group-hover/card:border-violet-300/55 group-hover/card:shadow-[0_2px_12px_-4px_rgba(139,92,246,0.18)]',
	teal: 'group-hover/card:border-teal-300/55 group-hover/card:shadow-[0_2px_12px_-4px_rgba(20,184,166,0.2)]',
	sky: 'group-hover/card:border-sky-300/55 group-hover/card:shadow-[0_2px_12px_-4px_rgba(14,165,233,0.2)]',
}

const benefits = [
	{
		id: 'blank',
		title: 'No blank-page panic',
		body: 'Start from your saved profile whenever a new role looks interesting.',
		lane: 'pink',
		icon: faClipboardList,
	},
	{
		id: 'rewrite',
		title: 'Less rewriting',
		body: 'Reuse your best experience, projects, education, and skills, then reshape them for the role.',
		lane: 'violet',
		icon: faArrowsRotate,
	},
	{
		id: 'recruiters',
		title: 'Clearer for recruiters',
		body: 'Put the most relevant parts of your background where they are easier to scan.',
		lane: 'teal',
		icon: faEye,
	},
	{
		id: 'one-profile',
		title: 'One organized profile',
		body: 'Keep your career data in one place instead of digging through old résumés and notes.',
		lane: 'pink',
		icon: faLayerGroup,
	},
	{
		id: 'honest',
		title: 'Tailored, not fake',
		body: 'Use the job description as a guide while staying grounded in your real experience.',
		lane: 'violet',
		icon: faLink,
	},
	{
		id: 'polish',
		title: 'Polished before sending',
		body: 'Adjust layout, color, spacing, and section style once the content is ready.',
		lane: 'sky',
		icon: faSliders,
	},
]

export default function LandingHowItHelps() {
	return (
		<section
			id="how-it-helps"
			aria-labelledby="how-it-helps-heading"
			className="relative border-b border-gray-200/70 border-t border-brand-pink/20 bg-gradient-to-b from-brand-pink-lighter/45 via-section-wash to-cream py-14 md:py-20"
		>
			<div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/50 to-transparent" aria-hidden />

			<div className="relative mx-auto max-w-[min(1280px,94vw)] px-3 sm:px-4 md:px-5">
				<div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:items-center lg:gap-12 xl:gap-14">
					<div className="flex flex-col items-start text-left lg:col-span-5">
						<div className="w-full max-w-xl">
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-pink sm:text-[0.8125rem] sm:tracking-[0.13em]">
								Built for the job search
							</p>
							<h2
								id="how-it-helps-heading"
								className="mt-4 text-pretty text-[2rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-[2.125rem] md:text-[2.375rem] lg:text-[3.05rem]"
							>
								<span className="block">Less résumé stress.</span>
								<span className="mt-2 block text-brand-pink md:mt-2.5">More momentum.</span>
							</h2>
							<p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-gray-600 md:mt-6 md:text-lg md:leading-snug lg:text-xl">
								Organize your career data once, tailor each version faster, and spend more time on the opportunities that
								actually move you forward.
							</p>
						</div>
					</div>

					<div className="lg:col-span-7">
						<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5" role="list">
							{benefits.map((b) => (
								<li key={b.id}>
									<div
										className={[
											'group/card relative h-full overflow-hidden rounded-xl border border-gray-200/75 bg-gradient-to-br from-white via-[rgb(252,249,244)] to-cream/55 px-4 py-4 shadow-sm shadow-gray-900/[0.05] ring-1 ring-white/90',
											'motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out',
											laneHover[b.lane],
											'motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
										].join(' ')}
									>
										<HelpsSparkle
											className={`right-3 top-3 size-2 -rotate-[12deg] opacity-90 transition-opacity duration-200 group-hover/card:opacity-100 ${laneSparkle[b.lane]}`}
											aria-hidden
										/>

										<div className="relative z-[1] flex flex-col">
											<div
												className={[
													'mb-3.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] ring-1 ring-black/[0.04] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300',
													laneIconWellHover[b.lane],
												].join(' ')}
												aria-hidden
											>
												<FontAwesomeIcon
													icon={b.icon}
													className={`h-[1.05rem] w-[1.05rem] shrink-0 ${laneIcon[b.lane]}`}
													aria-hidden
												/>
											</div>
											<h3 className="text-[0.9375rem] font-bold leading-snug text-gray-900">{b.title}</h3>
											<p className="mt-2 text-[13px] leading-relaxed text-gray-600">{b.body}</p>
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	)
}
