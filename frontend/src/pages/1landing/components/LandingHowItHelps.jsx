// Product value grid — what you get (editor, exports, portfolio, tokens)

export default function LandingHowItHelps() {
	return (
		<section id="how-it-helps" className="py-20 md:py-28">
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
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
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
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
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
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.75}
										d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
									/>
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
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.75}
											d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
										/>
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
	)
}
