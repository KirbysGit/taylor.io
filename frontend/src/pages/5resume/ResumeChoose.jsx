// pages/5resume/ResumeChoose.jsx -- pick profile rows for this resume

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowLeft,
	faArrowRight,
	faBriefcase,
	faCheck,
	faGraduationCap,
	faLayerGroup,
	faListCheck,
	faUser,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { getMyProfile } from '@/api/services/profile'

function SelectTile({ id, selected, onToggle, children }) {
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={selected}
			onClick={() => onToggle(id)}
			className={[
				'group w-full rounded-2xl border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:duration-75',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
				selected
					? 'border-brand-pink/36 bg-brand-pink/[0.08] shadow-[0_12px_32px_-18px_rgba(214,86,86,0.38)] ring-1 ring-brand-pink/[0.14]'
					: 'border-gray-200/70 bg-white/82 hover:-translate-y-0.5 hover:border-brand-pink/24 hover:bg-white hover:shadow-[0_14px_34px_-28px_rgba(45,30,38,0.22)]',
			].join(' ')}
		>
			<span className="flex items-start gap-3.5">
				<span
					className={[
						'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150',
						selected ? 'border-brand-pink bg-brand-pink text-white shadow-sm' : 'border-gray-300/90 bg-white text-transparent group-hover:border-brand-pink/40',
					].join(' ')}
					aria-hidden
				>
					{selected ? <FontAwesomeIcon icon={faCheck} className="size-3" /> : null}
				</span>
				<span className="min-w-0 flex-1">{children}</span>
			</span>
		</button>
	)
}

function SectionChrome({
	title,
	subtitle,
	icon,
	iconClass,
	countLabel,
	canSelectBulk,
	onSelectAll,
	onDeselectAll,
	emptyChildren,
	hasItems,
	children,
}) {
	return (
		<section className="overflow-hidden rounded-[1.35rem] border border-brand-pink/13 bg-white/78 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md">
			<div className="flex flex-col gap-4 border-b border-gray-200/60 bg-gradient-to-b from-white/90 to-transparent px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-4">
					<span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
						<FontAwesomeIcon icon={icon} className="size-5" />
					</span>
					<div>
						<p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-pink-dark">{subtitle}</p>
						<h2 className="mt-0.5 text-xl font-black tracking-tight text-gray-950">{title}</h2>
						<p className="mt-1 text-sm text-gray-500">{countLabel}</p>
					</div>
				</div>
				{canSelectBulk ? (
					<div className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							onClick={onSelectAll}
							className="rounded-full border border-brand-pink/30 bg-brand-pink/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-brand-pink-dark transition hover:bg-brand-pink/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							All
						</button>
						<button
							type="button"
							onClick={onDeselectAll}
							className="rounded-full border border-transparent px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-gray-500 transition hover:bg-gray-500/[0.08] hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40"
						>
							None
						</button>
					</div>
				) : null}
			</div>

			<div className="p-5 pt-4">
				{hasItems ? (
					<div className="space-y-2.5">{children}</div>
				) : (
					<p className="rounded-2xl border border-dashed border-brand-pink/22 bg-brand-pink/[0.035] px-4 py-6 text-center text-sm text-gray-600">{emptyChildren}</p>
				)}
			</div>
		</section>
	)
}

function ChooseLoadingSkeleton({ onLogout }) {
	return (
		<DashboardShell onLogout={onLogout}>
			<div className="mx-auto max-w-5xl space-y-6">
				<div className="space-y-3">
					<div className="h-10 max-w-[18rem] animate-pulse rounded-xl bg-brand-pink/15" />
					<div className="h-4 max-w-xl animate-pulse rounded bg-gray-300/40" />
				</div>
				{[1, 2, 3].map((key) => (
					<div key={key} className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 p-5 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)]">
						<div className="mb-4 h-5 w-40 animate-pulse rounded bg-gray-200/70" />
						<div className="space-y-2.5">
							<div className="h-16 animate-pulse rounded-2xl bg-gray-200/40" />
							<div className="h-16 animate-pulse rounded-2xl bg-gray-200/30" />
						</div>
					</div>
				))}
			</div>
		</DashboardShell>
	)
}

