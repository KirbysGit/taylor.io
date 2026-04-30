// pages/4home/Home.jsx — dashboard: atmosphere full width; welcome + floating quick cards + saved resumes as separate bands

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopNav from '@/components/TopNav'
import { listSavedResumes, deleteSavedResume } from '@/api/services/profile'

const quickCardAccents = {
	slate: {
		orbA: 'bg-slate-500/[0.14]',
		orbB: 'bg-sky-400/[0.1]',
		topWash: 'from-slate-500/[0.14]',
		iconSurface:
			'bg-slate-500/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] ring-1 ring-slate-400/20',
	},
	pink: {
		orbA: 'bg-brand-pink/[0.2]',
		orbB: 'bg-rose-300/[0.12]',
		topWash: 'from-brand-pink/[0.2]',
		iconSurface:
			'bg-brand-pink/[0.22] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] ring-1 ring-brand-pink/30',
	},
	violet: {
		orbA: 'bg-violet-500/[0.14]',
		orbB: 'bg-fuchsia-400/[0.09]',
		topWash: 'from-violet-500/[0.13]',
		iconSurface:
			'bg-violet-500/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] ring-1 ring-violet-400/25',
	},
}

/** Distinct tinted washes per action so tiles feel crafted, not three copies of one style */
function QuickActionCard({
	onClick,
	title,
	description,
	icon,
	accent = 'pink',
	primary = false,
}) {
	const tone = primary ? quickCardAccents.pink : quickCardAccents[accent] || quickCardAccents.pink

	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white/45 px-5 py-8 text-center shadow-[0_14px_44px_-20px_rgba(45,30,38,0.22)] backdrop-blur-md ring-1 ring-white/80',
				'transition-[background-color,transform,box-shadow,border-color] duration-300 motion-reduce:transition-none',
				'hover:bg-white/[0.62] hover:shadow-[0_20px_50px_-18px_rgba(214,86,86,0.22)] hover:ring-white',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
				primary
					? 'shadow-[0_14px_48px_-16px_rgba(214,86,86,0.28)] ring-2 ring-brand-pink/[0.28] hover:ring-brand-pink/45'
					: 'hover:border-brand-pink/28',
				'motion-safe:active:scale-[0.99]',
				'motion-reduce:active:scale-100',
			].join(' ')}
		>
			<span
				className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${tone.topWash} to-transparent opacity-90`}
				aria-hidden
			/>
			{/* Highlights the curved top edge so tiles stay visually distinct */}
			<span
				className="pointer-events-none absolute inset-x-4 top-[1px] h-px bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-75"
				aria-hidden
			/>
			<span
				className={`pointer-events-none absolute -right-10 top-[-2.75rem] h-[11rem] w-[11rem] rounded-full blur-3xl ${tone.orbA} motion-reduce:hidden`}
				aria-hidden
			/>
			<span
				className={`pointer-events-none absolute -bottom-10 -left-8 h-[7.5rem] w-[7.5rem] rounded-full blur-2xl ${tone.orbB} opacity-95 motion-reduce:hidden`}
				aria-hidden
			/>

			<span className="relative z-[1] flex h-full flex-col items-center">
				{primary ? (
					<span className="mb-4 inline-flex rounded-full bg-brand-pink px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_6px_16px_-6px_rgba(214,86,86,0.65)]">
						Start here
					</span>
				) : (
					<span className="mb-4 inline-flex h-[1.375rem] items-center opacity-0" aria-hidden />
				)}
				<div
					className={`-rotate-2 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-[transform] duration-300 [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none motion-safe:group-hover:scale-[1.06] motion-safe:group-hover:rotate-0 motion-reduce:group-hover:rotate-[-2deg] ${tone.iconSurface}`}
				>
					{icon}
				</div>
				<h3
					className={`mb-2 text-lg tracking-tight text-gray-900 sm:text-xl ${primary ? 'font-bold' : 'font-semibold'}`}
				>
					{title}
				</h3>
				<p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-gray-600 [text-wrap:pretty]">{description}</p>
			</span>
		</button>
	)
}

function Home() {
	const navigate = useNavigate()
	const [user, setUser] = useState(null)
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
		const fetchProfile = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')

			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				setUser(JSON.parse(userData))
			} catch {
				navigate('/auth')
				return
			} finally {
				setIsLoading(false)
			}
		}

		fetchProfile()
	}, [navigate])

	useEffect(() => {
		if (user) fetchSavedResumes()
	}, [user, fetchSavedResumes])

	const handleGenerateResume = () => {
		navigate('/resume/create')
	}

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	const handleLoadSaved = (id) => {
		navigate('/resume/preview', { state: { loadSavedId: id } })
	}

	const handleDeleteSaved = async (id, e) => {
		e?.stopPropagation()
		try {
			await deleteSavedResume(id)
			fetchSavedResumes()
			toast.success('Saved resume deleted')
		} catch {
			toast.error('Failed to delete')
		}
	}

	const formatDate = (dateStr) => {
		if (!dateStr) return ''
		try {
			const d = new Date(dateStr)
			return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
		} catch {
			return dateStr
		}
	}

	const greetingName = user?.first_name?.trim() || null
	const maxSlots = savedResumes.max
	const usedSlots = savedResumes.items.length
	const remainingSlots = Math.max(0, maxSlots - usedSlots)

	return (
		<div
			className="relative flex min-h-screen flex-col bg-cream info-scrollbar overflow-y-auto"
			style={{ height: '100vh' }}
		>
			{/* Full viewport — washes wide screens; content stays in max-w column below. Photo URL lives in CSS; drop asset at frontend/public/home-dashboard-bg.jpg */}
			<div className="home-page-atmosphere" aria-hidden="true">
				<div className="home-page-atmosphere__photo" />
				<div className="home-page-atmosphere__mesh" />
				<div className="home-page-atmosphere__orb home-page-atmosphere__orb--a" />
				<div className="home-page-atmosphere__orb home-page-atmosphere__orb--b" />
			</div>

			<div className="relative z-[1] flex min-h-0 flex-1 flex-col">
				<TopNav user={user} onLogout={handleLogout} />

				<main className="flex-1 pb-14 pt-8 sm:pb-20 md:pt-12">
					<div className="mx-auto max-w-6xl px-5 sm:px-8">
						<section className="relative">
							{isLoading ? (
								<div className="space-y-5 md:space-y-6">
										<div className="mx-auto max-w-lg space-y-3 text-center">
										<div className="mx-auto h-10 max-w-[18rem] animate-pulse rounded-xl bg-brand-pink/10" />
										<div className="mx-auto h-5 max-w-3xl animate-pulse rounded-lg bg-gray-300/35" />
									</div>
									<div className="mx-auto h-3 w-28 animate-pulse rounded bg-gray-300/30" aria-hidden />
									<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
										<div className="h-56 animate-pulse rounded-2xl border border-gray-200/40 bg-gray-200/35" />
										<div className="h-56 animate-pulse rounded-2xl border border-brand-pink/25 bg-brand-pink/[0.06]" />
										<div className="h-56 animate-pulse rounded-2xl border border-gray-200/40 bg-gray-200/35" />
									</div>
								</div>
							) : (
								<div className="space-y-5 md:space-y-6">
									<div className="text-center">
										<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.125rem]">
											{greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
										</h1>
										<p className="mx-auto mt-2 max-w-3xl px-2 py-2 text-[0.975rem] leading-relaxed text-gray-600 sm:text-lg">
											Choose what&apos;s next — update your profile, tailor a preview, or browse templates.
										</p>
									</div>

									<p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
										Quick actions
									</p>

									<div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:items-stretch">
										<QuickActionCard
											accent="slate"
											onClick={() => navigate('/info')}
											title="Update info"
											description="Edit contact, education, experience, and the rest of your saved profile."
											icon={
												<svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											}
										/>
										<QuickActionCard
											onClick={handleGenerateResume}
											primary
											title="Generate preview"
											description="Pick a path — from your profile data, Assist, or a fresh canvas — then preview before export."
											icon={
												<svg className="h-8 w-8 text-brand-pink-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
											}
										/>
										<QuickActionCard
											accent="violet"
											onClick={() => navigate('/templates')}
											title="Browse templates"
											description="Explore layout families and find a visual style that matches your goal."
											icon={
												<svg className="h-8 w-8 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
												</svg>
											}
										/>
									</div>
								</div>
							)}
						</section>

						<section className="relative mt-12 sm:mt-14">
							<div
								className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(120%,24rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-gray-400/35 to-transparent"
								aria-hidden="true"
							/>

							<div className="pt-10 sm:pt-12">
								<div className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-[1.65rem]">Saved resumes</h2>
										<p className="mt-1.5 text-sm text-gray-600">
											{usedSlots} of {maxSlots} slots used
											{remainingSlots > 0 ? (
												<>
													{' · '}
													<span className="text-gray-700">Room for {remainingSlots} more save{remainingSlots === 1 ? '' : 's'}.</span>
												</>
											) : null}
										</p>
									</div>
								</div>

								{savedResumes.items.length === 0 ? (
									<div className="rounded-3xl border border-dashed border-gray-300/60 bg-white/35 px-6 py-12 text-center shadow-inner backdrop-blur-[2px] sm:py-14">
										<svg className="mx-auto mb-5 h-14 w-14 text-brand-pink/35" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.35} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										<p className="text-base font-medium text-gray-800">No saved previews yet</p>
										<p className="mx-auto mt-2 max-w-md text-sm text-gray-600">Save from the resume editor to reopen them here — your slots stay yours.</p>
										<button
											type="button"
											onClick={handleGenerateResume}
											className="mt-7 inline-flex rounded-full border border-brand-pink/35 bg-brand-pink px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(214,86,86,0.55)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
										>
											Start a preview
										</button>
									</div>
								) : (
									<ul className="space-y-2.5">
										{savedResumes.items.map((resume, i) => (
											<li
												key={resume.id}
												className={`flex flex-col gap-3 rounded-2xl border border-gray-200/70 px-5 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
													i % 2 === 0 ? 'bg-white/55 backdrop-blur-[1px]' : 'bg-white/35 backdrop-blur-[1px]'
												}`}
											>
												<div className="flex min-w-0 items-start gap-3">
													<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink/15 to-brand-pink/[0.05] ring-1 ring-brand-pink/20">
														<svg className="h-5 w-5 text-brand-pink-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
														</svg>
													</div>
													<div className="min-w-0">
														<h3 className="truncate font-semibold text-gray-900">{resume.name}</h3>
														<p className="text-sm text-gray-500">Saved {formatDate(resume.created_at)}</p>
													</div>
												</div>
												<div className="flex shrink-0 items-center gap-2 sm:justify-end">
													<button
														type="button"
														onClick={() => handleLoadSaved(resume.id)}
														className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
													>
														Load
													</button>
													<button
														type="button"
														onClick={(e) => handleDeleteSaved(resume.id, e)}
														className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
													>
														Delete
													</button>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</section>
					</div>
				</main>
			</div>
		</div>
	)
}

export default Home
