import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopNav from '@/components/TopNav'

function ResumeTailorSetup() {
	const navigate = useNavigate()
	const [jobTitle, setJobTitle] = useState('')
	const [company, setCompany] = useState('')
	const [jobDescription, setJobDescription] = useState('')
	const [focus, setFocus] = useState('balanced')
	const [tone, setTone] = useState('balanced')
	const [strictTruth, setStrictTruth] = useState(true)

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

		navigate('/resume/preview', {
			state: {
				createMode: 'tailor',
				tailorIntent,
			},
		})
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream info-scrollbar overflow-y-auto" style={{ height: '100vh' }}>
			<TopNav
				user={JSON.parse(localStorage.getItem('user') || '{}')}
				onLogout={() => {
					localStorage.removeItem('token')
					localStorage.removeItem('user')
					navigate('/')
				}}
			/>

			<main className="flex-1 py-10 bg-cream">
				<div className="max-w-4xl mx-auto px-8">
					<button
						onClick={() => navigate('/resume/create')}
						className="text-gray-600 hover:text-gray-900 text-sm font-medium mb-4 flex items-center gap-1"
					>
						← Back
					</button>

					<section className="landing-hero-mesh relative overflow-hidden rounded-2xl border border-brand-pink/25 px-8 py-8 text-white shadow-[0_20px_45px_-18px_rgba(214,86,86,0.45)]">
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
						<div className="landing-hero-orb pointer-events-none absolute -left-12 top-0 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
						<div className="relative">
							<p className="text-xs font-semibold uppercase tracking-widest text-white/80">Taylor.io Assist</p>
							<h1 className="mt-2 text-3xl font-bold tracking-tight">Set your tailoring goal</h1>
							<p className="mt-2 max-w-2xl text-sm text-white/90">
								Tell us the role and job description. We use your saved profile to pick the most relevant experience,
								projects, and education, then rewrite for stronger ATS alignment and clearer fit.
							</p>
							<div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/90 sm:grid-cols-3">
								<div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/20">
									<span className="font-semibold">Step 1:</span> Understand the role requirements.
								</div>
								<div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/20">
									<span className="font-semibold">Step 2:</span> Select and prioritize your best matching content.
								</div>
								<div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/20">
									<span className="font-semibold">Step 3:</span> Generate a tailored draft for review in preview.
								</div>
							</div>
						</div>
					</section>

					<section className="mt-6 bg-white-bright rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-md">
						<div className="mb-4 rounded-lg border border-brand-pink/20 bg-brand-pink/[0.06] px-4 py-3 text-sm text-gray-700">
							<span className="font-semibold text-brand-pink">Goal:</span> increase your interview chances by aligning
							your resume to the job while staying grounded in your real background.
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="tailor-job-title" className="label">Job title</label>
								<input
									id="tailor-job-title"
									value={jobTitle}
									onChange={(e) => setJobTitle(e.target.value)}
									className="input"
									placeholder="e.g. Senior Product Designer"
									maxLength={180}
								/>
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

						<div className="mt-4">
							<label htmlFor="tailor-jd" className="label">Job description</label>
							<textarea
								id="tailor-jd"
								value={jobDescription}
								onChange={(e) => setJobDescription(e.target.value)}
								className="input min-h-[180px]"
								placeholder="Paste the full role description, required skills, and responsibilities..."
								maxLength={24000}
							/>
							<p className="mt-1 text-xs text-gray-500">{jobDescription.trim().length} / 24000 characters</p>
						</div>

						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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

						<label className="mt-5 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
							<input
								type="checkbox"
								checked={strictTruth}
								onChange={(e) => setStrictTruth(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
							/>
							Strict truth mode (recommended): do not invent facts, companies, titles, dates, or achievements
						</label>

						<div className="mt-7 flex justify-end">
							<button
								onClick={handleContinue}
								className="px-6 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
							>
								Continue to tailored preview
							</button>
						</div>
					</section>
				</div>
			</main>
		</div>
	)
}

export default ResumeTailorSetup
