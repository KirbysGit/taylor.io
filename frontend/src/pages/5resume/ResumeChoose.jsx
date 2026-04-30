// pages/5resume/ResumeChoose.jsx — pick profile rows for this resume; tiles feel selectable, not a raw checklist

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopNav from '@/components/TopNav'
import { ChevronLeft } from '@/components/icons'
import { getMyProfile } from '@/api/services/profile'

/** Visible checkbox affordance — whole row stays the hit target without default checkbox chrome */
function SelectTile({
	id,
	selected,
	onToggle,
	children,
}) {
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={selected}
			onClick={() => onToggle(id)}
			className={[
				'group w-full rounded-2xl border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 motion-reduce:duration-75',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
				selected
					? 'border-brand-pink/40 bg-brand-pink/[0.08] shadow-[0_12px_32px_-16px_rgba(214,86,86,0.35)] ring-1 ring-brand-pink/[0.15]'
					: 'border-gray-200/70 bg-white/80 hover:border-brand-pink/25 hover:bg-white hover:shadow-[0_8px_24px_-20px_rgba(45,38,42,0.12)] motion-safe:active:scale-[0.995]',
				'motion-reduce:active:scale-100',
			].join(' ')}
		>
			<span className="flex items-start gap-3.5">
				<span
					className={[
						'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150',
						selected ? 'border-brand-pink bg-brand-pink text-white shadow-sm' : 'border-gray-300/90 bg-white text-transparent group-hover:border-brand-pink/40',
					].join(' ')}
					aria-hidden
				>
					<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
						{selected ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : null}
					</svg>
				</span>
				<span className="min-w-0 flex-1">{children}</span>
			</span>
		</button>
	)
}

function SectionChrome({
	title,
	subtitle,
	countLabel,
	canSelectBulk,
	onSelectAll,
	onDeselectAll,
	emptyChildren,
	hasItems,
	children,
}) {
	return (
		<section className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white/55 shadow-[0_14px_40px_-26px_rgba(55,42,42,0.18)] backdrop-blur-[2px] ring-1 ring-white/70">
			<div className="flex flex-col gap-3 border-b border-gray-200/50 bg-gradient-to-b from-white/90 to-transparent px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{subtitle}</p>
					<h2 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">{title}</h2>
					<p className="mt-1 text-xs text-gray-500 sm:text-sm">{countLabel}</p>
				</div>
				{canSelectBulk ? (
					<div className="flex shrink-0 items-center gap-2">
						<button
							type="button"
							onClick={onSelectAll}
							className="rounded-full border border-brand-pink/35 bg-brand-pink/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-pink-dark transition hover:bg-brand-pink/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							All
						</button>
						<button
							type="button"
							onClick={onDeselectAll}
							className="rounded-full border border-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 transition hover:bg-gray-500/[0.08] hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40"
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
					<p className="rounded-xl border border-dashed border-gray-300/65 bg-gray-500/[0.04] px-4 py-6 text-center text-sm text-gray-600">{emptyChildren}</p>
				)}
			</div>
		</section>
	)
}

function ChooseLoadingSkeleton() {
	return (
		<div className="mx-auto max-w-4xl space-y-6 px-8 py-12">
			<div className="space-y-2">
				<div className="h-10 max-w-[14rem] animate-pulse rounded-lg bg-brand-pink/15" />
				<div className="h-4 max-w-md animate-pulse rounded bg-gray-300/40" />
			</div>
			{[1, 2].map((k) => (
				<div key={k} className="rounded-2xl border border-gray-200/60 bg-white/45 p-5 ring-1 ring-white/70">
					<div className="mb-4 h-5 w-36 animate-pulse rounded bg-gray-200/55" />
					<div className="space-y-2.5">
						<div className="h-16 animate-pulse rounded-xl bg-gray-200/35" />
						<div className="h-16 animate-pulse rounded-xl bg-gray-200/30" />
					</div>
				</div>
			))}
		</div>
	)
}

