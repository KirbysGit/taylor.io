import { useNavigate, useLocation } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'

function TopNav({ user, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()

	const links = [
		{ label: 'Home', to: '/home' },
		{ label: 'Templates', to: '/templates' },
		{ label: 'Info', to: '/info' },
		{ label: 'Preview', to: '/resume/preview' },
	]

	const isActive = (to) => location.pathname === to

	const handleNav = async (to) => {
		try {
			await onBeforeNavigate?.()
		} catch (err) {
			console.error('Before navigate failed:', err)
		}
		navigate(to)
	}

	return (
		<header className="border-b border-white/10 bg-gradient-to-b from-brand-pink to-brand-pink-dark text-white shadow-sm">
			<div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-1.5 sm:px-6 sm:py-2 md:px-8">
				{/* Brand */}
				<div className="flex min-w-0 shrink-0 items-center">
					<button
						type="button"
						onClick={() => handleNav('/home')}
						className="rounded-lg px-1 py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink"
						aria-label={`${BRAND_NAME} — Home`}
					>
						<img
							src={resolveLogo('navbar')}
							alt={BRAND_NAME}
							className="h-10 w-auto max-w-[12rem] object-contain object-left sm:h-12"
							decoding="async"
						/>
					</button>
				</div>

				{/* Centered nav — fills horizontal rhythm */}
				<div className="flex min-w-0 flex-1 items-center justify-center">
					<nav
						className="inline-flex max-w-full rounded-xl bg-black/15 p-1 shadow-inner ring-1 ring-white/10"
						aria-label="Main"
					>
						{links.map((link) => {
							const active = isActive(link.to)
							return (
								<button
									type="button"
									key={link.to}
									onClick={() => handleNav(link.to)}
									className={[
										'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-3.5 sm:text-sm',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink',
										active
											? 'bg-white text-brand-pink shadow-sm'
											: 'text-white/90 hover:bg-white/10 hover:text-white',
									].join(' ')}
								>
									{link.label}
								</button>
							)
						})}
					</nav>
				</div>

				{/* User */}
				<div className="flex shrink-0 items-center gap-2 sm:gap-3">
					{user?.email && (
						<span
							className="hidden max-w-[10rem] truncate rounded-lg bg-white/10 px-2.5 py-1.5 text-left text-xs text-white/95 ring-1 ring-white/10 sm:block md:max-w-[14rem] md:text-sm"
							title={user.email}
						>
							{user.email}
						</span>
					)}
					<button
						type="button"
						onClick={onLogout}
						className="rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink sm:px-4 sm:text-sm"
					>
						Logout
					</button>
				</div>
			</div>
		</header>
	)
}

export default TopNav
