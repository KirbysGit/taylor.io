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
		const headerGap = 84
		const top = Math.max(0, target.offsetTop - headerGap)
		root.scrollTo({ top, behavior: 'smooth' })
		return
	}
	target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function LandingHeader() {
	const navigate = useNavigate()

	return (
		<header className="pointer-events-none fixed left-0 top-0 z-50 w-screen max-w-full px-3 pt-2.5 sm:px-5 md:pt-3 lg:px-7">
			<div
				className={[
					'pointer-events-auto mx-auto flex w-full max-w-[86rem] items-center gap-2 rounded-2xl px-3 py-2.5 sm:gap-3 sm:px-5 md:gap-3.5 md:py-3 lg:px-5',
					// No spaces inside arbitrary values — spaces split className tokens so Tailwind never emits the rule.
					'bg-[rgba(181,70,73,0.85)] shadow-[0_12px_38px_-14px_rgba(97,65,65,0.74)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-white/10',
				].join(' ')}
			>
				<div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
					<button
						type="button"
						onClick={() => {
							const root = document.getElementById('landing-scroll-root')
							if (root) root.scrollTo({ top: 0, behavior: 'smooth' })
							else navigate('/')
						}}
						className="shrink-0 rounded-xl px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink-dark"
						aria-label={`${BRAND_NAME} — top of page`}
					>
						<img
							src={resolveLogo('navbar')}
							alt={BRAND_NAME}
							className="h-8 w-auto max-w-[8.5rem] object-contain object-left sm:h-9 sm:max-w-[10.75rem] md:h-10 md:max-w-[12rem]"
							decoding="async"
							fetchPriority="high"
						/>
					</button>

					<span className="hidden h-8 w-px bg-white/16 lg:block" aria-hidden />

					<nav
						className="hidden min-w-0 items-center justify-start gap-1 lg:flex xl:gap-2"
						aria-label="Page sections"
					>
						{NAV_LINKS.map((link) => (
							<button
								key={link.hash}
								type="button"
								onClick={() => {
									// off the landing page the section doesn't exist — go there instead
									if (document.getElementById(link.hash.replace('#', ''))) scrollToSection(link.hash)
									else navigate(`/${link.hash}`)
								}}
								className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/15 xl:px-3.5 xl:text-[13px]"
							>
								{link.label}
							</button>
						))}
					</nav>
				</div>

				<nav className="flex w-[8.75rem] shrink-0 items-center justify-end gap-0 sm:w-auto sm:gap-3" aria-label="Account">
					<button
						type="button"
						onClick={() => navigate('/auth?mode=login')}
						className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-1.5 py-2 text-[10px] font-semibold text-white transition hover:bg-white/12 sm:px-3 sm:text-[13px]"
					>
						Sign in
					</button>
					<button
						type="button"
						onClick={() => navigate('/auth?mode=signup')}
						className="inline-flex min-h-10 items-center whitespace-nowrap rounded-xl border border-white/45 bg-white px-2.5 py-2 text-[10px] font-bold text-brand-pink shadow-[0_12px_26px_-18px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-cream sm:px-5 sm:py-2.5 sm:text-[13px]"
					>
						Get started
					</button>
				</nav>
			</div>
		</header>
	)
}