function ResumeChoose() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [selectedEduIds, setSelectedEduIds] = useState(new Set())
	const [selectedExpIds, setSelectedExpIds] = useState(new Set())
	const [selectedProjIds, setSelectedProjIds] = useState(new Set())

	useEffect(() => {
		const token = localStorage.getItem('token')
		if (!token) {
			navigate('/auth')
			return
		}

		const userData = localStorage.getItem('user')
		if (userData) setUser(JSON.parse(userData))

		const fetchProfile = async () => {
			try {
				const res = await getMyProfile()
				const data = res.data || res
				setProfile(data)
				const eduIds = new Set((data.education || []).map((e) => e.id))
				const expIds = new Set((data.experiences || []).map((e) => e.id))
				const projIds = new Set((data.projects || []).map((p) => p.id))
				setSelectedEduIds(eduIds)
				setSelectedExpIds(expIds)
				setSelectedProjIds(projIds)
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

	const selectAllEdu = () => {
		setSelectedEduIds(new Set((profile?.education || []).map((e) => e.id)))
	}

	const deselectAllEdu = () => setSelectedEduIds(new Set())

	const selectAllExp = () => {
		setSelectedExpIds(new Set((profile?.experiences || []).map((e) => e.id)))
	}

	const deselectAllExp = () => setSelectedExpIds(new Set())

	const selectAllProj = () => {
		setSelectedProjIds(new Set((profile?.projects || []).map((p) => p.id)))
	}

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

	const education = profile?.education || []
	const experiences = profile?.experiences || []
	const projects = profile?.projects || []

	const totals = useMemo(() => {
		const totalSlots = education.length + experiences.length + projects.length
		const picked = selectedEduIds.size + selectedExpIds.size + selectedProjIds.size
		return { totalSlots, picked }
	}, [education.length, experiences.length, projects.length, selectedEduIds, selectedExpIds, selectedProjIds])

	const shell = (
		<div
			className="relative flex min-h-screen flex-col overflow-x-hidden bg-cream info-scrollbar overflow-y-auto [scrollbar-gutter:stable]"
			style={{ height: '100vh' }}
		>
			<TopNav
				user={user}
				onLogout={() => {
					localStorage.removeItem('token')
					localStorage.removeItem('user')
					navigate('/')
				}}
			/>

			<main className="flex flex-1 flex-col pb-24 pt-10 sm:pb-28 sm:pt-14">
				{isLoading ? (
					<ChooseLoadingSkeleton />
				) : (
					<div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 sm:px-8">
						<button
							type="button"
							onClick={() => navigate('/resume/create')}
							className="group mb-8 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
						>
							<ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
							Back to create options
						</button>

						<header className="mb-10 text-center sm:mb-12">
							<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
								Choose from profile
							</h1>
							<p className="mx-auto mt-3 max-w-2xl text-pretty text-gray-600 sm:text-[1.05rem] sm:leading-relaxed">
								Tap each item to include it on this resume. You can tighten the list later in the editor.
							</p>
							{totals.totalSlots > 0 ? (
								<p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
									<span className="text-gray-800">{totals.picked}</span>
									{' of '}
									<span>{totals.totalSlots}</span>
									{' '}entries selected
								</p>
							) : null}
						</header>

						<div className="mx-auto flex max-w-4xl flex-col gap-10">
							<SectionChrome
								title="Education"
								subtitle="Academic history"
								countLabel={`${selectedEduIds.size} of ${education.length} selected`}
								canSelectBulk={education.length > 0}
								onSelectAll={selectAllEdu}
								onDeselectAll={deselectAllEdu}
								hasItems={education.length > 0}
								emptyChildren="Nothing here yet — add education under Info."
							>
								{education.map((edu) => (
									<SelectTile
										key={edu.id}
										id={edu.id}
										selected={selectedEduIds.has(edu.id)}
										onToggle={toggleEdu}
									>
										<p className="font-semibold leading-snug text-gray-900">
											{edu.degree && edu.discipline
												? `${edu.degree} in ${edu.discipline}`
												: edu.degree || edu.discipline || 'Education'}
										</p>
										<p className="mt-1 text-sm leading-relaxed text-gray-600">
											{[edu.school, edu.location].filter(Boolean).join(' · ') || '—'}
										</p>
									</SelectTile>
								))}
							</SectionChrome>

							<SectionChrome
								title="Experience"
								subtitle="Roles & Impact"
								countLabel={`${selectedExpIds.size} of ${experiences.length} selected`}
								canSelectBulk={experiences.length > 0}
								onSelectAll={selectAllExp}
								onDeselectAll={deselectAllExp}
								hasItems={experiences.length > 0}
								emptyChildren="Nothing here yet — add roles under Info."
							>
								{experiences.map((exp) => (
									<SelectTile key={exp.id} id={exp.id} selected={selectedExpIds.has(exp.id)} onToggle={toggleExp}>
										<p className="font-semibold text-gray-900">
											{exp.title}
											<span className="font-medium text-gray-600">{' · '}{exp.company}</span>
										</p>
										<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{exp.description || 'No description saved.'}</p>
									</SelectTile>
								))}
							</SectionChrome>

							<SectionChrome
								title="Projects"
								subtitle="Highlights"
								countLabel={`${selectedProjIds.size} of ${projects.length} selected`}
								canSelectBulk={projects.length > 0}
								onSelectAll={selectAllProj}
								onDeselectAll={deselectAllProj}
								hasItems={projects.length > 0}
								emptyChildren="Nothing here yet — add projects under Info."
							>
								{projects.map((proj) => (
									<SelectTile key={proj.id} id={proj.id} selected={selectedProjIds.has(proj.id)} onToggle={toggleProj}>
										<p className="font-semibold text-gray-900">{proj.title}</p>
										<p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">{proj.description || 'No description saved.'}</p>
									</SelectTile>
								))}
							</SectionChrome>

							<div className="sticky bottom-0 z-10 -mx-5 flex justify-center border-t border-gray-200/60 bg-gradient-to-t from-cream via-cream/95 to-transparent px-5 pb-6 pt-5 sm:-mx-8">
								<button
									type="button"
									onClick={handleContinue}
									className="inline-flex items-center gap-2 rounded-full border border-brand-pink/30 bg-brand-pink px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(214,86,86,0.55)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-safe:active:scale-[0.99]"
								>
									Continue to editor
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	)

	return shell
}

export default ResumeChoose
