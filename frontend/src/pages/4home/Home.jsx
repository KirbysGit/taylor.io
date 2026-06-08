// pages/4home/Home.jsx -- dashboard content, primary resume action, and profile health cards

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faBriefcase,
	faCheck,
	faClockRotateLeft,
	faFileAlt,
	faGraduationCap,
	faBell,
	faBug,
	faCircleInfo,
	faCircleNotch,
	faCircleCheck,
	faCircleXmark,
	faTriangleExclamation,
	faPenToSquare,
	faPlus,
	faRocket,
	faStar,
	faTrash,
	faUser,
	faWandMagicSparkles,
	faXmark,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { getMyProfile, listSavedResumes, deleteSavedResume } from '@/api/services/profile'
import { logoutUser } from '@/api/services/auth'

const dataRows = [
	{
		key: 'experiences',
		label: 'Experience',
		icon: faBriefcase,
		empty: 'No roles yet',
		sectionId: 'experience-section',
	},
	{
		key: 'education',
		label: 'Education',
		icon: faGraduationCap,
		empty: 'No school yet',
		sectionId: 'education-section',
	},
	{
		key: 'projects',
		label: 'Projects',
		icon: faRocket,
		empty: 'No projects yet',
		sectionId: 'projects-section',
	},
	{
		key: 'skills',
		label: 'Skills',
		icon: faWandMagicSparkles,
		empty: 'No skills yet',
		sectionId: 'skills-section',
	},
	{
		key: 'summary',
		label: 'Summary',
		icon: faStar,
		empty: 'No summary yet',
		sectionId: 'summary-section',
	},
]

const templatePreviewTones = ['violet', 'sky', 'emerald', 'rose']

function DashboardCard({ className = '', children }) {
	return (
		<section className={`rounded-[1.35rem] border border-brand-pink/20 bg-white shadow-[0_18px_42px_-26px_rgba(80,42,42,0.46)] ring-1 ring-white ${className}`}>
			{children}
		</section>
	)
}

