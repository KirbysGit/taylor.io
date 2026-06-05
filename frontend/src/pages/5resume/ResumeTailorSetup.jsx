import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowLeft,
	faArrowRight,
	faBriefcase,
	faFileLines,
	faLightbulb,
	faShieldHalved,
	faTrash,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import DashboardShell from '@/components/DashboardShell'
import ThemedSelect from '@/components/inputs/ThemedSelect'
import { RequiredAsterisk, XIcon } from '@/components/icons'
import { logoutUser } from '@/api/services/auth'

const TAILOR_FOCUS_OPTIONS = [
	{ value: 'balanced', label: 'Balanced fit' },
	{ value: 'impact', label: 'Measured impact' },
	{ value: 'technical', label: 'Technical depth' },
	{ value: 'leadership', label: 'Leadership' },
]

const TAILOR_TONE_OPTIONS = [
	{ value: 'balanced', label: 'Balanced' },
	{ value: 'concise', label: 'Concise' },
	{ value: 'detailed', label: 'Detailed' },
]

const TAILOR_LENGTH_OPTIONS = [
	{ value: 'balanced', label: 'Balanced length' },
	{ value: 'one_page', label: 'Aim for one page' },
	{ value: 'detailed', label: 'Allow more detail' },
]

const TAILOR_REWRITE_OPTIONS = [
	{ value: 'balanced', label: 'Balanced rewrite' },
	{ value: 'light', label: 'Light touch' },
	{ value: 'strong', label: 'Strong retarget' },
]

const TAILOR_HISTORY_KEY = 'tailorIntentHistory'
const TAILOR_DRAFT_KEY = 'tailorSetupDraft'
const TAILOR_HISTORY_MAX = 50

/** Bounds for tailor intent — keeps API payloads useful and within input maxLength. */
const TAILOR_FIELD_LIMITS = {
	jobTitle: { min: 2, max: 180 },
	company: { min: 2, max: 180 },
	jobDescription: { min: 40, max: 24000 },
}

const TAILOR_TIPS = [
	'If you give us more context, we can help you tailor your profile much better.',
	'Whenever you can, paste the full job description — not just the title. That extra detail really helps!',
	'Use the job title and company exactly as they appear on the listing.',
	'Requirements, responsibilities, and nice-to-haves all help us match your experience.',
]

const TAILOR_TIP_ROTATE_MS = 5500

const DEFAULT_TAILOR_INTENT = {
	jobTitle: '',
	company: '',
	jobDescription: '',
	focus: 'balanced',
	tone: 'balanced',
	lengthTarget: 'balanced',
	rewriteFreedom: 'balanced',
	customInstructions: '',
	strictTruth: true,
}

function normalizeTailorDraft(value) {
	if (!value || typeof value !== 'object') return null
	return {
		jobTitle: typeof value.jobTitle === 'string' ? value.jobTitle : '',
		company: typeof value.company === 'string' ? value.company : '',
		jobDescription: typeof value.jobDescription === 'string' ? value.jobDescription : '',
		focus: TAILOR_FOCUS_OPTIONS.some((o) => o.value === value.focus) ? value.focus : 'balanced',
		tone: TAILOR_TONE_OPTIONS.some((o) => o.value === value.tone) ? value.tone : 'balanced',
		lengthTarget: TAILOR_LENGTH_OPTIONS.some((o) => o.value === value.lengthTarget) ? value.lengthTarget : 'balanced',
		rewriteFreedom: TAILOR_REWRITE_OPTIONS.some((o) => o.value === value.rewriteFreedom)
			? value.rewriteFreedom
			: 'balanced',
		customInstructions: typeof value.customInstructions === 'string' ? value.customInstructions : '',
		strictTruth: value.strictTruth !== false,
	}
}

function loadTailorDraft() {
	try {
		const raw = localStorage.getItem(TAILOR_DRAFT_KEY)
		if (!raw) return null
		return normalizeTailorDraft(JSON.parse(raw))
	} catch {
		return null
	}
}

function saveTailorDraft(entry) {
	const draft = normalizeTailorDraft(entry)
	if (!draft) return
	localStorage.setItem(
		TAILOR_DRAFT_KEY,
		JSON.stringify({
			...draft,
			savedAt: new Date().toISOString(),
		})
	)
}

