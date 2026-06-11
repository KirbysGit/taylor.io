import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faCircleCheck,
	faCloudArrowUp,
	faFileCircleQuestion,
	faHouse,
	faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import { GridIcon } from '@/components/icons'
import LandingHeader from '../1landing/components/LandingHeader'

const NOT_FOUND_GRAPHIC = '/not-found-graphic.png'

const trustItems = [
	{
		icon: faCloudArrowUp,
		label: 'Drafts saved',
		detail: 'Your work is secure.',
		tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
	},
	{
		icon: faShieldHalved,
		label: 'Profile safe',
		detail: 'Your data is secure.',
		tone: 'bg-violet-50 text-violet-700 ring-violet-200/70',
	},
	{
		icon: faCircleCheck,
		label: 'Nothing deleted',
		detail: "We've got your back.",
		tone: 'bg-amber-50 text-amber-700 ring-amber-200/70',
	},
]

const illustrationSparkles = [
	{ top: '12%', left: '19%', size: 22, color: '#d65656', rotate: -8, opacity: 0.72 },
	{ top: '20%', right: '8%', size: 34, color: '#f4bd5c', rotate: 9, opacity: 0.9 },
	{ top: '35%', left: '8%', size: 14, color: '#9a72e8', rotate: 15, opacity: 0.78 },
	{ top: '44%', right: '3%', size: 17, color: '#69bdb7', rotate: -12, opacity: 0.78 },
	{ bottom: '25%', left: '14%', size: 28, color: '#ef8585', rotate: 7, opacity: 0.76 },
]

function FilledSparkle({ size = 24, color = 'currentColor', rotate = 0, opacity = 1, style = {} }) {
	return (
		<svg
			viewBox="0 0 100 100"
			className="pointer-events-none absolute z-[2] drop-shadow-[0_5px_10px_rgba(80,42,42,0.12)]"
			style={{
				width: size,
				height: size,
				color,
				opacity,
				transform: `rotate(${rotate}deg)`,
				...style,
			}}
			aria-hidden
		>
			<path
				fill="currentColor"
				d="M50 0C49.2 24.2 39 39.8 0 50c39 10.2 49.2 25.8 50 50 .8-24.2 11-39.8 50-50C61 39.8 50.8 24.2 50 0Z"
			/>
		</svg>
	)
}

export default function NotFound() {
	const navigate = useNavigate()
	const [graphicAvailable, setGraphicAvailable] = useState(true)

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#fffaf3] text-gray-950">
			<div
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(250,205,205,0.32),transparent_27%),radial-gradient(circle_at_10%_86%,rgba(214,86,86,0.09),transparent_30%)]"
				aria-hidden
			/>

			<LandingHeader />

			<div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[96rem] flex-col px-4 pb-8 pt-24 sm:px-6 lg:px-8 lg:pb-5 lg:pt-28">
				<main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(34rem,0.9fr)_minmax(34rem,1.1fr)] lg:gap-4 lg:py-6 xl:grid-cols-[minmax(38rem,0.88fr)_minmax(40rem,1.12fr)]">
					<section className="relative z-10 max-w-[40rem] px-2 sm:px-5 lg:py-8 xl:px-7">
						<p className="text-[6rem] font-black leading-none tracking-tight text-brand-pink sm:text-[6rem] xl:text-[7.5rem]">
							404
						</p>
						<h1 className="mt-4 font-serif text-[clamp(2.6rem,4vw,3.75rem)] font-black leading-[1.05] tracking-tight text-[#111d37]">
							This page didn&rsquo;t<br /><span className="whitespace-nowrap">make the final draft.</span>
						</h1>
						<p className="mt-6 max-w-[35rem] text-base leading-relaxed text-gray-600 sm:text-lg">
							Looks like this link was hidden, moved, or never added. Let&rsquo;s get you back to the right place.
						</p>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={() => navigate('/')}
								className="inline-flex min-h-[4.25rem] items-center justify-center gap-3 rounded-2xl bg-brand-pink px-12 py-4 text-lg font-black text-white shadow-[0_16px_34px_-18px_rgba(214,86,86,0.82)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								<FontAwesomeIcon icon={faHouse} className="size-4" />
								Go home
							</button>
							<button
								type="button"
								onClick={() => navigate('/home')}
								className="inline-flex min-h-[4.25rem] items-center justify-center gap-3 rounded-2xl border border-brand-pink/35 bg-white px-12 py-4 text-lg font-black text-brand-pink-dark shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/55 hover:bg-brand-pink/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								<GridIcon className="size-[1.05rem]" />
								Back to dashboard
							</button>
						</div>
					</section>

					<section
						className="relative flex min-h-[25rem] w-full max-w-[52rem] items-center justify-end overflow-hidden lg:min-h-[38rem] lg:self-stretch lg:pl-16"
						aria-label="Page not found illustration"
					>
						<div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand-pink/20 bg-brand-pink/[0.035]" aria-hidden />
						{illustrationSparkles.map((sparkle, index) => (
							<FilledSparkle
								key={`${sparkle.color}-${index}`}
								size={sparkle.size}
								color={sparkle.color}
								rotate={sparkle.rotate}
								opacity={sparkle.opacity}
								style={{
									top: sparkle.top,
									right: sparkle.right,
									bottom: sparkle.bottom,
									left: sparkle.left,
								}}
							/>
						))}

						{graphicAvailable ? (
							<img
								src={NOT_FOUND_GRAPHIC}
								alt="A misplaced resume page waiting to return to the right draft"
								className="relative z-[1] max-h-[42rem] w-full object-contain object-center drop-shadow-[0_26px_32px_rgba(81,52,45,0.12)]"
								onError={() => setGraphicAvailable(false)}
							/>
						) : (
							<div className="relative z-[1] flex aspect-[1.24/1] w-[min(42rem,88%)] items-center justify-center rounded-[2rem] border border-dashed border-brand-pink/24 bg-white/48 p-8 text-center shadow-[0_28px_80px_-48px_rgba(80,42,42,0.35)]">
								<div>
									<span className="mx-auto flex size-20 items-center justify-center rounded-[1.4rem] bg-brand-pink/[0.09] text-brand-pink-dark">
										<FontAwesomeIcon icon={faFileCircleQuestion} className="size-8" />
									</span>
									<p className="mt-5 font-serif text-2xl font-black text-gray-950">Illustration space</p>
									<p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500">
										Add your finished artwork as <span className="font-bold text-gray-700">not-found-graphic.png</span> in the public folder.
									</p>
								</div>
							</div>
						)}

						</section>
				</main>
			</div>
		</div>
	)
}
