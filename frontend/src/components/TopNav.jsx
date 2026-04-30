import { useCallback, memo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BRAND_NAME, resolveLogo } from '@/utils/logoMap'
import { NavHome, NavTemplates, NavProfile, NavLogout } from '@/components/icons'

/** Styles | Home | Info — thirds stay even; slider uses measured equal columns. */
const TOP_NAV_LINKS = [
	{ label: 'Styles', to: '/templates', Icon: NavTemplates },
	{ label: 'Home', to: '/home', Icon: NavHome },
	{ label: 'Info', to: '/info', Icon: NavProfile },
]

function getStoredUserEmail() {
	try {
		const raw = localStorage.getItem('user')
		if (!raw) return ''
		const u = JSON.parse(raw)
		return typeof u?.email === 'string' ? u.email : ''
	} catch {
		return ''
	}
}

/** Session email for chrome — prefers live `user` from the page; falls back to the same blob auth already keeps in LS. */
function resolveNavbarEmail(user) {
	return (user?.email && String(user.email).trim()) || getStoredUserEmail()
}

/**
 * Stable chrome: equal thirds + CSS slider (no ResizeObserver on label swaps).
 */
const SegmentedNav = memo(function SegmentedNav({ pathname, onNavigate }) {
	const activeIdx = TOP_NAV_LINKS.findIndex((l) => l.to === pathname)
	const sliderOn = activeIdx >= 0

	return (
		<nav
			className="relative isolate z-20 w-full max-w-[min(100%,21rem)] overflow-hidden rounded-full bg-black/[0.12] p-[5px] ring-1 ring-white/[0.12] sm:max-w-[23.5rem]"
			aria-label="Main"
		>
			<span
				className="pointer-events-none absolute inset-y-[5px] left-[5px] z-0 rounded-full bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.85)] transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform motion-reduce:transition-none motion-reduce:duration-100 motion-reduce:will-change-auto"
				style={{
					width: 'calc((100% - 10px) / 3)',
					transform: sliderOn
						? `translate3d(calc(${activeIdx * 100}%), 0, 0)`
						: 'translate3d(0, 0, 0)',
					opacity: sliderOn ? 1 : 0,
				}}
				aria-hidden="true"
			/>
			<div className="relative z-[1] grid grid-cols-3 gap-0 rounded-full [&>button]:min-h-[2.75rem] sm:[&>button]:min-h-[3rem]">
				{TOP_NAV_LINKS.map((link) => {
					const active = pathname === link.to
					const Icon = link.Icon
					return (
						<button
							type="button"
							key={link.to}
							onClick={() => onNavigate(link.to)}
							aria-label={link.label}
							aria-current={active ? 'page' : undefined}
							className={[
								'flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-2 sm:gap-1 sm:px-4 sm:py-2.5',
								'text-[0.625rem] font-semibold uppercase tracking-[0.12em] transition-[color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 sm:text-[0.6875rem] sm:tracking-[0.14em]',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink',
								active ? 'text-brand-pink delay-[24ms]' : 'text-white/88 hover:text-white',
							].join(' ')}
						>
							<Icon
								className={[
									'h-[1.0625rem] w-[1.0625rem] shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]',
									active ? 'text-brand-pink' : 'text-current',
								].join(' ')}
							/>
							<span className="truncate text-center leading-tight">{link.label}</span>
						</button>
					)
				})}
			</div>
		</nav>
	)
})

/** No route subscription — skips re-renders when only `pathname` changes elsewhere in TopNav. */
const TopNavBrand = memo(function TopNavBrand() {
	const navigate = useNavigate()
	const goHome = useCallback(() => {
		navigate('/home')
	}, [navigate])

	return (
		<div className="flex min-w-0 items-center justify-self-start">
			<button
				type="button"
				onClick={goHome}
				className="-ml-0.5 rounded-lg px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink"
				aria-label={`${BRAND_NAME} — Home`}
			>
				<img
					src={resolveLogo('navbar')}
					alt={BRAND_NAME}
					className="h-10 w-auto max-w-[10rem] object-contain object-left sm:h-[3rem] sm:max-w-[11.25rem]"
					decoding="async"
					fetchPriority="high"
				/>
			</button>
		</div>
	)
})

/** Email + logout only re-render when the address or handler identity changes (not on every route tick). */
const TopNavAccount = memo(
	function TopNavAccount({ email, onLogout }) {
		return (
			<div className="flex min-w-0 items-center justify-end justify-self-end gap-2 sm:gap-3">
				{email ? (
					<span
						className="hidden max-w-[9.5rem] truncate text-[11px] font-semibold tracking-[0.06em] text-white/92 sm:block md:max-w-[13rem] md:text-xs md:tracking-[0.07em]"
						title={email}
					>
						{email}
					</span>
				) : null}
				<button
					type="button"
					onClick={onLogout}
					aria-label="Log out"
					className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/[0.07] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition-[transform,background-color,border-color] duration-150 ease-out hover:border-white/40 hover:bg-white/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-pink motion-reduce:active:scale-100 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.14em]"
				>
					<NavLogout className="h-4 w-4 shrink-0 opacity-95 sm:h-[1.0625rem] sm:w-[1.0625rem]" />
					<span className="hidden sm:inline">Log out</span>
				</button>
			</div>
		)
	},
	(prev, next) => prev.email === next.email && prev.onLogout === next.onLogout,
)

function TopNav({ user, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()
	const pathname = location.pathname

	const onLogoutRef = useRef(onLogout)
	onLogoutRef.current = onLogout
	const stableLogout = useCallback(() => {
		onLogoutRef.current?.()
	}, [])

	const handleNavigate = useCallback(
		async (to) => {
			try {
				await onBeforeNavigate?.()
			} catch (err) {
				console.error('Before navigate failed:', err)
			}
			navigate(to)
		},
		[navigate, onBeforeNavigate],
	)

	const email = resolveNavbarEmail(user)

	return (
		<header className="border-b border-black/[0.06] bg-brand-pink text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
			<div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-4 py-2 sm:gap-x-4 sm:px-6 sm:py-2.5 md:px-8 md:gap-x-6">
				{/* Left — no `useLocation`; memo skips when only pathname moves */}
				<TopNavBrand />

				<div className="relative z-20 flex min-w-0 justify-center justify-self-center [contain:layout]">
					<SegmentedNav pathname={pathname} onNavigate={handleNavigate} />
				</div>

				{/* Right — memo skips when email string unchanged; logout is ref-forwarded so parent can pass inline handlers */}
				<TopNavAccount email={email} onLogout={stableLogout} />
			</div>
		</header>
	)
}

export default TopNav
