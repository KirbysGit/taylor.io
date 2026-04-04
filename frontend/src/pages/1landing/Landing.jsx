// landing/Landing.jsx — marketing landing (cream + brand-pink, Inter)

import { useNavigate } from 'react-router-dom'

function HeroPreview() {
	return (
		<div
			className="landing-preview-float relative mx-auto w-full max-w-[min(100%,420px)] select-none"
			aria-hidden="true"
		>
			{/* soft stack */}
			<div className="absolute -right-2 top-8 h-[88%] w-[92%] rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-[2px]" />
			<div className="absolute -left-3 top-4 h-[88%] w-[92%] rounded-2xl bg-black/5 shadow-lg ring-1 ring-black/5" />
			{/* main “document” */}
			<div className="relative overflow-hidden rounded-2xl bg-cream shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
				<div className="flex h-3 bg-gradient-to-r from-brand-pink/90 to-brand-pink-dark" />
				<div className="space-y-5 px-7 pb-10 pt-8">
					<div className="space-y-2">
						<div className="mx-auto h-2.5 w-2/5 rounded-full bg-gray-200" />
						<div className="mx-auto h-2 w-3/5 rounded-full bg-gray-100" />
					</div>
					<div className="flex gap-3 border-b border-gray-200/80 pb-5">
						<div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-brand-pink-lighter to-brand-pink-light ring-2 ring-white" />
						<div className="flex flex-1 flex-col justify-center gap-2 pt-0.5">
							<div className="h-2.5 w-3/4 rounded bg-gray-800/90" />
							<div className="h-2 w-1/2 rounded bg-gray-300" />
						</div>
					</div>
					<div className="space-y-2.5">
						<div className="h-2 w-full rounded bg-gray-200/90" />
						<div className="h-2 w-[94%] rounded bg-gray-100" />
						<div className="h-2 w-[88%] rounded bg-gray-100" />
					</div>
					<div className="grid grid-cols-2 gap-3 pt-2">
						<div className="rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm">
							<div className="mb-2 h-1.5 w-1/3 rounded bg-brand-pink/30" />
							<div className="h-1.5 w-full rounded bg-gray-100" />
							<div className="mt-1.5 h-1.5 w-4/5 rounded bg-gray-100" />
						</div>
						<div className="rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm">
							<div className="mb-2 h-1.5 w-2/5 rounded bg-brand-pink/30" />
							<div className="h-1.5 w-full rounded bg-gray-100" />
							<div className="mt-1.5 h-1.5 w-3/4 rounded bg-gray-100" />
						</div>
					</div>
					<div className="flex items-center gap-2 pt-1">
						<div className="h-8 flex-1 rounded-lg bg-brand-pink/15 ring-1 ring-brand-pink/20" />
						<div className="h-8 w-20 rounded-lg bg-gray-200/80" />
					</div>
				</div>
			</div>
		</div>
	)
}

