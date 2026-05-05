// Final conversion band — same mesh treat as hero for continuity

import { useNavigate } from 'react-router-dom'

export default function LandingCta() {
	const navigate = useNavigate()
	return (
		<section className="landing-hero-mesh relative overflow-hidden py-20 text-white md:py-24">
			<div className="pointer-events-none absolute inset-0 bg-black/10" />
			<div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
				<h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready when you are</h2>
				<p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
					Build something you&apos;re happy to attach — crisp, current, and unmistakably yours.
				</p>
				<button
					type="button"
					onClick={() => navigate('/auth')}
					className="mt-10 rounded-xl bg-white px-10 py-4 text-base font-semibold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl"
				>
					Create your workspace
				</button>
			</div>
		</section>
	)
}
