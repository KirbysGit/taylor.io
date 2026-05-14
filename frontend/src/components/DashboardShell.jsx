import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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

const navItems = [
	{ label: 'Dashboard', to: '/home', icon: faHome },
	{ label: 'Profile', to: '/info', icon: faUser },
	{ label: 'Resumes', to: '/resumes', icon: faFileAlt },
	{ label: 'Templates', to: '/templates', icon: faLayerGroup },
	{ label: 'Settings', to: null, icon: faGear },
]

function DashboardSidebar({ collapsed, onToggle, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()

	const handleNavigate = async (item) => {
		if (!item.to) {
			toast('Settings are coming soon')
			return
		}
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
				'relative z-20 hidden min-h-screen shrink-0 border-r border-white/16 bg-[#9f3a40] px-4 py-5 text-white shadow-[16px_0_48px_-34px_rgba(80,12,18,0.62)] transition-[width] duration-300 lg:flex lg:flex-col',
				collapsed ? 'w-[5.75rem]' : 'w-64',
			].join(' ')}
		>
			<div className="relative flex items-center justify-center">
				<button
					type="button"
					onClick={handleHome}
					className="flex min-w-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]"
					aria-label="taylor.io dashboard"
				>
					<img
						src={collapsed ? '/favorite.png' : resolveLogo('navbar')}
						alt="taylor.io"
						className={collapsed ? 'size-11 rounded-2xl object-contain object-center shadow-sm' : 'h-12 w-auto max-w-[11rem] object-contain object-center'}
					/>
				</button>
			</div>

			<nav className="mt-10 space-y-2" aria-label="Dashboard">
				{navItems.map((item) => {
					const active = item.to && (location.pathname === item.to || (item.to === '/resumes' && location.pathname.startsWith('/resume')))
					return (
						<button
							key={item.label}
							type="button"
							onClick={() => handleNavigate(item)}
							title={collapsed ? item.label : undefined}
							className={[
								'group relative flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-bold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]',
								collapsed ? 'justify-center' : 'justify-start gap-3',
								active
									? 'bg-white text-brand-pink-dark shadow-[0_14px_30px_-18px_rgba(255,255,255,0.72)]'
									: 'text-white/76 hover:translate-x-0.5 hover:bg-white/10 hover:text-white',
							].join(' ')}
						>
							<span
								className={[
									'flex size-8 shrink-0 items-center justify-center rounded-xl transition-[background-color,color,transform]',
									active ? 'bg-brand-pink/[0.12] text-brand-pink-dark' : 'bg-white/[0.08] text-white/82 group-hover:bg-white/14 group-hover:text-white',
								].join(' ')}
							>
								<FontAwesomeIcon icon={item.icon} className="size-4" />
							</span>
							{collapsed ? null : <span>{item.label}</span>}
							{active && !collapsed ? <span className="ml-auto h-5 w-1 rounded-full bg-brand-pink" aria-hidden /> : null}
						</button>
					)
				})}
			</nav>

			<button
				type="button"
				onClick={onToggle}
				className="absolute -right-4 top-1/2 z-30 inline-flex size-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-brand-pink/18 bg-white text-brand-pink-dark shadow-[0_8px_18px_-12px_rgba(80,12,18,0.55)] transition hover:border-brand-pink/35 hover:bg-brand-pink-lighter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="size-3.5" />
			</button>

			<div className="mt-auto rounded-3xl border border-white/14 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
				{collapsed ? (
					<div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-white/14 text-white shadow-sm">
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
					</div>
				) : (
					<>
						<div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white/14 text-white shadow-sm">
							<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
						</div>
						<p className="text-sm font-black leading-snug text-white">Tailored to you, built to stand out.</p>
						<p className="mt-2 text-xs leading-relaxed text-white/70">Keep your profile current and every version gets easier.</p>
					</>
				)}
			</div>

			<button
				type="button"
				onClick={onLogout}
				title={collapsed ? 'Log out' : undefined}
				className={[
					'mt-3 flex w-full items-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]',
					collapsed ? 'justify-center' : 'justify-start gap-3',
				].join(' ')}
			>
				<FontAwesomeIcon icon={faArrowRight} className="size-4 rotate-180" />
				{collapsed ? null : <span>Log out</span>}
			</button>
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
					<img src={resolveLogo('navbar')} alt="taylor.io" className="h-9 w-auto" />
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
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

	return (
		<div className="info-scrollbar relative h-screen overflow-hidden bg-[#fff8ef] text-gray-950">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(250,205,205,0.58),transparent_28%),radial-gradient(circle_at_20%_92%,rgba(214,86,86,0.15),transparent_32%)]" aria-hidden />
			<div className="relative z-[1] flex h-screen min-h-0">
				<DashboardSidebar
					collapsed={isSidebarCollapsed}
					onToggle={() => setIsSidebarCollapsed((value) => !value)}
					onLogout={onLogout}
					onBeforeNavigate={onBeforeNavigate}
				/>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<MobileNav onLogout={onLogout} onBeforeNavigate={onBeforeNavigate} />
					<main className="info-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-5 lg:py-7 xl:px-6">
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}