function Landing() {
	const navigate = useNavigate()
	return (
		<div
			className="landing-scrollbar min-h-screen overflow-y-auto bg-cream"
			style={{ height: '100vh', overflowY: 'auto' }}
		>
			{/* Top bar */}
			<header className="landing-hero-mesh sticky top-0 z-50 border-b border-white/10 text-white backdrop-blur-[8px] supports-[backdrop-filter]:bg-brand-pink/80">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
					<span className="text-sm font-semibold tracking-tight md:text-base">taylor.io</span>
					<nav className="flex items-center gap-2 sm:gap-3">
						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
						>
							Sign in
						</button>
						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-pink shadow-md transition hover:bg-cream hover:shadow-lg"
						>
							Get started
						</button>
					</nav>
				</div>
			</header>

			<section className="landing-hero-mesh relative overflow-hidden text-white">
				<div className="landing-hero-orb pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
				<div className="landing-hero-orb-delayed pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.02),transparent_35%,rgba(0,0,0,0.06))]" />

				<div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 md:gap-16 md:px-8 md:pb-24 md:pt-16 lg:grid-cols-2 lg:items-center lg:gap-10">
					<div className="animate-fade-in text-center lg:text-left">
						<p className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/95 backdrop-blur-sm md:text-sm">
							Resumes &amp; portfolios — one polished workflow
						</p>
						<h1 className="mb-5 text-[2.75rem] font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-[3.5rem]">
							Look as good on paper as you do in person.
						</h1>
						<p className="mx-auto mb-8 max-w-xl text-lg font-light leading-relaxed text-white/90 md:text-xl lg:mx-0">
							Structure your story, tune the visuals, export with confidence — without fighting the layout.
						</p>
						<div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="w-full rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-pink shadow-lg transition hover:-translate-y-0.5 hover:bg-cream hover:shadow-xl sm:w-auto"
							>
								Start free
							</button>
							<button
								type="button"
								onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
								className="w-full rounded-xl border border-white/40 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
							>
								See what&apos;s inside
							</button>
						</div>
						<dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-8 text-center text-sm sm:text-base lg:text-left">
							<div>
								<dt className="text-white/60">Templates</dt>
								<dd className="mt-1 font-semibold tabular-nums">Curated</dd>
							</div>
							<div>
								<dt className="text-white/60">Exports</dt>
								<dd className="mt-1 font-semibold">PDF &amp; Word</dd>
							</div>
							<div>
								<dt className="text-white/60">Focus</dt>
								<dd className="mt-1 font-semibold">ATS-aware</dd>
							</div>
						</dl>
					</div>

					<div className="flex justify-center lg:justify-end">
						<HeroPreview />
					</div>
				</div>
			</section>

			<main className="bg-cream">
				<section
					id="features"
					className="border-b border-gray-200/60 py-20 md:py-28"
				>
					<div className="mx-auto max-w-6xl px-5 md:px-8">
						<div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
							<h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
								Everything you need, nothing you don&apos;t
							</h2>
							<p className="mt-4 text-lg text-gray-600">
								A calm editor, consistent typography, and exports that match what you preview.
							</p>
						</div>

						<div className="grid gap-5 md:grid-cols-12 md:gap-6">
							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-7 md:p-10">
								<div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-pink/[0.06] transition group-hover:bg-brand-pink/[0.09]" />
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">Resumes that read clean</h3>
									<p className="mt-3 max-w-md text-gray-600 leading-relaxed">
										Tight hierarchy, sensible spacing, and structure recruiters scan in seconds — not a wall of text.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-5 md:p-10">
								<div className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-brand-pink/[0.05]" />
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">WYSIWYG, actually</h3>
									<p className="mt-3 text-gray-600 leading-relaxed">
										What you refine in the builder is what you ship — fewer surprises after export.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-cream-darker/40 p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-5 md:p-10">
								<div className="relative">
									<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
										<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
										</svg>
									</div>
									<h3 className="text-xl font-bold text-gray-900 md:text-2xl">Portfolio, organized</h3>
									<p className="mt-3 text-gray-600 leading-relaxed">
										Projects, education, and highlights in a single narrative — easy to reorder and tune.
									</p>
								</div>
							</div>

							<div className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-8 shadow-sm transition duration-300 hover:border-brand-pink/25 hover:shadow-md md:col-span-7 md:p-10">
								<div className="relative flex flex-col md:flex-row md:items-center md:gap-10">
									<div className="flex-1">
										<div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
											<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
											</svg>
										</div>
										<h3 className="text-xl font-bold text-gray-900 md:text-2xl">On-brand, under control</h3>
										<p className="mt-3 max-w-lg text-gray-600 leading-relaxed">
											Tokens and templates keep fonts, spacing, and accents cohesive — polish without a design degree.
										</p>
									</div>
									<div className="mt-8 flex shrink-0 flex-wrap gap-2 md:mt-0 md:justify-end">
										{['Spacing', 'Type', 'Accent'].map((label) => (
											<span
												key={label}
												className="rounded-lg border border-gray-200 bg-cream/80 px-3 py-1.5 text-xs font-medium text-gray-700"
											>
												{label}
											</span>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="py-20 md:py-28">
					<div className="mx-auto max-w-6xl px-5 md:px-8">
						<div className="rounded-3xl border border-gray-200/80 bg-white px-8 py-14 shadow-sm md:px-14 md:py-16">
							<div className="mx-auto mb-12 max-w-xl text-center">
								<h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
									Three steps to shipped
								</h2>
								<p className="mt-3 text-gray-600">
									No blank-page paralysis — move straight from outline to export.
								</p>
							</div>

							<ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
								<div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent md:block" aria-hidden="true" />
								{[
									{ step: '01', title: 'Account', body: 'Sign in and pick a layout that fits your field.' },
									{ step: '02', title: 'Compose', body: 'Drop in experience, projects, and proof — we handle the rhythm.' },
									{ step: '03', title: 'Export', body: 'Download PDF or Word when it feels right. Iterate anytime.' },
								].map(({ step, title, body }) => (
									<li key={step} className="relative text-center md:text-left">
										<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-pink-dark text-lg font-bold text-white shadow-md ring-4 ring-cream md:mx-0">
											{step}
										</div>
										<h3 className="text-lg font-bold text-gray-900">{title}</h3>
										<p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">{body}</p>
									</li>
								))}
							</ol>
						</div>
					</div>
				</section>

				<section className="landing-hero-mesh relative overflow-hidden py-20 text-white md:py-24">
					<div className="pointer-events-none absolute inset-0 bg-black/10" />
					<div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
						<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
							Ready when you are
						</h2>
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
			</main>

			<footer className="border-t border-gray-800 bg-gray-950 py-12 text-white">
				<div className="mx-auto max-w-6xl px-5 md:px-8">
					<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
						<div className="text-center md:text-left">
							<p className="text-lg font-semibold tracking-tight">taylor.io</p>
							<p className="mt-1 text-sm text-white/60">
								Professional documents, tailored to how you work.
							</p>
						</div>
						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="text-sm font-medium text-brand-pink-light transition hover:text-white"
						>
							Get started →
						</button>
					</div>
					<div className="mt-10 border-t border-white/10 pt-8 text-center text-xs text-white/45 md:text-left">
						© 2026 taylor.io. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	)
}

export default Landing
