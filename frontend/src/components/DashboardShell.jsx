import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faChevronLeft,
	faChevronRight,
	faFileAlt,
	faGear,
	faHome,
	faLayerGroup,
	faUser,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { resolveLogo } from '@/utils/logoMap'

export const appLogoClasses = {
	sidebarExpanded: 'h-12 w-auto max-w-[11rem] object-contain object-center',
	sidebarCollapsed: 'size-11 rounded-2xl object-contain object-center shadow-sm',
	mobile: 'h-9 w-auto',
	editor: 'h-9 w-auto max-w-[min(40vw,10.5rem)] object-contain object-left opacity-[0.98]',
}

const navItems = [
	{ label: 'Dashboard', to: '/home', icon: faHome },
	{ label: 'Profile', to: '/info', icon: faUser },
	{ label: 'Resumes', to: '/resumes', icon: faFileAlt },
	{ label: 'Templates', to: '/templates', icon: faLayerGroup },
	{ label: 'Settings', to: '/settings', icon: faGear },
]

const SIDEBAR_COLLAPSED_KEY = 'dashboardSidebarCollapsed'

function readSidebarCollapsed() {
	try {
		return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
	} catch {
		return false
	}
}

function writeSidebarCollapsed(collapsed) {
	try {
		localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
	} catch {
		// ignore quota / private mode
	}
}

