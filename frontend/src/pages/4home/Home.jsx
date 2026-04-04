// pages/4home/Home.jsx — dashboard after login (cream, white cards, brand-pink accents)

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopNav from '@/components/TopNav'
import { listSavedResumes, deleteSavedResume } from '@/api/services/profile'

function ActionCard({
	onClick,
	title,
	description,
	icon,
	primary = false,
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				'group relative flex h-full w-full flex-col items-center rounded-xl bg-white-bright p-6 text-center transition-all duration-200 sm:p-7',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
				primary
					? 'border-2 border-brand-pink/55 shadow-[0_14px_36px_-14px_rgba(214,86,86,0.35)] hover:border-brand-pink hover:shadow-[0_18px_40px_-14px_rgba(214,86,86,0.4)]'
					: 'border border-gray-200 shadow-md hover:border-brand-pink/35 hover:shadow-lg',
			].join(' ')}
		>
			{primary && (
				<span className="absolute right-4 top-4 rounded-full bg-brand-pink px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
					Primary
				</span>
			)}
			<div
				className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors ${primary ? 'bg-brand-pink/15 group-hover:bg-brand-pink/25' : 'bg-brand-pink/10 group-hover:bg-brand-pink/20'}`}
			>
				{icon}
			</div>
			<h3 className={`mb-2 text-xl text-gray-900 ${primary ? 'font-bold' : 'font-semibold'}`}>{title}</h3>
			<p className="text-sm leading-relaxed text-gray-600">{description}</p>
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

	return (
		<div
			className="info-scrollbar flex min-h-screen flex-col overflow-y-auto bg-cream"
			style={{ height: '100vh' }}
		>
			<TopNav user={user} onLogout={handleLogout} />

			<main className="flex-1 bg-cream py-5 md:py-7">
				<div className="mx-auto max-w-6xl space-y-6 px-5 sm:space-y-7 sm:px-8">
					<section>
						<div className="rounded-2xl border border-gray-200 bg-white-bright p-6 shadow-md sm:p-8">
							{isLoading ? (
								<div className="space-y-6">
									<div className="mx-auto max-w-md space-y-2 text-center">
										<div className="mx-auto h-9 max-w-xs animate-pulse rounded-lg bg-gray-200/80" />
										<div className="mx-auto h-5 max-w-sm animate-pulse rounded-lg bg-gray-200/60" />
									</div>
									<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
										<div className="h-36 animate-pulse rounded-xl bg-gray-100 md:h-40" />
										<div className="h-36 animate-pulse rounded-xl bg-gray-100 md:h-40" />
										<div className="h-36 animate-pulse rounded-xl bg-gray-100 md:h-40" />
									</div>
								</div>
							) : (
								<>
									<div className="text-center">
										<h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
											{greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
										</h1>
										<p className="mt-2 text-base text-gray-600 sm:text-lg">
											Choose your next step — update your profile, preview, or switch templates.
										</p>
									</div>

									<div className="mt-6 border-t border-gray-100 pt-6">
										<p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
											Quick actions
										</p>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
							<ActionCard
								onClick={() => navigate('/info')}
								title="Update info"
								description="Edit contact, education, experience, and other profile details."
								icon={
									<svg className="h-8 w-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								}
							/>
							<ActionCard
								onClick={handleGenerateResume}
								primary
								title="Generate preview"
								description="Pick a template, tune your layout, and preview before export."
								icon={
									<svg className="h-8 w-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								}
							/>
							<ActionCard
								onClick={() => navigate('/templates')}
								title="Templates"
								description="Browse layouts and find a style that fits your story."
								icon={
									<svg className="h-8 w-8 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
									</svg>
								}
							/>
										</div>
									</div>

									<div className="mt-6 flex flex-col gap-2 rounded-xl border border-brand-pink/20 bg-gradient-to-br from-brand-pink/[0.07] to-cream/80 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
										<p className="text-xs font-semibold uppercase tracking-wide text-brand-pink">Tip</p>
										<p className="text-sm leading-snug text-gray-700">
											<strong className="font-semibold text-gray-800">Profile first:</strong>{' '}
											Refresh your info page before generating — exports pull directly from what you save there.
										</p>
									</div>
								</>
							)}
						</div>
					</section>

					<section>
						<div className="rounded-2xl border border-gray-200 bg-white-bright p-6 shadow-md sm:p-8">
							<div className="mb-5 flex flex-col gap-1 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Saved resumes</h2>
									<p className="mt-1 text-sm text-gray-500">
										{savedResumes.items.length} of {savedResumes.max} slots used
									</p>
								</div>
							</div>

							{savedResumes.items.length === 0 ? (
								<div className="rounded-lg border border-dashed border-gray-200 bg-cream/50 px-6 py-10 text-center sm:py-12">
									<svg className="mx-auto mb-4 h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									<p className="text-sm font-medium text-gray-600">No saved previews yet</p>
									<p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
										Save from the resume editor to open them here anytime.
									</p>
								</div>
							) : (
								<ul className="space-y-3">
									{savedResumes.items.map((resume) => (
										<li
											key={resume.id}
											className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/40 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4"
										>
											<div className="min-w-0 flex items-start gap-3">
												<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/80">
													<svg className="h-5 w-5 text-brand-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
													className="rounded-lg bg-brand-pink px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
												>
													Load
												</button>
												<button
													type="button"
													onClick={(e) => handleDeleteSaved(resume.id, e)}
													className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
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
	)
}

export default Home
