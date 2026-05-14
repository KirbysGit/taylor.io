// pages/4home/Home.jsx -- dashboard shell with side navigation, primary resume action, and profile health cards

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faBriefcase,
	faCheck,
	faChevronLeft,
	faChevronRight,
	faClockRotateLeft,
	faFileAlt,
	faGear,
	faGraduationCap,
	faHome,
	faLayerGroup,
	faPenToSquare,
	faPlus,
	faRocket,
	faShieldHalved,
	faStar,
	faTrash,
	faUser,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { resolveLogo } from '@/utils/logoMap'
import { getMyProfile, listSavedResumes, deleteSavedResume } from '@/api/services/profile'

const navItems = [
	{ label: 'Dashboard', to: '/home', icon: faHome },
	{ label: 'Profile', to: '/info', icon: faUser },
	{ label: 'Resumes', to: '/resumes', icon: faFileAlt },
	{ label: 'Templates', to: '/templates', icon: faLayerGroup },
	{ label: 'Settings', to: null, icon: faGear },
]

const dataRows = [
	{
		key: 'experiences',
		label: 'Experience',
		icon: faBriefcase,
		bg: 'bg-sky-100',
		tone: 'text-sky-700',
		empty: 'Add roles',
	},
	{
		key: 'education',
		label: 'Education',
		icon: faGraduationCap,
		bg: 'bg-emerald-100',
		tone: 'text-emerald-700',
		empty: 'Add school',
	},
	{
		key: 'projects',
		label: 'Projects',
		icon: faRocket,
		bg: 'bg-violet-100',
		tone: 'text-violet-700',
		empty: 'Add projects',
	},
	{
		key: 'skills',
		label: 'Skills',
		icon: faWandMagicSparkles,
		bg: 'bg-cyan-100',
		tone: 'text-cyan-700',
		empty: 'Add skills',
	},
	{
		key: 'summary',
		label: 'Summary',
		icon: faStar,
		bg: 'bg-amber-100',
		tone: 'text-amber-700',
		empty: 'Add summary',
	},
]

const templateSwatches = [
	{ toneClass: 'bg-violet-500', bars: ['w-12', 'w-8', 'w-14'] },
	{ toneClass: 'bg-sky-500', bars: ['w-14', 'w-10', 'w-16'] },
	{ toneClass: 'bg-emerald-500', bars: ['w-10', 'w-16', 'w-12'] },
	{ toneClass: 'bg-rose-500', bars: ['w-12', 'w-14', 'w-9'] },
]

function DashboardSidebar({ collapsed, onToggle, onLogout }) {
	const navigate = useNavigate()
	const location = useLocation()

	const handleNavigate = (item) => {
		if (!item.to) {
			toast('Settings are coming soon')
			return
		}
		navigate(item.to)
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
					onClick={() => navigate('/home')}
					className="flex min-w-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#7c252b]"
					aria-label="taylor.io dashboard"
				>
					<img
						src={collapsed ? '/favorite.png' : resolveLogo('navbar')}
						alt="taylor.io"
						className={collapsed ? 'size-11 rounded-2xl object-contain object-center shadow-sm' : 'h-15 w-auto max-w-[11rem] object-contain object-center'}
					/>
				</button>
			</div>

			<nav className="mt-10 space-y-2" aria-label="Dashboard">
				{navItems.map((item) => {
					const active = item.to && location.pathname === item.to
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
							{active && !collapsed ? (
								<span className="ml-auto h-5 w-1 rounded-full bg-brand-pink" aria-hidden />
							) : null}
						</button>
					)
				})}
			</nav>

			<button
					type="button"
					onClick={onToggle}
					className="absolute -right-4 top-1/2 z-30 inline-flex size-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-brand-pink/18 bg-white text-brand-pink-dark shadow-[0_8px_18px_-12px_rgba(80,12,18,0.55)] transition hover:-right-4 hover:border-brand-pink/35 hover:bg-brand-pink-lighter hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#9f3a40]"
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
				<FontAwesomeIcon icon={faArrowRight} className={collapsed ? 'size-4 rotate-180' : 'size-4 rotate-180'} />
				{collapsed ? null : <span>Log out</span>}
			</button>
		</aside>
	)
}

