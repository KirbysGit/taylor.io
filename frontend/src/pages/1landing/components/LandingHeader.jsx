// Slim product bar — brand strip above the hero mesh

import { useNavigate } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

export default function LandingHeader() {
	const navigate = useNavigate()
	return (
		<header className="sticky top-0 z-50 shrink-0 border-b border-black/[0.06] bg-brand-pink text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
			<div className="mx-auto flex max-w-[min(1400px,98vw)] items-center justify-between gap-4 px-4 py-2.5 md:px-6 md:py-3 xl:px-8 2xl:px-10">
				<button
					type="button"
					onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
					className="shrink-0 rounded-lg px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink"
					aria-label={`${BRAND_NAME} — top of page`}
				>
					<img
						src={resolveLogo('navbar')}
						alt={BRAND_NAME}
						className="h-8 w-auto max-w-[10.5rem] object-contain object-left opacity-[0.98] md:h-[2.35rem]"
						decoding="async"
						fetchPriority="high"
					/>
				</button>
				<nav className="flex items-center gap-2 sm:gap-2.5" aria-label="Account">
					<button
						type="button"
						onClick={() => navigate('/auth')}
						className="rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/92 transition hover:bg-white/[0.1] hover:text-white sm:text-[13px] sm:normal-case sm:tracking-normal sm:font-medium"
					>
						Sign in
					</button>
					<button
						type="button"
						onClick={() => navigate('/auth')}
						className="rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-pink shadow-sm transition hover:border-white/45 hover:bg-cream hover:shadow md:text-[13px] md:normal-case md:tracking-normal"
					>
						Get started
					</button>
				</nav>
			</div>
		</header>
	)
}