function DashboardSidebar({ collapsed, onToggle, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()

	const handleNavigate = async (item) => {
		if (!item.to) return
		if (item.to === location.pathname) return
		if (onBeforeNavigate) await onBeforeNavigate(item.to)
		navigate(item.to)
	}

	const handleHome = async () => {
		if (location.pathname !== '/home' && onBeforeNavigate) await onBeforeNavigate('/home')
		navigate('/home')
	}

	return (
		<aside
			className={[
				'relative z-30 hidden min-h-screen shrink-0 border-r border-brand-pink/14 bg-white px-4 py-5 text-gray-700 shadow-[16px_0_48px_-38px_rgba(80,42,42,0.22)] transition-[width] duration-300 lg:flex lg:flex-col',
				collapsed ? 'w-[5.75rem]' : 'w-64',
			].join(' ')}
		>
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-[#9f3a40] via-[#9f3a40]/40 to-transparent"
				aria-hidden
			/>

			<div className="relative z-[1] flex items-center justify-center">
				<button
					type="button"
					onClick={handleHome}
					className="flex min-w-0 items-center justify-center rounded-2xl bg-white/95 px-4 py-2 shadow-[0_10px_28px_-16px_rgba(45,12,16,0.45)] ring-1 ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
					aria-label="taylor.io dashboard"
				>
					<img
						src={collapsed ? '/favorite.png' : resolveLogo('navbar')}
						alt="taylor.io"
						className={collapsed ? appLogoClasses.sidebarCollapsed : appLogoClasses.sidebarExpanded}
					/>
				</button>
			</div>

			<nav className="relative z-[1] mt-10 space-y-2" aria-label="Dashboard">
				{navItems.map((item) => {
					const active = item.to && (location.pathname === item.to || (item.to === '/resumes' && location.pathname.startsWith('/resume')))
					return (
						<button
							key={item.label}
							type="button"
							onClick={() => handleNavigate(item)}
							title={collapsed ? item.label : undefined}
							className={[
								'group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
								collapsed ? 'justify-center' : 'justify-start gap-3',
								active
									? 'bg-brand-pink/[0.12] text-brand-pink-dark shadow-[0_8px_22px_-16px_rgba(214,86,86,0.55)]'
									: 'text-gray-500 hover:bg-brand-pink/[0.05] hover:text-brand-pink-dark',
							].join(' ')}
						>
							{active ? (
								<span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand-pink" aria-hidden />
							) : null}
							<span
								className={[
									'flex size-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color]',
									active ? 'bg-brand-pink text-white shadow-sm' : 'bg-brand-pink/[0.08] text-brand-pink-dark/70 group-hover:bg-brand-pink/[0.14] group-hover:text-brand-pink-dark',
								].join(' ')}
							>
								<FontAwesomeIcon icon={item.icon} className="size-4" />
							</span>
							{collapsed ? null : <span>{item.label}</span>}
						</button>
					)
				})}
			</nav>

			<button
				type="button"
				onClick={onToggle}
				className="absolute -right-3.5 top-1/2 z-30 inline-flex size-7 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-[0_6px_16px_-10px_rgba(45,30,38,0.4)] transition hover:border-brand-pink/35 hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="size-3.5" />
			</button>

			<div className="mt-auto border-t border-brand-pink/10 pt-4">
				<div className="relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-[#9f3a40] via-[#c25a56] to-[#d97f7c] p-4 shadow-[0_18px_40px_-24px_rgba(80,18,22,0.55)]">
					<span className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-white/10 blur-2xl" aria-hidden />
					{collapsed ? (
						<div className="relative z-[1] mx-auto flex size-10 items-center justify-center rounded-xl bg-white/16 text-white ring-1 ring-white/25">
							<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
						</div>
					) : (
						<>
							<div className="relative z-[1] mb-4 flex size-10 items-center justify-center rounded-xl bg-white/16 text-white ring-1 ring-white/25">
								<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
							</div>
							<p className="relative z-[1] text-sm font-bold leading-snug text-white">Tailored to you, built to stand out.</p>
							<p className="relative z-[1] mt-2 text-xs leading-relaxed text-white/75">Keep your profile current and every version gets easier.</p>
						</>
					)}
				</div>

				<button
					type="button"
					onClick={onLogout}
					title={collapsed ? 'Log out' : undefined}
					className={[
						'mt-3 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-brand-pink/[0.06] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
						collapsed ? 'justify-center' : 'justify-start gap-3',
					].join(' ')}
				>
					<FontAwesomeIcon icon={faArrowRight} className="size-4 rotate-180" />
					{collapsed ? null : <span>Log out</span>}
				</button>
			</div>
		</aside>
	)
}

function MobileNav({ onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()

	const handleNavigate = async (to) => {
		if (to === location.pathname) return
		if (onBeforeNavigate) await onBeforeNavigate(to)
		navigate(to)
	}

	return (
		<header className="sticky top-0 z-30 border-b border-brand-pink/12 bg-white/82 px-4 py-3 backdrop-blur-xl lg:hidden">
			<div className="flex items-center justify-between gap-3">
				<button type="button" onClick={() => handleNavigate('/home')} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink">
					<img src={resolveLogo('navbar')} alt="taylor.io" className={appLogoClasses.mobile} />
				</button>
				<div className="flex items-center gap-1.5">
					{navItems.slice(0, 4).map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => handleNavigate(item.to)}
							aria-label={item.label}
							className="inline-flex size-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-brand-pink/[0.08] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<FontAwesomeIcon icon={item.icon} className="size-4" />
						</button>
					))}
					<button
						type="button"
						onClick={onLogout}
						aria-label="Log out"
						className="rounded-xl px-2.5 py-2 text-xs font-bold text-brand-pink-dark transition hover:bg-brand-pink/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
					>
						Out
					</button>
				</div>
			</div>
		</header>
	)
}

export default function DashboardShell({ children, onLogout, onBeforeNavigate }) {
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed)

	const handleSidebarToggle = () => {
		setIsSidebarCollapsed((value) => {
			const next = !value
			writeSidebarCollapsed(next)
			return next
		})
	}

	return (
		<div className="info-scrollbar relative h-screen overflow-hidden bg-[#fff8ef] text-gray-950">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(250,205,205,0.58),transparent_28%),radial-gradient(circle_at_20%_92%,rgba(214,86,86,0.15),transparent_32%)]" aria-hidden />
			<div className="relative z-[1] flex h-screen min-h-0">
				<DashboardSidebar
					collapsed={isSidebarCollapsed}
					onToggle={handleSidebarToggle}
					onLogout={onLogout}
					onBeforeNavigate={onBeforeNavigate}
				/>
				<div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
					<MobileNav onLogout={onLogout} onBeforeNavigate={onBeforeNavigate} />
					<main className="info-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-5 lg:py-7 xl:px-6">
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}
