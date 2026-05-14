import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowLeft,
	faArrowRight,
	faBriefcase,
	faClockRotateLeft,
	faFileLines,
	faShieldHalved,
	faTrash,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'

const TAILOR_HISTORY_KEY = 'tailorIntentHistory'
const TAILOR_HISTORY_MAX = 50

function fingerprintTailorIntent(i) {
	return JSON.stringify({
		jobTitle: (i.jobTitle || '').trim(),
		company: (i.company || '').trim(),
		jobDescription: (i.jobDescription || '').trim(),
		focus: i.focus,
		tone: i.tone,
		strictTruth: Boolean(i.strictTruth),
	})
}

function loadTailorHistory() {
	try {
		const raw = localStorage.getItem(TAILOR_HISTORY_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		const list = Array.isArray(parsed) ? parsed : []
		return list.slice(0, TAILOR_HISTORY_MAX)
	} catch {
		return []
	}
}

function saveTailorHistoryEntry(entry) {
	const prev = loadTailorHistory()
	const fp = fingerprintTailorIntent(entry)
	const filtered = prev.filter((h) => fingerprintTailorIntent(h) !== fp)
	const next = [
		{
			id:
				typeof crypto !== 'undefined' && crypto.randomUUID
					? crypto.randomUUID()
					: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			savedAt: new Date().toISOString(),
			jobTitle: entry.jobTitle,
			company: entry.company,
			jobDescription: entry.jobDescription,
			focus: entry.focus,
			tone: entry.tone,
			strictTruth: entry.strictTruth,
		},
		...filtered,
	].slice(0, TAILOR_HISTORY_MAX)
	localStorage.setItem(TAILOR_HISTORY_KEY, JSON.stringify(next))
	return next
}

function SetupCard({ className = '', children }) {
	return (
		<section className={`rounded-[1.35rem] border border-brand-pink/13 bg-white/78 shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)] ring-1 ring-white/80 backdrop-blur-md ${className}`}>
			{children}
		</section>
	)
}

function StepPill({ number, children }) {
	return (
		<div className="rounded-2xl bg-white/12 px-3 py-2 text-xs leading-relaxed text-white/90 ring-1 ring-white/20">
			<span className="font-black text-white">Step {number}:</span> {children}
		</div>
	)
}

function ResumeTailorSetup() {
	const navigate = useNavigate()
	const [jobTitle, setJobTitle] = useState('')
	const [company, setCompany] = useState('')
	const [jobDescription, setJobDescription] = useState('')
	const [focus, setFocus] = useState('balanced')
	const [tone, setTone] = useState('balanced')
	const [strictTruth, setStrictTruth] = useState(true)
	const [recentSetups, setRecentSetups] = useState(() => loadTailorHistory())

	const handleLogout = () => {
		localStorage.removeItem('token')
		localStorage.removeItem('user')
		navigate('/')
	}

	const applyRecentSetup = (id) => {
		if (!id) return
		const entry = recentSetups.find((h) => h.id === id)
		if (!entry) return
		setJobTitle(entry.jobTitle || '')
		setCompany(entry.company || '')
		setJobDescription(entry.jobDescription || '')
		setFocus(entry.focus || 'balanced')
		setTone(entry.tone || 'balanced')
		setStrictTruth(entry.strictTruth !== false)
		toast.success('Loaded job setup')
	}

	const clearRecentSetups = () => {
		localStorage.removeItem(TAILOR_HISTORY_KEY)
		setRecentSetups([])
		toast.success('Cleared recent setups')
	}

	const handleContinue = () => {
		if (!jobTitle.trim()) {
			toast.error('Please enter a job title')
			return
		}
		if (jobDescription.trim().length < 40) {
			toast.error('Please add more job description detail (40+ chars)')
			return
		}

		const tailorIntent = {
			jobTitle: jobTitle.trim(),
			company: company.trim(),
			jobDescription: jobDescription.trim(),
			focus,
			tone,
			strictTruth,
		}

		setRecentSetups(saveTailorHistoryEntry(tailorIntent))

		navigate('/resume/preview', {
			state: {
				createMode: 'tailor',
				tailorIntent,
			},
		})
	}

	return (
		<DashboardShell onLogout={handleLogout}>
			<div className="mx-auto max-w-7xl">
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
						<p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink-dark">Taylor.io Assist</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Set your tailoring goal</h1>
						<p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
							Tell us the role and job description. Taylor uses your saved profile to build a stronger targeted draft.
						</p>
					</div>
					<button
						type="button"
						onClick={handleContinue}
						className="inline-flex min-h-[3.15rem] items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
					>
						Continue to preview
						<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
					</button>
				</header>

				<section className="relative mb-6 overflow-hidden rounded-[1.35rem] border border-brand-pink/20 bg-[#9f3a40] p-6 text-white shadow-[0_18px_48px_-34px_rgba(80,42,42,0.42)]">
					<div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
					<div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:items-end">
						<div>
							<p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white ring-1 ring-white/18">
								<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" />
								Role-aware tailoring
							</p>
							<h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">From profile data to role fit</h2>
							<p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/82">
								We select and prioritize your strongest matching content, then generate a tailored draft for review in preview.
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
							<StepPill number="1">Understand the role requirements.</StepPill>
							<StepPill number="2">Prioritize your matching content.</StepPill>
							<StepPill number="3">Generate a draft for review.</StepPill>
						</div>
					</div>
				</section>

				<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
					<SetupCard className="p-5 sm:p-6">
						<div className="mb-5 rounded-2xl border border-brand-pink/16 bg-brand-pink/[0.06] px-4 py-3 text-sm leading-relaxed text-gray-700">
							<span className="font-black text-brand-pink-dark">Goal:</span> increase fit while staying grounded in your real background.
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="tailor-job-title" className="label">Job title</label>
								<div className="relative">
									<input
										id="tailor-job-title"
										value={jobTitle}
										onChange={(e) => setJobTitle(e.target.value)}
										className="input pl-10"
										placeholder="e.g. Backend Software Engineer"
										maxLength={180}
									/>
									<FontAwesomeIcon icon={faBriefcase} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
								</div>
							</div>
							<div>
								<label htmlFor="tailor-company" className="label">Company (optional)</label>
								<input
									id="tailor-company"
									value={company}
									onChange={(e) => setCompany(e.target.value)}
									className="input"
									placeholder="e.g. Stripe"
									maxLength={180}
								/>
							</div>
						</div>

						<div className="mt-5">
							<label htmlFor="tailor-jd" className="label">Job description</label>
							<textarea
								id="tailor-jd"
								value={jobDescription}
								onChange={(e) => setJobDescription(e.target.value)}
								className="input min-h-[16rem] resize-y"
								placeholder="Paste the full role description, required skills, and responsibilities..."
								maxLength={24000}
							/>
							<p className="mt-1 text-xs text-gray-500">{jobDescription.trim().length} / 24000 characters</p>
						</div>

						<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="tailor-focus" className="label">What should we emphasize?</label>
								<select
									id="tailor-focus"
									value={focus}
									onChange={(e) => setFocus(e.target.value)}
									className="input"
								>
									<option value="balanced">Balanced fit</option>
									<option value="impact">Measured impact</option>
									<option value="technical">Technical depth</option>
									<option value="leadership">Leadership</option>
								</select>
							</div>
							<div>
								<label htmlFor="tailor-tone" className="label">Writing tone</label>
								<select
									id="tailor-tone"
									value={tone}
									onChange={(e) => setTone(e.target.value)}
									className="input"
								>
									<option value="balanced">Balanced</option>
									<option value="concise">Concise</option>
									<option value="detailed">Detailed</option>
								</select>
							</div>
						</div>

						<label className="mt-5 flex cursor-pointer select-none items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-gray-700">
							<input
								type="checkbox"
								checked={strictTruth}
								onChange={(e) => setStrictTruth(e.target.checked)}
								className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
							/>
							<span>
								<span className="font-black text-gray-900">Strict truth mode</span>
								<span className="block text-gray-600">Do not invent facts, companies, titles, dates, or achievements.</span>
							</span>
						</label>

						<div className="mt-7 flex justify-end">
							<button
								type="button"
								onClick={handleContinue}
								className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-6 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Continue to tailored preview
								<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
							</button>
						</div>
					</SetupCard>

					<aside className="space-y-6 xl:sticky xl:top-6">
						<SetupCard className="p-6">
							<div className="flex items-start gap-3">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark">
									<FontAwesomeIcon icon={faFileLines} className="size-4" />
								</span>
								<div>
									<h2 className="font-black text-gray-950">Recent job setups</h2>
									<p className="mt-1 text-sm leading-relaxed text-gray-600">Saved locally when you continue to preview.</p>
								</div>
							</div>

							{recentSetups.length === 0 ? (
								<div className="mt-5 rounded-2xl border border-dashed border-brand-pink/22 bg-brand-pink/[0.035] px-4 py-5 text-sm text-gray-600">
									No recent setups yet.
								</div>
							) : (
								<ul className="info-scrollbar mt-5 max-h-[min(24rem,48vh)] space-y-2 overflow-y-auto pr-1" aria-label="Recent job setups">
									{recentSetups.map((h) => {
										const when = h.savedAt
											? new Date(h.savedAt).toLocaleString(undefined, {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})
											: ''
										return (
											<li key={h.id}>
												<button
													type="button"
													onClick={() => applyRecentSetup(h.id)}
													className="w-full rounded-2xl border border-gray-200/70 bg-white/78 px-3 py-3 text-left text-sm transition hover:border-brand-pink/24 hover:bg-brand-pink/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
												>
													<span className="block font-black leading-snug text-gray-950">{h.jobTitle || 'Untitled role'}</span>
													<span className="mt-1 block truncate text-xs text-gray-500">{[h.company || null, when].filter(Boolean).join(' · ') || 'Saved setup'}</span>
												</button>
											</li>
										)
									})}
								</ul>
							)}

							{recentSetups.length > 0 ? (
								<button
									type="button"
									onClick={clearRecentSetups}
									className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-red-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
								>
									<FontAwesomeIcon icon={faTrash} className="size-3.5" />
									Clear history
								</button>
							) : null}
						</SetupCard>

						<SetupCard className="p-6">
							<div className="flex items-start gap-3">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
									<FontAwesomeIcon icon={faShieldHalved} className="size-4" />
								</span>
								<div>
									<p className="font-black text-gray-950">Grounded in your profile</p>
									<p className="mt-1 text-sm leading-relaxed text-gray-600">
										Taylor works from your saved experience, projects, education, and skills. You review the draft before export.
									</p>
								</div>
							</div>
						</SetupCard>

						<SetupCard className="bg-brand-pink/[0.08] p-6">
							<p className="flex items-center gap-2 text-sm font-black text-brand-pink-dark">
								<FontAwesomeIcon icon={faClockRotateLeft} className="size-4" />
								Best results
							</p>
							<p className="mt-3 text-sm leading-relaxed text-gray-700">
								Paste the full posting, not just the title. Requirements, responsibilities, and nice-to-haves all help.
							</p>
						</SetupCard>
					</aside>
				</div>
			</div>
		</DashboardShell>
	)
}

export default ResumeTailorSetup
