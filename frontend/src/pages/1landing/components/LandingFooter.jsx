import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

const footerLinks = [
	{ label: 'How it works', target: 'how-it-works' },
	{ label: 'One profile', target: 'one-profile-many-resumes' },
	{ label: 'Long-term growth', target: 'grow-with-you' },
]

function scrollToSection(target) {
	document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingFooter() {
	const navigate = useNavigate()
	const year = new Date().getFullYear()

	return (
		<footer className="border-t border-gray-200/75 bg-cream">
			<div className="mx-auto max-w-[min(1280px,94vw)] px-3 py-10 sm:px-4 md:px-5 md:py-12">
				<div className="grid gap-8 rounded-[1.5rem] border border-white/85 bg-white/72 px-5 py-6 shadow-[0_18px_46px_-38px_rgba(17,24,39,0.35)] ring-1 ring-black/[0.03] backdrop-blur-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-7">
					<div className="min-w-0">
						<button
							type="button"
							onClick={() => {
								const root = document.getElementById('landing-scroll-root')
								if (root) root.scrollTo({ top: 0, behavior: 'smooth' })
								else window.scrollTo({ top: 0, behavior: 'smooth' })
							}}
							className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/45 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
							aria-label={`${BRAND_NAME} top of page`}
						>
							<img
								src={resolveLogo('navbar')}
								alt={BRAND_NAME}
								className="h-9 w-auto max-w-[11rem] object-contain object-left"
								decoding="async"
							/>
						</button>
						<p className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">
							A focused résumé workspace for shaping your story, tailoring each version, and sending with more confidence.
						</p>
					</div>

					<div className="flex flex-col gap-4 md:items-end">
						<nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-gray-600 md:justify-end" aria-label="Landing sections">
							{footerLinks.map((link) => (
								<button
									key={link.target}
									type="button"
									onClick={() => scrollToSection(link.target)}
									className="transition hover:text-brand-pink"
								>
									{link.label}
								</button>
							))}
						</nav>

						<div className="flex flex-wrap gap-2 md:justify-end">
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-brand-pink-lighter/35 hover:text-brand-pink-dark"
							>
								Sign in
							</button>
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_-20px_rgba(214,86,86,0.85)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark"
							>
								Try Taylor.io
								<FontAwesomeIcon icon={faArrowRight} className="size-3" aria-hidden />
							</button>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-2 px-1 pt-6 text-xs font-medium text-gray-500 sm:flex-row sm:items-center sm:justify-between">
					<p>© {year} {BRAND_NAME}. All rights reserved.</p>
					<p>Built for thoughtful, role-ready résumés.</p>
				</div>
			</div>
		</footer>
	)
}
