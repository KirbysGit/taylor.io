import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useNavigate } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

const linkColumns = [
	{
		title: 'Product',
		links: [
			{ label: 'How it works', target: 'how-it-works' },
			{ label: 'How it helps', target: 'how-it-helps' },
			{ label: 'Examples', target: 'one-profile-many-resumes' },
			{ label: 'Start free', action: 'auth' },
		],
	},
	{
		title: 'Company',
		links: [
			{ label: 'About', target: 'one-profile-many-resumes' },
			{ label: 'Updates', target: 'grow-with-you' },
			{ label: 'Contact', action: 'auth' },
		],
	},
	{
		title: 'Legal',
		links: [
			{ label: 'Privacy' },
			{ label: 'Terms' },
		],
	},
]

function scrollToSection(target) {
	document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
}

export default function LandingFooter() {
	const navigate = useNavigate()
	const year = new Date().getFullYear()

	function handleLink(link) {
		if (link.action === 'auth') {
			navigate('/auth')
			return
		}
		if (link.target) scrollToSection(link.target)
	}

	return (
		<footer className="relative overflow-hidden border-t border-white/10 bg-brand-pink text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_18%_0%,rgba(255,255,255,0.16),transparent_55%),linear-gradient(135deg,rgba(190,70,70,0.3),rgba(120,36,44,0.22))]" aria-hidden />
			<div className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />

			<div className="relative mx-auto max-w-[min(1280px,94vw)] px-3 py-8 sm:px-4 md:px-5 md:py-9">
				<div className="grid gap-8 lg:grid-cols-[minmax(18rem,1fr)_minmax(26rem,0.95fr)] lg:gap-10">
					<div className="max-w-xl">
						<button
							type="button"
							onClick={() => {
								const root = document.getElementById('landing-scroll-root')
								if (root) root.scrollTo({ top: 0, behavior: 'smooth' })
								else window.scrollTo({ top: 0, behavior: 'smooth' })
							}}
							className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink"
							aria-label={`${BRAND_NAME} top of page`}
						>
							<img
								src={resolveLogo('navbar')}
								alt={BRAND_NAME}
								className="h-9 w-auto max-w-[11rem] object-contain object-left opacity-[0.98]"
								decoding="async"
							/>
						</button>

						<h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Your story, tailored right.</h2>
						<p className="mt-2 max-w-md text-sm leading-relaxed text-white/72">
							Build focused résumés from the experience you already have.
						</p>

						<button
							type="button"
							onClick={() => navigate('/auth')}
							className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-5 py-2.5 text-sm font-bold text-brand-pink-dark shadow-[0_16px_30px_-24px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 hover:bg-cream"
						>
							Start free
							<FontAwesomeIcon icon={faArrowRight} className="size-3" aria-hidden />
						</button>
					</div>

					<nav className="grid grid-cols-2 gap-7 sm:grid-cols-3" aria-label="Footer">
						{linkColumns.map((column) => (
							<div key={column.title}>
								<h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/92">{column.title}</h3>
								<ul className="mt-3 space-y-2">
									{column.links.map((link) => (
										<li key={link.label}>
											<button
												type="button"
												onClick={() => handleLink(link)}
												className="relative text-sm font-semibold text-white/68 transition after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-white/85 after:transition-all after:duration-300 after:ease-out hover:text-white hover:after:w-full disabled:cursor-default disabled:hover:text-white/68 disabled:hover:after:w-0"
												disabled={!link.target && !link.action}
											>
												{link.label}
											</button>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>

				<div className="mt-8 flex flex-col gap-2 border-t border-white/12 pt-5 text-xs font-medium text-white/50 sm:flex-row sm:items-center sm:justify-between">
					<p>Free to try · Drafts stay private · Edit before export</p>
					<p>© {year} {BRAND_NAME}. All rights reserved.</p>
				</div>
			</div>
		</footer>
	)
}
