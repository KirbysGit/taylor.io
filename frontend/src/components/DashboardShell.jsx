import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faCircleQuestion,
	faChevronLeft,
	faChevronRight,
	faFileAlt,
	faGear,
	faHome,
	faLayerGroup,
	faPlus,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import { resolveLogo } from '@/utils/logoMap'

export const appLogoClasses = {
	sidebarExpanded: 'h-12 w-auto max-w-[11rem] object-contain object-center',
	sidebarCollapsed: 'size-11 rounded-2xl object-contain object-center shadow-sm',
	mobile: 'h-9 w-auto',
	editor: 'h-9 w-auto max-w-[min(40vw,10.5rem)] object-contain object-left opacity-[0.98]',
}

const workspaceNavItems = [
	{ label: 'Dashboard', to: '/home', icon: faHome },
	{ label: 'Profile', to: '/info', icon: faUser },
	{ label: 'Resumes', to: '/resumes', icon: faFileAlt },
	{ label: 'Templates', to: '/templates', icon: faLayerGroup },
]

const accountNavItems = [
	{ label: 'Settings', to: '/settings', icon: faGear },
	{ label: 'Help & Support', icon: faCircleQuestion, comingSoon: true },
]

const navItems = [...workspaceNavItems, ...accountNavItems]

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

function readStoredUser() {
	try {
		return JSON.parse(localStorage.getItem('user') || 'null')
	} catch {
		return null
	}
}

function DashboardSidebar({ collapsed, onToggle, onLogout, onBeforeNavigate }) {
	const navigate = useNavigate()
	const location = useLocation()
	const storedUser = readStoredUser()
	const displayName = [storedUser?.first_name, storedUser?.last_name].filter(Boolean).join(' ').trim() || 'Your account'
	const displayEmail = storedUser?.email || 'Account settings'
	const initials =
		[storedUser?.first_name, storedUser?.last_name]
			.filter(Boolean)
			.map((value) => String(value).trim().charAt(0))
			.join('')
			.slice(0, 2)
			.toUpperCase() || 'T'

	const handleNavigate = async (item) => {
		if (item.comingSoon) {
			toast('Help & Support - Coming soon.')
			return
		}
		if (!item.to) return
		if (item.to === location.pathname) return
		if (onBeforeNavigate) await onBeforeNavigate(item.to)
		navigate(item.to)
	}

	const handleCreateResume = async () => {
		if (onBeforeNavigate) await onBeforeNavigate('/resume/create')
		navigate('/resume/create')
	}

	const handleHome = async () => {
		if (location.pathname !== '/home' && onBeforeNavigate) await onBeforeNavigate('/home')
		navigate('/home')
	}

	const renderNavGroup = (label, items) => (
		<div className={collapsed ? 'mt-6' : 'mt-7'}>
			{collapsed ? (
				<div className="mx-auto mb-3 h-px w-8 bg-gray-200" aria-hidden />
			) : (
				<p className="mb-2 px-3 text-[0.66rem] font-black uppercase tracking-[0.16em] text-gray-400">
					{label}
				</p>
			)}
			<div className="space-y-1">
				{items.map((item) => {
					const active = item.to && location.pathname === item.to
					return (
						<button
							key={item.label}
							type="button"
							onClick={() => handleNavigate(item)}
							title={collapsed ? item.label : undefined}
							className={[
								'group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
								collapsed ? 'justify-center' : 'justify-start gap-3',
								active
									? 'bg-brand-pink/[0.09] text-brand-pink-dark'
									: 'text-gray-600 hover:translate-x-0.5 hover:bg-gray-50 hover:text-gray-950',
							].join(' ')}
						>
							{active ? (
								<span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-pink" aria-hidden />
							) : null}
							<span
								className={[
									'flex size-8 shrink-0 items-center justify-center transition-colors',
									active
										? 'text-brand-pink'
										: 'text-gray-400 group-hover:text-brand-pink-dark',
								].join(' ')}
							>
								<FontAwesomeIcon icon={item.icon} className="size-4" />
							</span>
							{collapsed ? null : (
								<>
									<span className="min-w-0 truncate">{item.label}</span>
									{item.comingSoon ? (
										<span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-gray-400">
											Soon
										</span>
									) : null}
								</>
							)}
						</button>
					)
				})}
			</div>
		</div>
	)

	return (
		<aside
			className={[
				'relative z-30 hidden min-h-screen shrink-0 border-r border-gray-200/80 bg-[#fffdfa] px-4 py-5 text-gray-700 shadow-[12px_0_34px_-30px_rgba(55,35,35,0.35)] transition-[width] duration-300 lg:flex lg:flex-col',
				collapsed ? 'w-[5.5rem]' : 'w-[17rem]',
			].join(' ')}
		>
			<div className="flex min-h-14 items-center justify-center">
				<button
					type="button"
					onClick={handleHome}
					className={[
						'flex min-w-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
						collapsed ? 'size-12' : 'gap-2.5 px-2 py-2',
					].join(' ')}
					aria-label="taylor.io dashboard"
				>
					<img src="/favorite.png" alt="" className={collapsed ? 'size-11 object-contain' : 'size-10 object-contain'} />
					{collapsed ? null : (
						<span className="text-[1.55rem] font-black tracking-tight text-gray-950">
							taylor<span className="text-brand-pink">.io</span>
						</span>
					)}
				</button>
			</div>

			<button
				type="button"
				onClick={handleCreateResume}
				title={collapsed ? 'Create résumé' : undefined}
				className={[
					'mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-pink font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.82)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark hover:shadow-[0_18px_34px_-16px_rgba(180,55,65,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
					collapsed ? 'px-0' : 'gap-2.5 px-4 text-sm',
				].join(' ')}
			>
				<FontAwesomeIcon icon={faPlus} className="size-4" />
				{collapsed ? null : <span>Create r&eacute;sum&eacute;</span>}
			</button>

			<nav className="min-h-0 flex-1" aria-label="Dashboard">
				{renderNavGroup('Workspace', workspaceNavItems)}
				{renderNavGroup('Account', accountNavItems)}
			</nav>

			<button
				type="button"
				onClick={onToggle}
				className="absolute -right-3.5 top-1/2 z-30 inline-flex size-7 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-[0_6px_16px_-10px_rgba(45,30,38,0.4)] transition hover:border-brand-pink/35 hover:bg-brand-pink-lighter hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				<FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} className="size-3.5" />
			</button>

			<div className="mt-auto border-t border-gray-200/80 pt-4">
				<div className={['flex items-center rounded-xl border border-gray-200/80 bg-white p-2.5 shadow-sm', collapsed ? 'justify-center' : 'gap-3'].join(' ')}>
					<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.1] text-sm font-black text-brand-pink-dark">
						{initials}
					</span>
					{collapsed ? null : (
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-black text-gray-950">{displayName}</p>
							<p className="mt-0.5 truncate text-xs text-gray-500">{displayEmail}</p>
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={onLogout}
					title={collapsed ? 'Log out' : undefined}
					className={[
						'mt-2 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
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