export default function ResumeChoose() {
	const navigate = useNavigate()
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedEduIds, setSelectedEduIds] = useState(new Set())
	const [selectedExpIds, setSelectedExpIds] = useState(new Set())
	const [selectedProjIds, setSelectedProjIds] = useState(new Set())

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	useEffect(() => {
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		const fetchProfile = async () => {
			try {
				const res = await getMyProfile()
				const data = res.data || res
				setProfile(data)
				setSelectedEduIds(new Set((data.education || []).map((e) => e.id)))
				setSelectedExpIds(new Set((data.experiences || []).map((e) => e.id)))
				setSelectedProjIds(new Set((data.projects || []).map((p) => p.id)))
			} catch {
				toast.error('Failed to load profile')
				navigate('/resume/create')
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	const toggleEdu = (id) => {
		setSelectedEduIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleExp = (id) => {
		setSelectedExpIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const toggleProj = (id) => {
		setSelectedProjIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	const education = profile?.education || []
	const experiences = profile?.experiences || []
	const projects = profile?.projects || []

	const selectAllEdu = () => setSelectedEduIds(new Set(education.map((e) => e.id)))
	const deselectAllEdu = () => setSelectedEduIds(new Set())
	const selectAllExp = () => setSelectedExpIds(new Set(experiences.map((e) => e.id)))
	const deselectAllExp = () => setSelectedExpIds(new Set())
	const selectAllProj = () => setSelectedProjIds(new Set(projects.map((p) => p.id)))
	const deselectAllProj = () => setSelectedProjIds(new Set())

	const handleContinue = () => {
		navigate('/resume/preview', {
			state: {
				createMode: 'choose',
				selectedEducationIds: Array.from(selectedEduIds),
				selectedExperienceIds: Array.from(selectedExpIds),
				selectedProjectIds: Array.from(selectedProjIds),
			},
		})
	}

	const totals = useMemo(() => {
		const totalSlots = education.length + experiences.length + projects.length
		const picked = selectedEduIds.size + selectedExpIds.size + selectedProjIds.size
		return { totalSlots, picked }
	}, [education.length, experiences.length, projects.length, selectedEduIds, selectedExpIds, selectedProjIds])

	if (isLoading) return <ChooseLoadingSkeleton onLogout={handleLogout} />

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-5xl pb-24">
				<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<button
							type="button"
							onClick={() => navigate('/resume/create')}
							className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-brand-pink-dark focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<FontAwesomeIcon icon={faArrowLeft} className="size-3.5" />
							Back to build options
						</button>
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Choose from profile</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Pick what belongs in this version</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Select the education, experience, and projects to include. You can tighten the list later in the editor.
						</p>
					</div>
					<div className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 px-5 py-4 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80">
						<p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">Selected</p>
						<p className="mt-1 text-2xl font-black text-gray-950">
							{totals.picked}
							<span className="text-base text-gray-400"> / {totals.totalSlots}</span>
						</p>
					</div>
				</header>

				<section className="mb-6 rounded-[1.35rem] border border-brand-pink/13 bg-brand-pink/[0.07] p-5 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-start gap-4">
							<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/82 text-brand-pink-dark">
								<FontAwesomeIcon icon={faListCheck} className="size-5" />
							</span>
							<div>
								<p className="font-black text-gray-950">Curate from your saved profile</p>
								<p className="mt-1 text-sm leading-relaxed text-gray-600">This creates a focused starting point before you edit, style, or export.</p>
							</div>
						</div>
						<button
							type="button"
							onClick={handleContinue}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						>
							Continue to editor
							<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
						</button>
					</div>
				</section>

				<div className="space-y-6">
					<SectionChrome
						title="Education"
						subtitle="Academic history"
						icon={faGraduationCap}
						iconClass="bg-emerald-100 text-emerald-700"
						countLabel={`${selectedEduIds.size} of ${education.length} selected`}
						canSelectBulk={education.length > 0}
						onSelectAll={selectAllEdu}
						onDeselectAll={deselectAllEdu}
						hasItems={education.length > 0}
						emptyChildren="Nothing here yet. Add education under Info."
					>
						{education.map((edu) => (
							<SelectTile key={edu.id} id={edu.id} selected={selectedEduIds.has(edu.id)} onToggle={toggleEdu}>
								<p className="font-black leading-snug text-gray-950">
									{edu.degree && edu.discipline
										? `${edu.degree} in ${edu.discipline}`
										: edu.degree || edu.discipline || 'Education'}
								</p>
								<p className="mt-1 text-sm leading-relaxed text-gray-600">
									{[edu.school, edu.location].filter(Boolean).join(' · ') || 'No school saved.'}
								</p>
							</SelectTile>
						))}
					</SectionChrome>

					<SectionChrome
						title="Experience"
						subtitle="Roles & impact"
						icon={faBriefcase}
						iconClass="bg-sky-100 text-sky-700"
						countLabel={`${selectedExpIds.size} of ${experiences.length} selected`}
						canSelectBulk={experiences.length > 0}
						onSelectAll={selectAllExp}
						onDeselectAll={deselectAllExp}
						hasItems={experiences.length > 0}
						emptyChildren="Nothing here yet. Add roles under Info."
					>
						{experiences.map((exp) => (
							<SelectTile key={exp.id} id={exp.id} selected={selectedExpIds.has(exp.id)} onToggle={toggleExp}>
								<p className="font-black text-gray-950">
									{exp.title || 'Experience'}
									{exp.company ? <span className="font-semibold text-gray-600"> · {exp.company}</span> : null}
								</p>
								<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{exp.description || 'No description saved.'}</p>
							</SelectTile>
						))}
					</SectionChrome>

					<SectionChrome
						title="Projects"
						subtitle="Highlights"
						icon={faLayerGroup}
						iconClass="bg-violet-100 text-violet-700"
						countLabel={`${selectedProjIds.size} of ${projects.length} selected`}
						canSelectBulk={projects.length > 0}
						onSelectAll={selectAllProj}
						onDeselectAll={deselectAllProj}
						hasItems={projects.length > 0}
						emptyChildren="Nothing here yet. Add projects under Info."
					>
						{projects.map((proj) => (
							<SelectTile key={proj.id} id={proj.id} selected={selectedProjIds.has(proj.id)} onToggle={toggleProj}>
								<p className="font-black text-gray-950">{proj.title || 'Project'}</p>
								<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{proj.description || 'No description saved.'}</p>
							</SelectTile>
						))}
					</SectionChrome>
				</div>

				<div className="sticky bottom-0 z-10 -mx-4 mt-6 flex justify-center border-t border-brand-pink/12 bg-gradient-to-t from-[#fff8ef] via-[#fff8ef]/95 to-transparent px-4 pb-5 pt-5 sm:-mx-5 lg:-mx-5 xl:-mx-6">
					<button
						type="button"
						onClick={handleContinue}
						className="inline-flex items-center gap-2 rounded-xl border border-brand-pink/30 bg-brand-pink px-8 py-3 text-sm font-black text-white shadow-[0_12px_32px_-12px_rgba(214,86,86,0.55)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						Continue to editor
						<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
					</button>
				</div>
			</div>
		</DashboardShell>
	)
}