function DevToolButton({ icon, label, tone = 'neutral', onClick }) {
	const toneClass =
		tone === 'success'
			? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100/70'
			: tone === 'error'
				? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100/70'
				: tone === 'warning'
					? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100/70'
					: tone === 'loading'
						? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100/70'
						: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 hover:bg-sky-100/70'

	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black transition ${toneClass}`}
		>
			<FontAwesomeIcon icon={icon} className="size-3.5 shrink-0" />
			<span className="truncate">{label}</span>
		</button>
	)
}

function DashboardDevDock({ onOpenSetup }) {
	const [open, setOpen] = useState(false)

	const triggerLoadingToast = () => {
		const id = toast.loading('Tailoring in progress - Reviewing your fit for Product Manager at Stripe...')
		window.setTimeout(() => {
			toast.success('Tailored draft ready - Your first version is ready to review.', { id })
		}, 2200)
	}

	return (
		<div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
			{open ? (
				<div className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-brand-pink/20 bg-white/96 shadow-[0_22px_60px_-28px_rgba(60,32,32,0.55)] ring-1 ring-black/[0.05] backdrop-blur-md">
					<div className="flex items-start justify-between gap-3 border-b border-brand-pink/10 bg-gradient-to-r from-brand-pink/[0.08] to-white px-4 py-3">
						<div>
							<p className="text-xs font-black uppercase tracking-[0.16em] text-brand-pink-dark">Dev tools</p>
							<p className="mt-1 text-xs leading-relaxed text-gray-500">Local helpers for testing flows.</p>
						</div>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="flex size-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-gray-700"
							aria-label="Close dev tools"
						>
							<FontAwesomeIcon icon={faXmark} className="size-4" />
						</button>
					</div>

					<div className="space-y-4 p-4">
						<div>
							<p className="mb-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-400">
								Notifications
							</p>
							<div className="grid grid-cols-2 gap-2">
								<DevToolButton
									icon={faCircleCheck}
									label="Résumé saved"
									tone="success"
									onClick={() => toast.success('Résumé saved - Your latest changes were saved as a version.')}
								/>
								<DevToolButton
									icon={faCircleInfo}
									label="Template applied"
									onClick={() => toast('Template applied - Clean Sidebar is now active for this résumé.')}
								/>
								<DevToolButton
									icon={faCircleNotch}
									label="Tailoring"
									tone="loading"
									onClick={triggerLoadingToast}
								/>
								<DevToolButton
									icon={faTriangleExclamation}
									label="Worth review"
									tone="warning"
									onClick={() => toast.custom('Worth reviewing - 2 job description terms were not directly evidenced.')}
								/>
								<DevToolButton
									icon={faCircleXmark}
									label="Export error"
									tone="error"
									onClick={() => toast.error("Couldn't export PDF - Try again in a moment or switch to Print Layout.")}
								/>
								<DevToolButton
									icon={faCircleCheck}
									label="Profile updated"
									tone="success"
									onClick={() => toast.success('Profile updated - Your project details are ready to use in future résumés.')}
								/>
							</div>
						</div>

						<div>
							<p className="mb-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-400">
								Navigation
							</p>
							<DevToolButton
								icon={faWandMagicSparkles}
								label="Open account setup"
								tone="warning"
								onClick={onOpenSetup}
							/>
						</div>
					</div>
				</div>
			) : null}

			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className="inline-flex size-12 items-center justify-center rounded-full bg-[#9f3a40] text-white shadow-[0_18px_44px_-18px_rgba(60,12,18,0.7)] ring-1 ring-white/30 transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
				aria-label={open ? 'Close dev tools' : 'Open dev tools'}
				aria-expanded={open}
			>
				<FontAwesomeIcon icon={open ? faXmark : faBug} className="size-5" />
			</button>
		</div>
	)
}

function StartOptionButton({ icon, label, description, badge, onClick, featured = false }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				'group relative flex h-full min-h-[9.25rem] flex-col overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
				featured
					? 'border-transparent bg-gradient-to-br from-[#9f3a40] via-[#c25a56] to-[#d97f7c] shadow-[0_18px_42px_-26px_rgba(80,18,22,0.55)] hover:shadow-[0_22px_48px_-26px_rgba(80,18,22,0.5)]'
					: 'border-gray-200 bg-white shadow-[0_16px_40px_-22px_rgba(45,30,38,0.32)] ring-1 ring-black/[0.02] hover:border-brand-pink/55 hover:shadow-[0_22px_50px_-24px_rgba(214,86,86,0.32)]',
			].join(' ')}
		>
			{featured ? (
				<span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_10%_92%,rgba(0,0,0,0.16),transparent_36%)]" aria-hidden />
			) : null}
			<div className="relative z-[1] flex items-start justify-between gap-3">
				<span
					className={[
						'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition group-hover:scale-[1.03]',
						featured ? 'bg-white/16 text-white ring-1 ring-white/25' : 'bg-brand-pink/[0.08] text-brand-pink-dark',
					].join(' ')}
				>
					<FontAwesomeIcon icon={icon} className="size-4" />
				</span>
				{badge ? (
					<span
						className={[
							'rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] ring-1',
							featured ? 'bg-white/14 text-white ring-white/22' : 'bg-brand-pink/[0.08] text-brand-pink-dark ring-brand-pink/12',
						].join(' ')}
					>
						{badge}
					</span>
				) : null}
			</div>
			<h3 className={`relative z-[1] mt-4 text-base font-black tracking-tight ${featured ? 'text-white' : 'text-gray-950'}`}>{label}</h3>
			<p className={`relative z-[1] mt-1.5 flex-1 text-sm leading-relaxed ${featured ? 'text-white' : 'text-gray-600'}`}>{description}</p>
			<span className={`relative z-[1] mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] ${featured ? 'text-white' : 'text-brand-pink-dark'}`}>
				Start
				<FontAwesomeIcon icon={faArrowRight} className="size-3 transition group-hover:translate-x-0.5" />
			</span>
		</button>
	)
}

function PrimaryResumeCard({ onCreate, onChooseProfile, onStartFresh }) {
	const startOptions = [
		{
			label: 'Tailor to a role',
			description: 'Paste a job description and let Taylor shape the strongest version.',
			icon: faWandMagicSparkles,
			badge: 'Best start',
			onClick: onCreate,
			featured: true,
		},
		{
			label: 'Use saved profile',
			description: 'Choose the career data you already saved and assemble a focused draft.',
			icon: faUser,
			onClick: onChooseProfile,
		},
		{
			label: 'Start fresh',
			description: 'Open a blank editor when you want complete manual control.',
			icon: faPlus,
			onClick: onStartFresh,
		},
	]

	return (
		<DashboardCard className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
			<span className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-pink/[0.12] blur-3xl" aria-hidden />
			<p className="relative z-[1] mb-3 inline-flex items-center gap-2 rounded-full bg-brand-pink/[0.08] px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-brand-pink-dark ring-1 ring-brand-pink/12">
				<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" />
				Start here
			</p>
			<h2 className="text-3xl font-black tracking-tight text-gray-950 sm:text-[2.35rem]">Build a r&eacute;sum&eacute; for a role</h2>
			<p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
				Pick the path that matches what you need right now. Taylor will bring you into the editor from there.
			</p>

			<div className="mt-6 grid gap-3 sm:grid-cols-3 lg:gap-4">
				{startOptions.map((option) => (
					<StartOptionButton key={option.label} {...option} />
				))}
			</div>
		</DashboardCard>
	)
}

function CareerDataCard({ profile, isLoading, onOpenProfile, onOpenSection }) {
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
	const readyCount = dataRows.filter((row) => counts[row.key] > 0).length
	const totalCount = dataRows.length

	return (
		<DashboardCard className="p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-black tracking-tight text-gray-950">Your career data</h2>
					<p className="mt-1 text-sm text-gray-500">Profile sections Taylor can use for better r&eacute;sum&eacute;s.</p>
				</div>
				<span className="inline-flex shrink-0 rounded-full bg-brand-pink/[0.08] px-3 py-1.5 text-xs font-black text-brand-pink-dark ring-1 ring-brand-pink/12">
					{isLoading ? 'Checking' : `${readyCount}/${totalCount} ready`}
				</span>
			</div>

			<div className="mt-5 divide-y divide-gray-200/70">
				{dataRows.map((row) => {
					const count = counts[row.key]
					const ready = count > 0
					return (
						<div key={row.key} className="flex items-center gap-3 py-3">
							<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink/60 via-brand-pink-lighter to-brand-pink/18 p-px shadow-[0_8px_18px_-14px_rgba(214,86,86,0.65)]">
								<span className="flex size-full items-center justify-center rounded-[0.68rem] bg-white text-brand-pink-dark">
									<FontAwesomeIcon icon={row.icon} className="size-4" />
								</span>
							</span>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-gray-900">{row.label}</p>
								<p className="text-xs text-gray-500">{isLoading ? 'Checking...' : ready ? `${count} saved` : row.empty}</p>
							</div>
							{ready || isLoading ? (
								<span className="inline-flex rounded-full bg-gradient-to-r from-brand-pink/45 via-brand-pink-lighter to-brand-pink/18 p-px shadow-sm">
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-pink-dark">
										<FontAwesomeIcon icon={ready ? faCheck : faCircleNotch} className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
										{isLoading ? 'Checking' : 'Ready'}
									</span>
								</span>
							) : (
								<button
									type="button"
									onClick={() => onOpenSection(row.sectionId)}
									className="group inline-flex rounded-full bg-gradient-to-r from-brand-pink/55 via-brand-pink-lighter to-brand-pink/24 p-px shadow-sm transition hover:from-brand-pink hover:via-brand-pink/55 hover:to-brand-pink/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
									aria-label={`Add ${row.label.toLowerCase()} to your profile`}
								>
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-pink-dark transition group-hover:bg-brand-pink/[0.045]">
										<FontAwesomeIcon icon={faPlus} className="size-3 transition group-hover:rotate-90" />
										Missing
									</span>
								</button>
							)}
						</div>
					)
				})}
			</div>

			<button
				type="button"
				onClick={onOpenProfile}
				className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-pink/18 bg-brand-pink/[0.055] px-4 py-2.5 text-sm font-black text-brand-pink-dark transition hover:border-brand-pink/35 hover:bg-brand-pink/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
			>
				Review profile data
				<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
			</button>
		</DashboardCard>
	)
}

function ResumeMiniPreview({ tone = 'brand', compact = false }) {
	const toneClass = {
		brand: 'bg-brand-pink',
		sky: 'bg-sky-500',
		emerald: 'bg-emerald-500',
		violet: 'bg-violet-500',
		rose: 'bg-rose-500',
	}[tone] || 'bg-brand-pink'

	return (
		<div
			className={[
				'rounded-lg border border-gray-200/80 bg-white shadow-sm',
				compact ? 'h-[4.75rem] p-2' : 'h-32 rounded-xl p-3',
			].join(' ')}
		>
			<div className={['flex', compact ? 'gap-2' : 'gap-3'].join(' ')}>
				<div
					className={[
						`${toneClass}/10 flex shrink-0 flex-col items-center rounded-md pt-1.5`,
						compact ? 'h-14 w-6 gap-1' : 'h-24 w-8 gap-2 rounded-lg pt-2',
					].join(' ')}
				>
					<span className={`rounded-full ${toneClass} ${compact ? 'size-2' : 'size-3'}`} />
					<span className={`rounded-full ${toneClass}/70 ${compact ? 'h-1 w-3' : 'h-2 w-4'}`} />
					{compact ? null : <span className={`h-2 w-3 rounded-full ${toneClass}/50`} />}
				</div>
				<div className="min-w-0 flex-1 pt-0.5">
					<span className={`block rounded-full ${toneClass} ${compact ? 'h-1.5 w-10' : 'h-2.5 w-16'}`} />
					<span
						className={[
							'block rounded-full bg-gray-300/70',
							compact ? 'mt-1 h-1 w-14' : 'mt-2 h-2 w-24',
						].join(' ')}
					/>
					<div className={['space-y-1', compact ? 'mt-1.5' : 'mt-4 space-y-1.5'].join(' ')}>
						<span className={`block rounded-full bg-gray-300/65 ${compact ? 'h-1 w-full' : 'h-1.5 w-full'}`} />
						<span
							className={[
								'block rounded-full bg-gray-300/55',
								compact ? 'h-1 w-[78%]' : 'h-1.5 w-[82%]',
							].join(' ')}
						/>
						{compact ? null : <span className="block h-1.5 w-[68%] rounded-full bg-gray-300/45" />}
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

function SavedResumesSection({ savedResumes, onCreate, onViewAll, onLoad, onDelete, formatDate, className = '' }) {
	const items = savedResumes.items || []

	return (
		<DashboardCard className={`flex flex-col p-6 max-xl:flex-none xl:min-h-0 xl:flex-1 ${className}`.trim()}>
			<div className="mb-5 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
				<div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-brand-pink/24 bg-brand-pink/[0.04] px-5 py-10 text-center">
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
				<ul className="grid min-h-0 flex-1 content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
		<DashboardCard className="flex flex-col p-6 max-xl:flex-none xl:min-h-0 xl:flex-1">
			<div className="shrink-0">
				<h2 className="text-xl font-black tracking-tight text-gray-950">Style your r&eacute;sum&eacute;</h2>
				<p className="mt-1 text-sm text-gray-500">Choose a layout direction before you polish the details.</p>
			</div>

			<div className="mt-5 grid shrink-0 grid-cols-2 gap-2 sm:gap-3">
				{templatePreviewTones.map((tone) => (
					<ResumeMiniPreview key={tone} tone={tone} compact />
				))}
			</div>

			<div className="hidden min-h-0 flex-1 xl:block" aria-hidden />

			<button
				type="button"
				onClick={onBrowse}
				className="mt-5 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-pink px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_-18px_rgba(214,86,86,0.72)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
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

function SkeletonBlock({ className = '' }) {
	return <span className={`block animate-pulse rounded-full bg-brand-pink/[0.1] ${className}`} aria-hidden />
}

function HomeLoadingState() {
	return (
		<div className="mx-auto max-w-7xl" role="status" aria-live="polite" aria-label="Loading your dashboard">
			<header className="mb-7">
				<SkeletonBlock className="h-3 w-20" />
				<SkeletonBlock className="mt-4 h-10 w-[min(22rem,72vw)]" />
				<SkeletonBlock className="mt-3 h-4 w-52" />
			</header>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(21rem,0.95fr)]">
				<div className="flex flex-col gap-6">
					<DashboardCard className="p-6 sm:p-7">
						<SkeletonBlock className="h-6 w-24" />
						<SkeletonBlock className="mt-5 h-9 w-[min(28rem,82%)]" />
						<SkeletonBlock className="mt-4 h-4 w-[min(26rem,74%)]" />
						<div className="mt-7 grid gap-3 sm:grid-cols-3 lg:gap-4">
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className="min-h-[9.25rem] rounded-2xl border border-gray-200/80 bg-white p-4">
									<SkeletonBlock className="size-11 rounded-2xl" />
									<SkeletonBlock className="mt-5 h-4 w-28" />
									<SkeletonBlock className="mt-3 h-3 w-full" />
									<SkeletonBlock className="mt-2 h-3 w-3/4" />
								</div>
							))}
						</div>
					</DashboardCard>

					<DashboardCard className="p-6">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1">
								<SkeletonBlock className="h-6 w-48" />
								<SkeletonBlock className="mt-3 h-3 w-40" />
							</div>
							<SkeletonBlock className="h-8 w-24" />
						</div>
						<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{Array.from({ length: 3 }).map((_, index) => (
								<div key={index} className="h-52 animate-pulse rounded-2xl border border-gray-200/75 bg-brand-pink/[0.035]" aria-hidden />
							))}
						</div>
					</DashboardCard>
				</div>

				<div className="flex flex-col gap-6">
					<DashboardCard className="p-6">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1">
								<SkeletonBlock className="h-6 w-36" />
								<SkeletonBlock className="mt-3 h-3 w-48" />
							</div>
							<SkeletonBlock className="h-8 w-20" />
						</div>
						<div className="mt-6 divide-y divide-gray-200/70">
							{Array.from({ length: 5 }).map((_, index) => (
								<div key={index} className="flex items-center gap-3 py-3">
									<SkeletonBlock className="size-9 shrink-0 rounded-xl" />
									<div className="min-w-0 flex-1">
										<SkeletonBlock className="h-4 w-24" />
										<SkeletonBlock className="mt-2 h-3 w-20" />
									</div>
									<SkeletonBlock className="h-7 w-16" />
								</div>
							))}
						</div>
					</DashboardCard>

					<DashboardCard className="p-6">
						<SkeletonBlock className="h-6 w-36" />
						<SkeletonBlock className="mt-3 h-3 w-56" />
						<div className="mt-6 grid grid-cols-2 gap-3">
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className="h-[4.75rem] animate-pulse rounded-lg border border-gray-200/75 bg-brand-pink/[0.035]" aria-hidden />
							))}
						</div>
						<SkeletonBlock className="mt-5 h-10 w-full rounded-xl" />
					</DashboardCard>
				</div>
			</div>
			<span className="sr-only">Loading your profile and saved resume versions.</span>
		</div>
	)
}

function Home() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
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
			const userData = localStorage.getItem('user')

			try {
				if (userData) setUser(JSON.parse(userData))

				const [response] = await Promise.all([
					getMyProfile(),
					fetchSavedResumes(),
				])
				const profileData = response.data || response
				setProfile(profileData)
				if (profileData?.user) setUser(profileData.user)
			} catch {
				navigate('/auth')
				return
			} finally {
				setIsLoading(false)
			}
		}

		fetchDashboard()
	}, [navigate, fetchSavedResumes])

	const handleLogout = async () => {
		await logoutUser()
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

	if (isLoading) {
		return (
			<DashboardShell onLogout={handleLogout}>
				<HomeLoadingState />
			</DashboardShell>
		)
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
				<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Dashboard</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
							{greetingName ? (
								<>
									Welcome back,{' '}
									<span className="bg-gradient-to-r from-brand-pink to-red-600 bg-clip-text text-[1.14em] font-black leading-none text-transparent sm:text-[1.16em]">
										{greetingName}
									</span>
								</>
							) : (
								'Welcome back'
							)}
						</h1>
						<p className="mt-2 text-base text-gray-600">Ready to tailor your next r&eacute;sum&eacute;?</p>
					</div>
				</header>

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(21rem,0.95fr)] xl:items-stretch">
					<div className="flex min-h-0 flex-col gap-6">
						<div className="shrink-0">
							<PrimaryResumeCard
								onCreate={() => navigate('/resume/create/tailor')}
								onChooseProfile={() => navigate('/resume/create/choose')}
								onStartFresh={() => navigate('/resume/preview', { state: { createMode: 'startFresh' } })}
							/>
						</div>
						<SavedResumesSection
							savedResumes={savedResumes}
							onCreate={() => navigate('/resume/create')}
							onViewAll={() => navigate('/resumes')}
							onLoad={handleLoadSaved}
							onDelete={handleDeleteSaved}
							formatDate={formatDate}
						/>
					</div>
					<div className="flex min-h-0 flex-col gap-6">
						<div className="shrink-0">
							<CareerDataCard
								profile={profile}
								isLoading={false}
								onOpenProfile={() => navigate('/info')}
								onOpenSection={(sectionId) => navigate(`/info#${sectionId}`)}
							/>
						</div>
						<TemplatePanel onBrowse={() => navigate('/templates')} />
					</div>
				</div>
				<DashboardDevDock onOpenSetup={() => navigate('/setup')} />
			</div>
		</DashboardShell>
	)
}

export default Home