function MobileNav({ onLogout }) {
	const navigate = useNavigate()

	return (
		<header className="sticky top-0 z-30 border-b border-brand-pink/12 bg-white/82 px-4 py-3 backdrop-blur-xl lg:hidden">
			<div className="flex items-center justify-between gap-3">
				<button type="button" onClick={() => navigate('/home')} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink">
					<img src={resolveLogo('navbar')} alt="taylor.io" className="h-9 w-auto" />
				</button>
				<div className="flex items-center gap-1.5">
					{navItems.slice(0, 4).map((item) => (
						<button
							key={item.label}
							type="button"
							onClick={() => navigate(item.to)}
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

function DashboardCard({ className = '', children }) {
	return (
		<section className={`rounded-[1.35rem] border border-brand-pink/13 bg-white/78 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md ${className}`}>
			{children}
		</section>
	)
}

function PrimaryResumeCard({ onCreate, onChooseProfile }) {
	return (
		<DashboardCard className="relative overflow-hidden bg-brand-pink/[0.08] px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,rgba(214,86,86,0.12),rgba(255,255,255,0.55)_48%,rgba(250,205,205,0.35))]" aria-hidden />
			<div className="pointer-events-none absolute -right-14 top-8 hidden h-72 w-80 opacity-95 md:block" aria-hidden>
				<div className="absolute left-4 top-0 h-12 w-44 rounded-2xl bg-white/80 shadow-[0_14px_34px_-20px_rgba(45,30,38,0.3)] ring-1 ring-brand-pink/12">
					<div className="ml-4 mt-4 h-3 w-16 rounded-full bg-amber-400/80" />
					<div className="ml-24 mt-[-0.55rem] h-2 w-12 rounded-full bg-gray-300/55" />
				</div>
				<div className="absolute left-0 top-16 h-14 w-52 rounded-2xl bg-white/82 shadow-[0_14px_34px_-20px_rgba(45,30,38,0.3)] ring-1 ring-brand-pink/12">
					<div className="ml-4 mt-4 size-5 rounded-full bg-violet-500/85" />
					<div className="ml-14 mt-[-1.1rem] h-2 w-24 rounded-full bg-gray-300/60" />
					<div className="ml-14 mt-2 h-2 w-16 rounded-full bg-gray-300/45" />
				</div>
				<div className="absolute left-8 top-36 h-14 w-52 rounded-2xl bg-white/82 shadow-[0_14px_34px_-20px_rgba(45,30,38,0.3)] ring-1 ring-brand-pink/12">
					<div className="ml-4 mt-4 size-5 rounded-lg bg-sky-500/85" />
					<div className="ml-14 mt-[-1.1rem] h-2 w-28 rounded-full bg-gray-300/60" />
					<div className="ml-14 mt-2 h-2 w-20 rounded-full bg-gray-300/45" />
				</div>
				<div className="absolute left-2 top-56 h-12 w-44 rounded-2xl bg-white/78 shadow-[0_14px_34px_-20px_rgba(45,30,38,0.3)] ring-1 ring-brand-pink/12">
					<div className="ml-4 mt-4 size-4 rounded-full bg-brand-pink/90" />
					<div className="ml-12 mt-[-0.85rem] h-2 w-20 rounded-full bg-gray-300/55" />
				</div>
			</div>

			<div className="relative z-[1] max-w-[28rem]">
				<p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-brand-pink-dark shadow-sm ring-1 ring-brand-pink/12">
					<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" />
					Start here
				</p>
				<h2 className="text-3xl font-black tracking-tight text-gray-950 sm:text-[2.35rem]">Build a r&eacute;sum&eacute; for a role</h2>
				<p className="mt-4 max-w-md text-base leading-relaxed text-gray-700">
					Paste a job description or use your saved career profile to generate a focused version faster.
				</p>

				<div className="mt-6 flex flex-wrap gap-3">
					<button
						type="button"
						onClick={onCreate}
						className="inline-flex items-center gap-2 rounded-xl border border-brand-pink/20 bg-white/88 px-4 py-3 text-sm font-bold text-brand-pink-dark shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						<FontAwesomeIcon icon={faPenToSquare} className="size-4" />
						Paste job description
					</button>
					<button
						type="button"
						onClick={onChooseProfile}
						className="inline-flex items-center gap-2 rounded-xl border border-brand-pink/20 bg-white/88 px-4 py-3 text-sm font-bold text-brand-pink-dark shadow-sm transition hover:-translate-y-0.5 hover:border-brand-pink/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						<FontAwesomeIcon icon={faUser} className="size-4" />
						Use saved profile
					</button>
				</div>

				<button
					type="button"
					onClick={onCreate}
					className="mt-6 inline-flex min-h-[3.15rem] items-center justify-center gap-3 rounded-xl bg-brand-pink px-7 py-3 text-sm font-black text-white shadow-[0_16px_32px_-14px_rgba(214,86,86,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
				>
					Generate tailored r&eacute;sum&eacute;
					<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
				</button>
			</div>
		</DashboardCard>
	)
}

function CareerDataCard({ profile, isLoading, onOpenProfile }) {
	const counts = useMemo(() => {
		const summaryPresent = Boolean(profile?.summary?.summary?.trim())
		return {
			experiences: profile?.experiences?.length || 0,
			education: profile?.education?.length || 0,
			projects: profile?.projects?.length || 0,
			skills: profile?.skills?.length || 0,
			summary: summaryPresent ? 1 : 0,
		}
	}, [profile])

	return (
		<DashboardCard className="p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-black tracking-tight text-gray-950">Your career data</h2>
					<p className="mt-1 text-sm text-gray-500">The pieces Taylor uses to build better versions.</p>
				</div>
				<span className="inline-flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
					<FontAwesomeIcon icon={faShieldHalved} className="size-4" />
				</span>
			</div>

			<div className="mt-5 divide-y divide-gray-200/70">
				{dataRows.map((row) => {
					const count = counts[row.key]
					const ready = count > 0
					return (
						<div key={row.key} className="flex items-center gap-3 py-3">
							<span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${row.bg} ${row.tone}`}>
								<FontAwesomeIcon icon={row.icon} className="size-4" />
							</span>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-gray-900">{row.label}</p>
								<p className="text-xs text-gray-500">{isLoading ? 'Checking...' : ready ? `${count} saved` : row.empty}</p>
							</div>
							<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-pink/[0.08] text-brand-pink-dark'}`}>
								{ready ? <FontAwesomeIcon icon={faCheck} className="size-3" /> : <FontAwesomeIcon icon={faPlus} className="size-3" />}
								{ready ? 'Updated' : 'Add'}
							</span>
						</div>
					)
				})}
			</div>

			<button
				type="button"
				onClick={onOpenProfile}
				className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-pink-dark transition hover:text-brand-pink focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
			>
				Improve profile
				<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
			</button>
		</DashboardCard>
	)
}

function ResumeMiniPreview({ tone = 'brand' }) {
	const toneClass = {
		brand: 'bg-brand-pink',
		sky: 'bg-sky-500',
		emerald: 'bg-emerald-500',
		violet: 'bg-violet-500',
		rose: 'bg-rose-500',
	}[tone] || 'bg-brand-pink'

	return (
		<div className="h-32 rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm">
			<div className="flex gap-3">
				<div className={`${toneClass}/10 flex h-24 w-8 shrink-0 flex-col items-center gap-2 rounded-lg pt-2`}>
					<span className={`size-3 rounded-full ${toneClass}`} />
					<span className={`h-2 w-4 rounded-full ${toneClass}/70`} />
					<span className={`h-2 w-3 rounded-full ${toneClass}/50`} />
				</div>
				<div className="min-w-0 flex-1 pt-1">
					<span className={`block h-2.5 w-16 rounded-full ${toneClass}`} />
					<span className="mt-2 block h-2 w-24 rounded-full bg-gray-300/70" />
					<span className="mt-1.5 block h-2 w-20 rounded-full bg-gray-300/55" />
					<div className="mt-4 space-y-1.5">
						<span className="block h-1.5 w-full rounded-full bg-gray-300/65" />
						<span className="block h-1.5 w-[82%] rounded-full bg-gray-300/55" />
						<span className="block h-1.5 w-[68%] rounded-full bg-gray-300/45" />
					</div>
				</div>
			</div>
		</div>
	)
}

function SavedResumeCard({ resume, index, onLoad, onDelete, formatDate }) {
	const statuses = [
		{ label: 'Draft', className: 'bg-amber-100 text-amber-800' },
		{ label: 'Ready', className: 'bg-emerald-100 text-emerald-800' },
		{ label: 'Saved', className: 'bg-violet-100 text-violet-800' },
	]
	const status = statuses[index % statuses.length]
	const tones = ['brand', 'sky', 'emerald', 'violet']

	return (
		<li className="rounded-2xl border border-gray-200/75 bg-white/82 p-4 shadow-[0_14px_34px_-28px_rgba(45,30,38,0.34)] transition hover:-translate-y-0.5 hover:border-brand-pink/24 hover:shadow-[0_18px_42px_-28px_rgba(214,86,86,0.28)]">
			<ResumeMiniPreview tone={tones[index % tones.length]} />
			<div className="mt-4">
				<h3 className="line-clamp-2 min-h-[2.6rem] font-black leading-snug text-gray-950">{resume.name || `Resume ${index + 1}`}</h3>
				<div className="mt-3 flex items-center justify-between gap-2">
					<span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
					<span className="text-xs text-gray-500">{formatDate(resume.created_at)}</span>
				</div>
			</div>
			<div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
				<button
					type="button"
					onClick={() => onLoad(resume.id)}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 transition hover:bg-brand-pink/[0.08] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
				>
					<FontAwesomeIcon icon={faPenToSquare} className="size-3.5" />
					Open
				</button>
				<button
					type="button"
					onClick={(event) => onDelete(resume.id, event)}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
				>
					<FontAwesomeIcon icon={faTrash} className="size-3.5" />
					Delete
				</button>
			</div>
		</li>
	)
}

function SavedResumesSection({ savedResumes, onCreate, onViewAll, onLoad, onDelete, formatDate }) {
	const items = savedResumes.items || []

	return (
		<DashboardCard className="p-6">
			<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-black tracking-tight text-gray-950">Saved r&eacute;sum&eacute; versions</h2>
					<p className="mt-1 text-sm text-gray-500">{items.length} of {savedResumes.max ?? 3} save slots used</p>
				</div>
				<button
					type="button"
					onClick={onViewAll}
					className="inline-flex items-center gap-2 text-sm font-bold text-brand-pink-dark transition hover:text-brand-pink focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
				>
					Create or load
					<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
				</button>
			</div>

			{items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-brand-pink/24 bg-brand-pink/[0.04] px-5 py-10 text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-white text-brand-pink shadow-sm">
						<FontAwesomeIcon icon={faFileAlt} className="size-5" />
					</div>
					<p className="font-black text-gray-950">No saved versions yet</p>
					<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">Create a tailored preview, save it, and it will show up here as a reusable version.</p>
					<button
						type="button"
						onClick={onCreate}
						className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						Start a r&eacute;sum&eacute;
						<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
					</button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{items.slice(0, 3).map((resume, index) => (
						<SavedResumeCard
							key={resume.id}
							resume={resume}
							index={index}
							onLoad={onLoad}
							onDelete={onDelete}
							formatDate={formatDate}
						/>
					))}
				</ul>
			)}
		</DashboardCard>
	)
}

function TemplatePanel({ onBrowse }) {
	return (
		<DashboardCard className="p-6">
			<h2 className="text-xl font-black tracking-tight text-gray-950">Style your r&eacute;sum&eacute;</h2>
			<p className="mt-1 text-sm text-gray-500">Choose a layout direction before you polish the details.</p>
			<div className="mt-5 grid grid-cols-4 gap-3">
				{templateSwatches.map((template, index) => (
					<div key={`${template.toneClass}-${index}`} className="rounded-xl border border-gray-200/80 bg-white p-2 shadow-sm">
						<div className={`mb-2 h-1.5 rounded-full ${template.toneClass}`} />
						<div className="space-y-1.5">
							{template.bars.map((bar, barIndex) => (
								<span key={barIndex} className={`block h-1.5 rounded-full bg-gray-300/60 ${bar}`} />
							))}
						</div>
					</div>
				))}
			</div>
			<button
				type="button"
				onClick={onBrowse}
				className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink px-4 py-3 text-sm font-black text-white shadow-[0_12px_28px_-18px_rgba(214,86,86,0.72)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
			>
				Browse templates
				<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
			</button>
		</DashboardCard>
	)
}

function ActivityPanel({ savedResumes, profile }) {
	const recentResume = savedResumes.items?.[0]
	const activities = [
		recentResume ? `Saved "${recentResume.name}"` : 'Created your first dashboard',
		profile?.user?.attached_resume_filename ? `Attached ${profile.user.attached_resume_filename}` : 'Profile ready for tailoring',
		`${profile?.projects?.length || 0} projects available for versions`,
	]

	return (
		<DashboardCard className="p-6">
			<h2 className="text-xl font-black tracking-tight text-gray-950">Recent activity</h2>
			<div className="mt-5 divide-y divide-gray-200/70">
				{activities.map((item, index) => (
					<div key={item} className="flex items-center gap-3 py-3">
						<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-pink/[0.08] text-brand-pink-dark">
							<FontAwesomeIcon icon={index === 0 ? faClockRotateLeft : faCheck} className="size-4" />
						</span>
						<p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{item}</p>
					</div>
				))}
			</div>
		</DashboardCard>
	)
}

function ProfileNudge({ onOpenProfile }) {
	return (
		<DashboardCard className="flex flex-col gap-4 bg-violet-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-start gap-4">
				<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
					<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
				</span>
				<div>
					<p className="font-black text-gray-950">Want better results?</p>
					<p className="mt-1 text-sm text-gray-600">Add more projects, skills, and achievements to strengthen each version.</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onOpenProfile}
				className="inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white px-5 py-2.5 text-sm font-black text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
			>
				Improve profile
			</button>
		</DashboardCard>
	)
}

function Home() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
	const [savedResumes, setSavedResumes] = useState({ items: [], max: 3 })

	const fetchSavedResumes = useCallback(async () => {
		try {
			const res = await listSavedResumes()
			const data = res.data || res
			setSavedResumes({ items: data.items || [], max: data.max ?? 3 })
		} catch {
			setSavedResumes({ items: [], max: 3 })
		}
	}, [])

	useEffect(() => {
		const fetchDashboard = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')

			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				const storedUser = JSON.parse(userData)
				setUser(storedUser)

				try {
					const response = await getMyProfile()
					const profileData = response.data || response
					setProfile(profileData)
					if (profileData?.user) setUser(profileData.user)
				} catch {
					setProfile(null)
				}
			} catch {
				navigate('/auth')
				return
			} finally {
				setIsLoading(false)
			}
		}

		fetchDashboard()
	}, [navigate])

	useEffect(() => {
		if (user) fetchSavedResumes()
	}, [user, fetchSavedResumes])

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	const handleLoadSaved = (id) => {
		navigate('/resume/preview', { state: { loadSavedId: id } })
	}

	const handleDeleteSaved = async (id, event) => {
		event?.stopPropagation()
		try {
			await deleteSavedResume(id)
			fetchSavedResumes()
			toast.success('Saved resume deleted')
		} catch {
			toast.error('Failed to delete')
		}
	}

	const formatDate = (dateStr) => {
		if (!dateStr) return 'Recently'
		try {
			const d = new Date(dateStr)
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
		} catch {
			return 'Recently'
		}
	}

	const greetingName = user?.first_name?.trim() || profile?.user?.first_name?.trim() || null

	return (
		<div className="info-scrollbar relative h-screen overflow-hidden bg-[#fff8ef] text-gray-950">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(250,205,205,0.58),transparent_28%),radial-gradient(circle_at_20%_92%,rgba(214,86,86,0.15),transparent_32%)]" aria-hidden />
			<div className="relative z-[1] flex h-screen min-h-0">
				<DashboardSidebar
					collapsed={isSidebarCollapsed}
					onToggle={() => setIsSidebarCollapsed((value) => !value)}
					onLogout={handleLogout}
				/>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<MobileNav onLogout={handleLogout} />

					<main className="info-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-5 lg:py-7 xl:px-6">
						<div className="mx-auto max-w-7xl">
							<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Dashboard</p>
									<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
										{isLoading ? 'Welcome back' : greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
									</h1>
									<p className="mt-2 text-base text-gray-600">Ready to tailor your next r&eacute;sum&eacute;?</p>
								</div>
								<button
									type="button"
									onClick={() => navigate('/resume/create')}
									className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
								>
									<FontAwesomeIcon icon={faPlus} className="size-4" />
									Create new r&eacute;sum&eacute;
								</button>
							</header>

							<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(21rem,0.95fr)]">
								<div className="space-y-6">
									<PrimaryResumeCard
										onCreate={() => navigate('/resume/create/tailor')}
										onChooseProfile={() => navigate('/resume/create/choose')}
									/>
									<SavedResumesSection
										savedResumes={savedResumes}
										onCreate={() => navigate('/resume/create')}
										onViewAll={() => navigate('/resumes')}
										onLoad={handleLoadSaved}
										onDelete={handleDeleteSaved}
										formatDate={formatDate}
									/>
									<ProfileNudge onOpenProfile={() => navigate('/info')} />
								</div>
								<div className="space-y-6">
									<CareerDataCard
										profile={profile}
										isLoading={isLoading}
										onOpenProfile={() => navigate('/info')}
									/>
									<TemplatePanel onBrowse={() => navigate('/templates')} />
									<ActivityPanel savedResumes={savedResumes} profile={profile} />
								</div>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	)
}

export default Home
