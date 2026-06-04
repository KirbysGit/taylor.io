// Product bar — fixed glass card floating over the landing scroll surface.

import { useNavigate } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

const NAV_LINKS = [
	{ label: 'How it works', hash: '#how-it-works' },
	{ label: 'Features', hash: '#how-it-helps' },
	{ label: 'Examples', hash: '#one-profile-many-resumes' },
	{ label: 'Resources', hash: '#grow-with-you' },
]

function scrollToSection(hash) {
	const id = hash.replace('#', '')
	const target = document.getElementById(id)
	const root = document.getElementById('landing-scroll-root')
	if (!target) return
	if (root) {
		const headerGap = 96
		const top = Math.max(0, target.offsetTop - headerGap)
		root.scrollTo({ top, behavior: 'smooth' })
		return
	}
	target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function LandingHeader() {
	const navigate = useNavigate()

	return (
		<header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 md:px-5 md:pt-4">
			<div
				className={[
					'pointer-events-auto mx-auto flex max-w-[min(1180px,94vw)] items-center gap-3 rounded-2xl px-4 py-3 sm:px-5 md:gap-4 md:py-3.5 lg:px-6',
					// No spaces inside arbitrary values — spaces split className tokens so Tailwind never emits the rule.
					'bg-[rgba(194,91,91,0.4)] shadow-[0_14px_44px_-14px_rgba(97, 65, 65, 0.78)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/10',
				].join(' ')}
			>
				<div className="flex min-w-0 flex-1 items-center gap-5 lg:gap-7 xl:gap-9">
					<button
						type="button"
						onClick={() => {
							const root = document.getElementById('landing-scroll-root')
							if (root) root.scrollTo({ top: 0, behavior: 'smooth' })
							else window.scrollTo({ top: 0, behavior: 'smooth' })
						}}
						className="shrink-0 rounded-xl px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink-dark"
						aria-label={`${BRAND_NAME} — top of page`}
					>
						<img
							src={resolveLogo('navbar')}
							alt={BRAND_NAME}
							className="h-10 w-auto max-w-[12rem] object-contain object-left md:h-11 md:max-w-[13.5rem]"
							decoding="async"
							fetchPriority="high"
						/>
					</button>

					<span className="hidden h-10 w-px bg-white/16 lg:block" aria-hidden />

					<nav
						className="hidden min-w-0 items-center justify-start gap-1 lg:flex xl:gap-2"
						aria-label="Page sections"
					>
						{NAV_LINKS.map((link) => (
							<button
								key={link.hash}
								type="button"
								onClick={() => scrollToSection(link.hash)}
								className="rounded-full px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-white/15 xl:px-4 xl:text-sm"
							>
								{link.label}
							</button>
						))}
					</nav>
				</div>

				<nav className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Account">
					<button
						type="button"
						onClick={() => navigate('/auth?mode=login')}
						className="rounded-full px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/12 sm:text-sm"
					>
						Sign in
					</button>
					<button
						type="button"
						onClick={() => navigate('/auth?mode=signup')}
						className="rounded-xl border border-white/45 bg-white px-4 py-2.5 text-xs font-bold text-brand-pink shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-cream sm:px-6 sm:py-3 sm:text-sm"
					>
						Get started
					</button>
				</nav>
			</div>
		</header>
	)
}