function validateTailorForm({ jobTitle, company, jobDescription }) {
	const errors = {}
	const title = jobTitle.trim()
	const co = company.trim()
	const jd = jobDescription.trim()
	const { jobTitle: titleLimits, company: companyLimits, jobDescription: jdLimits } = TAILOR_FIELD_LIMITS

	if (!title) {
		errors.jobTitle = 'Job title is required.'
	} else if (title.length < titleLimits.min) {
		errors.jobTitle = `Job title must be at least ${titleLimits.min} characters.`
	} else if (title.length > titleLimits.max) {
		errors.jobTitle = `Job title must be ${titleLimits.max} characters or fewer.`
	}

	if (!co) {
		errors.company = 'Company is required.'
	} else if (co.length < companyLimits.min) {
		errors.company = `Company must be at least ${companyLimits.min} characters.`
	} else if (co.length > companyLimits.max) {
		errors.company = `Company must be ${companyLimits.max} characters or fewer.`
	}

	const wordCount = jd.split(/\s+/).filter(Boolean).length
	if (!jd) {
		errors.jobDescription = 'Job description is required.'
	} else if (wordCount < 20) {
		errors.jobDescription = `Paste the full job description — we need at least 20 words to tailor properly (you have ${wordCount}).`
	} else if (jd.length > jdLimits.max) {
		errors.jobDescription = `Job description must be ${jdLimits.max} characters or fewer.`
	}

	return errors
}

function fieldErrorClass(hasError) {
	return hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''
}

function fingerprintTailorIntent(i) {
	return JSON.stringify({
		jobTitle: (i.jobTitle || '').trim(),
		company: (i.company || '').trim(),
		jobDescription: (i.jobDescription || '').trim(),
		focus: i.focus,
		tone: i.tone,
		lengthTarget: i.lengthTarget,
		rewriteFreedom: i.rewriteFreedom,
		customInstructions: (i.customInstructions || '').trim(),
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
			lengthTarget: entry.lengthTarget,
			rewriteFreedom: entry.rewriteFreedom,
			customInstructions: entry.customInstructions,
			strictTruth: entry.strictTruth,
		},
		...filtered,
	].slice(0, TAILOR_HISTORY_MAX)
	localStorage.setItem(TAILOR_HISTORY_KEY, JSON.stringify(next))
	return next
}

