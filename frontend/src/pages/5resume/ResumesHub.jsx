import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faClockRotateLeft,
	faFileAlt,
	faPenToSquare,
	faPlus,
	faTrash,
	faUser,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import { deleteSavedResume, listSavedResumes } from '@/api/services/profile'

function ResumeCard({ resume, index, onOpen, onDelete }) {
	const statuses = [
		{ label: 'Draft', className: 'bg-amber-100 text-amber-800' },
		{ label: 'Ready', className: 'bg-emerald-100 text-emerald-800' },
		{ label: 'Saved', className: 'bg-violet-100 text-violet-800' },
	]
	const tones = ['bg-brand-pink', 'bg-sky-500', 'bg-emerald-500', 'bg-violet-500']
	const status = statuses[index % statuses.length]
	const tone = tones[index % tones.length]

	const formatDate = (dateStr) => {
		if (!dateStr) return 'Recently'
		try {
			return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
		} catch {
			return 'Recently'
		}
	}

	return (
		<article className="rounded-[1.35rem] border border-brand-pink/13 bg-white/82 p-4 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-brand-pink/26">
			<div className="h-36 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-inner">
				<div className="flex h-full gap-3">
					<div className={`${tone}/10 flex w-10 shrink-0 flex-col items-center gap-2 rounded-xl pt-3`}>
						<span className={`size-4 rounded-full ${tone}`} />
						<span className={`h-2 w-5 rounded-full ${tone}/70`} />
						<span className={`h-2 w-4 rounded-full ${tone}/50`} />
					</div>
					<div className="min-w-0 flex-1 pt-2">
						<span className={`block h-2.5 w-20 rounded-full ${tone}`} />
						<span className="mt-3 block h-2 w-28 rounded-full bg-gray-300/70" />
						<span className="mt-2 block h-2 w-24 rounded-full bg-gray-300/55" />
						<div className="mt-5 space-y-2">
							<span className="block h-1.5 w-full rounded-full bg-gray-300/65" />
							<span className="block h-1.5 w-[86%] rounded-full bg-gray-300/55" />
							<span className="block h-1.5 w-[68%] rounded-full bg-gray-300/45" />
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4">
				<h2 className="line-clamp-2 min-h-[2.6rem] font-black leading-snug text-gray-950">{resume.name || `Resume ${index + 1}`}</h2>
				<div className="mt-3 flex items-center justify-between gap-2">
					<span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
					<span className="text-xs text-gray-500">{formatDate(resume.created_at)}</span>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
				<button
					type="button"
					onClick={() => onOpen(resume.id)}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 transition hover:bg-brand-pink/[0.08] hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
				>
					<FontAwesomeIcon icon={faPenToSquare} className="size-3.5" />
					Open
				</button>
				<button
					type="button"
					onClick={() => onDelete(resume.id)}
					className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
				>
					<FontAwesomeIcon icon={faTrash} className="size-3.5" />
					Delete
				</button>
			</div>
		</article>
	)
}

export default function ResumesHub() {
	const navigate = useNavigate()
	const [savedResumes, setSavedResumes] = useState({ items: [], max: 3 })
	const [isLoading, setIsLoading] = useState(true)

	const handleLogout = useCallback(() => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}, [navigate])

	const fetchSavedResumes = useCallback(async () => {
		try {
			const res = await listSavedResumes()
			const data = res.data || res
			setSavedResumes({ items: data.items || [], max: data.max ?? 3 })
		} catch {
			setSavedResumes({ items: [], max: 3 })
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		const token = localStorage.getItem('token')
		const userData = localStorage.getItem('user')
		if (!token || !userData) {
			navigate('/auth')
			return
		}
		fetchSavedResumes()
	}, [fetchSavedResumes, navigate])

	const handleOpen = (id) => {
		navigate('/resume/preview', { state: { loadSavedId: id } })
	}

	const handleDelete = async (id) => {
		try {
			await deleteSavedResume(id)
			await fetchSavedResumes()
			toast.success('Saved resume deleted')
		} catch {
			toast.error('Failed to delete')
		}
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
				<header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Resumes</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Your resume workspace</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Start a new version, reopen saved drafts, or continue shaping a resume for a specific role.
						</p>
					</div>
					<button
						type="button"
						onClick={() => navigate('/resume/create')}
						className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						<FontAwesomeIcon icon={faPlus} className="size-4" />
						Create new resume
					</button>
				</header>

				<section className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
					<div className="relative overflow-hidden rounded-[1.35rem] border border-brand-pink/13 bg-brand-pink/[0.08] p-6 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80">
						<div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-brand-pink/[0.1] blur-2xl" aria-hidden />
						<p className="inline-flex items-center gap-2 rounded-full bg-white/82 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-brand-pink-dark shadow-sm ring-1 ring-brand-pink/12">
							<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" />
							Start here
						</p>
						<h2 className="relative mt-4 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Create a new resume</h2>
						<p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
							Choose your build method first. Taylor can tailor from a role, pull from your saved profile, or open a blank canvas.
						</p>
						<button
							type="button"
							onClick={() => navigate('/resume/create')}
							className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						>
							Choose build method
							<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
						</button>
					</div>

					<div className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 p-6 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80">
						<div className="flex items-start gap-3">
							<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark">
								<FontAwesomeIcon icon={faClockRotateLeft} className="size-4" />
							</span>
							<div>
								<p className="font-black text-gray-950">Saved versions</p>
								<p className="mt-1 text-sm leading-relaxed text-gray-600">
									{isLoading ? 'Checking saved resumes...' : `${savedResumes.items.length} of ${savedResumes.max} slots used`}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section>
					<div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="text-xl font-black tracking-tight text-gray-950">Saved resume versions</h2>
							<p className="mt-1 text-sm text-gray-600">Open a version you saved from the editor.</p>
						</div>
					</div>

					{isLoading ? (
						<div className="rounded-[1.35rem] border border-brand-pink/13 bg-white/78 p-6 text-gray-600 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)]">
							<span className="mr-3 inline-block size-3 animate-pulse rounded-full bg-brand-pink/50" aria-hidden />
							Loading resumes...
						</div>
					) : savedResumes.items.length === 0 ? (
						<div className="rounded-[1.35rem] border border-dashed border-brand-pink/24 bg-white/70 px-6 py-12 text-center">
							<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-pink/[0.08] text-brand-pink-dark">
								<FontAwesomeIcon icon={faFileAlt} className="size-5" />
							</div>
							<p className="font-black text-gray-950">No saved versions yet</p>
							<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
								Create a resume and save it from the editor to reopen it here.
							</p>
						</div>
					) : (
						<ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
							{savedResumes.items.map((resume, index) => (
								<li key={resume.id}>
									<ResumeCard resume={resume} index={index} onOpen={handleOpen} onDelete={handleDelete} />
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</DashboardShell>
	)
}
