// Connector between “How it works” steps — dashed parabola (SVG) + hub with FA arrow (decorative only).

import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function HowItWorksStepArrow() {
	return (
		<div
			className="relative z-0 -mx-4 flex min-h-[2.75rem] w-[calc(100%+2rem)] min-w-[5.25rem] max-w-[8.5rem] shrink-0 items-center justify-center sm:-mx-5 sm:w-[calc(100%+2.5rem)] sm:max-w-[9rem] lg:-mx-6"
			aria-hidden
		>
			{/* Parabola sits under the phones (parent z-index); bleeds past 0–100 so it reaches toward each card. */}
			<svg
				className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-14 w-full -translate-y-1/2 overflow-visible"
				viewBox="-4 0 108 40"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					className="how-it-works-step-trace text-brand-pink"
					d="M -2 30 Q 54 5 106 30"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeDasharray="3.2 5.5"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fb9eb6] to-brand-pink-dark text-white shadow-md ring-2 ring-white/95">
				<FontAwesomeIcon icon={faArrowRight} className="size-[0.95rem]" />
			</div>
		</div>
	)
}