function SetupCard({ className = '', children }) {
	return (
		<section
			className={[
				'rounded-[1.35rem] border border-brand-pink/24 bg-white',
				'shadow-[0_4px_14px_-4px_rgba(60,32,32,0.22),0_22px_52px_-24px_rgba(80,42,42,0.52)]',
				'ring-1 ring-gray-950/[0.06]',
				className,
			].join(' ')}
		>
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

/** Rotating hints — dismissible for this page visit only (reappears on reload); collapses so sidebar content slides up. */
function TailorTipCarousel() {
	const [index, setIndex] = useState(0)
	const [paused, setPaused] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	useEffect(() => {
		if (dismissed || paused || TAILOR_TIPS.length < 2) return undefined
		const id = window.setInterval(() => {
			setIndex((i) => (i + 1) % TAILOR_TIPS.length)
		}, TAILOR_TIP_ROTATE_MS)
		return () => window.clearInterval(id)
	}, [paused, dismissed])

	return (
		<div
			className={[
				'grid transition-[grid-template-rows,opacity,margin-bottom] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
				dismissed ? 'mb-0 grid-rows-[0fr] opacity-0' : 'mb-5 grid-rows-[1fr] opacity-100',
			].join(' ')}
		>
			<div
				className={['min-h-0 overflow-hidden', dismissed ? 'pointer-events-none' : ''].join(' ')}
				onMouseEnter={() => setPaused(true)}
				onMouseLeave={() => setPaused(false)}
				onFocusCapture={() => setPaused(true)}
				onBlurCapture={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
				}}
			>
				<div
					className="relative overflow-hidden rounded-2xl border border-brand-pink/28 bg-gradient-to-br from-brand-pink-lighter/75 via-white to-brand-pink/12 px-4 pb-4 pt-3.5 shadow-[0_12px_34px_-16px_rgba(214,86,86,0.38)] ring-1 ring-brand-pink/10"
					role="region"
					aria-roledescription="carousel"
					aria-label="Tailoring tips"
					aria-hidden={dismissed}
				>
					<div
						className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-brand-pink/20 blur-2xl"
						aria-hidden
					/>

					<button
						type="button"
						onClick={() => setDismissed(true)}
						className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						aria-label="Dismiss tips for now"
					>
						<XIcon className="size-4" />
					</button>

					<div className="relative flex flex-col items-center px-6 pt-1 text-center">
						<span
							className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white shadow-sm shadow-brand-pink/25 ring-1 ring-white/60"
							aria-hidden
						>
							<FontAwesomeIcon icon={faLightbulb} className="size-4" />
						</span>
						<p className="mt-2.5 text-xs font-bold text-brand-pink-dark">Quick tip</p>
						<div
							className="mt-2 flex w-full min-h-[3.5rem] items-center justify-center overflow-hidden"
							aria-live="polite"
						>
								<div
									className="flex w-full motion-reduce:transition-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
									style={{ transform: `translateX(-${index * 100}%)` }}
								>
									{TAILOR_TIPS.map((tip, tipIndex) => (
										<p
											key={tip}
											className="flex w-full shrink-0 items-center justify-center px-1 text-sm leading-relaxed text-gray-700"
											aria-hidden={tipIndex !== index}
										>
											{tip}
										</p>
									))}
								</div>
							</div>
					</div>

					<div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Choose tip">
						{TAILOR_TIPS.map((tip, tipIndex) => (
							<button
								key={tip}
								type="button"
								role="tab"
								aria-selected={tipIndex === index}
								aria-label={`Tip ${tipIndex + 1} of ${TAILOR_TIPS.length}`}
								onClick={() => setIndex(tipIndex)}
								className={[
									'h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
									tipIndex === index ? 'w-5 bg-brand-pink' : 'w-1.5 bg-brand-pink/25 hover:bg-brand-pink/40',
								].join(' ')}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

function ResumeTailorSetup() {
	const navigate = useNavigate()
	const location = useLocation()
	const [initialDraft] = useState(
		() =>
			location.state?.fromPreview
				? normalizeTailorDraft(location.state?.tailorIntent) || loadTailorDraft() || DEFAULT_TAILOR_INTENT
				: DEFAULT_TAILOR_INTENT
	)
	const [jobTitle, setJobTitle] = useState(initialDraft.jobTitle)
	const [company, setCompany] = useState(initialDraft.company)
	const [jobDescription, setJobDescription] = useState(initialDraft.jobDescription)
	const [focus, setFocus] = useState(initialDraft.focus)
	const [tone, setTone] = useState(initialDraft.tone)
	const [lengthTarget, setLengthTarget] = useState(initialDraft.lengthTarget)
	const [rewriteFreedom, setRewriteFreedom] = useState(initialDraft.rewriteFreedom)
	const [customInstructions, setCustomInstructions] = useState(initialDraft.customInstructions)
	const [strictTruth, setStrictTruth] = useState(initialDraft.strictTruth)
	const [recentSetups, setRecentSetups] = useState(() => loadTailorHistory())
	const [fieldErrors, setFieldErrors] = useState({})

	useEffect(() => {
		const id = window.setTimeout(() => {
			saveTailorDraft({
				jobTitle,
				company,
				jobDescription,
				focus,
				tone,
				lengthTarget,
				rewriteFreedom,
				customInstructions,
				strictTruth,
			})
		}, 250)

		return () => window.clearTimeout(id)
	}, [jobTitle, company, jobDescription, focus, tone, lengthTarget, rewriteFreedom, customInstructions, strictTruth])

	const clearFieldError = (field) => {
		setFieldErrors((prev) => {
			if (!prev[field]) return prev
			const next = { ...prev }
			delete next[field]
			return next
		})
	}

	const handleLogout = async () => {
		await logoutUser()
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
		setLengthTarget(entry.lengthTarget || 'balanced')
		setRewriteFreedom(entry.rewriteFreedom || 'balanced')
		setCustomInstructions(entry.customInstructions || '')
		setStrictTruth(entry.strictTruth !== false)
		saveTailorDraft(entry)
		setFieldErrors({})
		toast.success('Loaded job setup')
	}

	const clearRecentSetups = () => {
		localStorage.removeItem(TAILOR_HISTORY_KEY)
		setRecentSetups([])
		toast.success('Cleared recent setups')
	}

	const handleContinue = (e) => {
		if (e && typeof e.preventDefault === 'function') e.preventDefault()

		const errors = validateTailorForm({ jobTitle, company, jobDescription })
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors)
			toast.error(Object.values(errors)[0])
			return false
		}
		setFieldErrors({})

		const tailorIntent = {
			jobTitle: jobTitle.trim(),
			company: company.trim(),
			jobDescription: jobDescription.trim(),
			focus,
			tone,
			lengthTarget,
			rewriteFreedom,
			customInstructions: customInstructions.trim(),
			strictTruth,
		}

		setRecentSetups(saveTailorHistoryEntry(tailorIntent))
		saveTailorDraft(tailorIntent)

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
				</header>

				<section className="relative mb-6 overflow-hidden rounded-[1.35rem] border border-brand-pink/28 bg-[#9f3a40] p-6 text-white shadow-[0_4px_14px_-4px_rgba(60,32,32,0.28),0_22px_52px_-24px_rgba(80,42,42,0.48)] ring-1 ring-[#9f3a40]/40">
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
						<div className="mb-5 border-b border-gray-100 pb-4">
							<h2 className="text-lg font-black tracking-tight text-gray-950">Role details</h2>
							<p className="mt-1 text-sm text-gray-600">
								From your saved profile — tailored to this posting, then you review in preview.
							</p>
						</div>

						<form onSubmit={handleContinue} noValidate>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="tailor-job-title" className="label">
									Job title <RequiredAsterisk />
								</label>
								<div className="relative">
									<input
										id="tailor-job-title"
										value={jobTitle}
										onChange={(e) => {
											setJobTitle(e.target.value)
											clearFieldError('jobTitle')
										}}
										className={`input pl-10 ${fieldErrorClass(Boolean(fieldErrors.jobTitle))}`}
										placeholder="e.g. Backend Software Engineer"
										maxLength={TAILOR_FIELD_LIMITS.jobTitle.max}
										required
										aria-invalid={fieldErrors.jobTitle ? 'true' : undefined}
										aria-describedby={fieldErrors.jobTitle ? 'tailor-job-title-error' : undefined}
									/>
									<FontAwesomeIcon icon={faBriefcase} className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
								</div>
								{fieldErrors.jobTitle ? (
									<p id="tailor-job-title-error" className="mt-1 text-xs font-medium text-red-600" role="alert">
										{fieldErrors.jobTitle}
									</p>
								) : null}
							</div>
							<div>
								<label htmlFor="tailor-company" className="label">
									Company <RequiredAsterisk />
								</label>
								<input
									id="tailor-company"
									value={company}
									onChange={(e) => {
										setCompany(e.target.value)
										clearFieldError('company')
									}}
									className={`input ${fieldErrorClass(Boolean(fieldErrors.company))}`}
									placeholder="e.g. Stripe"
									maxLength={TAILOR_FIELD_LIMITS.company.max}
									required
									aria-invalid={fieldErrors.company ? 'true' : undefined}
									aria-describedby={fieldErrors.company ? 'tailor-company-error' : undefined}
								/>
								{fieldErrors.company ? (
									<p id="tailor-company-error" className="mt-1 text-xs font-medium text-red-600" role="alert">
										{fieldErrors.company}
									</p>
								) : null}
							</div>
						</div>

						<div className="mt-5">
							<label htmlFor="tailor-jd" className="label">
								Job description <RequiredAsterisk />
							</label>
							<textarea
								id="tailor-jd"
								value={jobDescription}
								onChange={(e) => {
									setJobDescription(e.target.value)
									clearFieldError('jobDescription')
								}}
								className={`input min-h-[16rem] resize-y ${fieldErrorClass(Boolean(fieldErrors.jobDescription))}`}
								placeholder="Paste the full role description, required skills, and responsibilities..."
								maxLength={TAILOR_FIELD_LIMITS.jobDescription.max}
								required
								aria-invalid={fieldErrors.jobDescription ? 'true' : undefined}
								aria-describedby={
									fieldErrors.jobDescription ? 'tailor-jd-error tailor-jd-hint' : 'tailor-jd-hint'
								}
							/>
							<p
								id="tailor-jd-hint"
								className={`mt-1 text-xs ${
									fieldErrors.jobDescription
										? 'font-medium text-red-600'
										: jobDescription.trim().length < TAILOR_FIELD_LIMITS.jobDescription.min
											? 'text-amber-700'
											: 'text-gray-500'
								}`}
							>
								{jobDescription.trim().split(/\s+/).filter(Boolean).length} words
								{jobDescription.trim().split(/\s+/).filter(Boolean).length < 20
									? ' · minimum 20 words'
									: ''}
							</p>
							{fieldErrors.jobDescription ? (
								<p id="tailor-jd-error" className="mt-0.5 text-xs font-medium text-red-600" role="alert">
									{fieldErrors.jobDescription}
								</p>
							) : null}
						</div>

						<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="tailor-focus" className="label">What should we emphasize?</label>
								<ThemedSelect
									id="tailor-focus"
									value={focus}
									onChange={setFocus}
									options={TAILOR_FOCUS_OPTIONS}
								/>
							</div>
							<div>
								<label htmlFor="tailor-tone" className="label">Writing tone</label>
								<ThemedSelect
									id="tailor-tone"
									value={tone}
									onChange={setTone}
									options={TAILOR_TONE_OPTIONS}
								/>
							</div>
						</div>

						<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label htmlFor="tailor-length-target" className="label">Length target</label>
								<ThemedSelect
									id="tailor-length-target"
									value={lengthTarget}
									onChange={setLengthTarget}
									options={TAILOR_LENGTH_OPTIONS}
								/>
								<p className="mt-1 text-xs leading-relaxed text-gray-500">
									One-page mode guides tighter writing, but final fit still depends on template and content.
								</p>
							</div>
							<div>
								<label htmlFor="tailor-rewrite-freedom" className="label">Rewrite strength</label>
								<ThemedSelect
									id="tailor-rewrite-freedom"
									value={rewriteFreedom}
									onChange={setRewriteFreedom}
									options={TAILOR_REWRITE_OPTIONS}
								/>
								<p className="mt-1 text-xs leading-relaxed text-gray-500">
									Strong retargets can reorder and re-lead bullets while staying grounded in your profile.
								</p>
							</div>
						</div>

						<div className="mt-5">
							<label htmlFor="tailor-custom-instructions" className="label">Optional notes for Taylor</label>
							<textarea
								id="tailor-custom-instructions"
								value={customInstructions}
								onChange={(e) => setCustomInstructions(e.target.value)}
								className="input min-h-[7rem] resize-y"
								placeholder="Example: Emphasize backend APIs and data pipelines. Keep the tone direct and avoid overselling."
								maxLength={420}
							/>
							<p className="mt-1 text-xs leading-relaxed text-gray-500">
								{customInstructions.trim().length} / 420 characters. These notes guide emphasis, but Taylor still follows your saved facts.
							</p>
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
								type="submit"
								className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-6 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.8)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Continue to tailored preview
								<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
							</button>
						</div>
						</form>
					</SetupCard>

					<aside className="flex flex-col">
						<TailorTipCarousel />
						<div className="flex flex-col gap-5">
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
													className="w-full rounded-2xl border border-gray-200/90 bg-white px-3 py-3 text-left text-sm shadow-[0_6px_18px_-14px_rgba(60,32,32,0.35)] transition hover:border-brand-pink/30 hover:bg-brand-pink/[0.04] hover:shadow-[0_10px_24px_-16px_rgba(214,86,86,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
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
						</div>
					</aside>
				</div>
			</div>
		</DashboardShell>
	)
}

export default ResumeTailorSetup
