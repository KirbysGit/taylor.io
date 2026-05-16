// pages / 3setup / steps / WelcomeStep.jsx

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faCheck,
	faFileArrowUp,
	faKeyboard,
	faRotate,
	faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'

import { parseResume } from '@/api/services/resume'
import { attachResume } from '@/api/services/profile'
import { eduMatches } from '@/pages/info/utils/mergeParsedData'

const WelcomeStep = ({ user, handleNext, formData, onFormDataUpdate, onRemoveResume }) => {
	const [parsedData, setParsedData] = useState(null)
	const [isParsing, setIsParsing] = useState(false)
	const [parseError, setParseError] = useState('')
	const [uploadedFile, setUploadedFile] = useState(null)

	const hasResume = Boolean(formData?.uploadedResumeFilename)

	const normalizeParsedItem = (item, defaults = {}) => ({
		...defaults,
		...item,
		id: Date.now() + Math.random(),
		fromParsed: true,
	})

	const mergeContact = (parsed, existing) => ({
		email: parsed?.email || existing?.email,
		phone: parsed?.phone || existing?.phone,
		github: parsed?.github || existing?.github,
		linkedin: parsed?.linkedin || existing?.linkedin,
		portfolio: parsed?.portfolio || existing?.portfolio,
		location: parsed?.location || existing?.location,
		tagline: parsed?.tagline || existing?.tagline || '',
	})

	const handleFileUpload = async (event) => {
		const file = event.target.files?.[0]
		if (!file) return

		const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
		const validExtensions = ['.pdf', '.docx', '.doc']
		const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`

		if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
			setParseError('Invalid file type. Please upload a PDF or DOCX file.')
			event.target.value = ''
			return
		}

		if (file.size > 10 * 1024 * 1024) {
			setParseError('File size too large. Please upload a file smaller than 10MB.')
			event.target.value = ''
			return
		}

		setUploadedFile(file)
		setParseError('')
		setParsedData(null)
		await handleParseResume(file)
		event.target.value = ''
	}

	const handleParseResume = async (file = null) => {
		const fileToParse = file || uploadedFile
		if (!fileToParse) return

		setIsParsing(true)
		setParseError('')

		try {
			const response = await parseResume(fileToParse)
			const data = response.data
			setParsedData(data)

			const isReplace = !formData?.uploadedResumeFilename
			const baseContact = formData.contact
			const baseEducation = isReplace ? [] : formData.education
			const baseSkills = isReplace ? [] : formData.skills
			const baseExperiences = isReplace ? [] : formData.experiences
			const baseProjects = isReplace ? [] : formData.projects

			const eduDefaults = {
				school: '',
				degree: '',
				field: '',
				startDate: '',
				endDate: '',
				current: false,
				gpa: '',
				honorsAwards: '',
				clubsExtracurriculars: '',
				location: '',
				relevantCoursework: '',
			}
			const educationAccum = [...baseEducation]
			for (const edu of data.education || []) {
				const normalized = normalizeParsedItem(edu, eduDefaults)
				if (!educationAccum.some((existing) => eduMatches(normalized, existing))) {
					educationAccum.push(normalized)
				}
			}

			const mergedFormData = {
				...formData,
				contact: mergeContact(data.contact_info, baseContact),
				education: educationAccum,
				skills: [
					...baseSkills,
					...(data.skills || []).map((skill) => normalizeParsedItem(
						typeof skill === 'string' ? { name: skill } : skill,
						{ name: '', category: null },
					)),
				],
				experiences: [
					...baseExperiences,
					...(data.experiences || []).map((experience) => normalizeParsedItem(experience, {
						title: '',
						company: '',
						description: Array.isArray(experience?.description) ? [] : '',
						startDate: '',
						endDate: '',
						current: false,
					})),
				],
				projects: [
					...baseProjects,
					...(data.projects || []).map((project) => normalizeParsedItem(project, {
						title: '',
						description: Array.isArray(project?.description) ? [] : '',
						techStack: [],
					})),
				],
				summary: data.summary?.trim() ? data.summary : (formData.summary || ''),
				uploadedResumeFilename: fileToParse.name,
			}

			onFormDataUpdate(mergedFormData)

			try {
				await attachResume(fileToParse.name)
			} catch (attachErr) {
				console.warn('Could not attach resume metadata:', attachErr)
			}
		} catch (error) {
			console.error('Resume parsing failed:', error)
			setParseError(error.response?.data?.detail || 'Failed to parse resume. Please try again or enter information manually.')
		} finally {
			setIsParsing(false)
		}
	}

	const handleRemoveResume = async () => {
		setUploadedFile(null)
		setParsedData(null)
		setParseError('')
		if (onRemoveResume) await onRemoveResume()
	}

	return (
		<div>
			<div className="mx-auto max-w-2xl text-center">
				<p className="mx-auto inline-flex items-center rounded-full bg-brand-pink/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-brand-pink-dark ring-1 ring-brand-pink/12">
					Step 1 of 3
				</p>
				<h2 className="mt-5 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
					Start with what you have.
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-600">
					Upload a r&eacute;sum&eacute; if you already have one, or answer a few quick questions. You can review and edit everything before creating your first r&eacute;sum&eacute;.
				</p>
			</div>

			<div className="mt-10 grid gap-5 md:grid-cols-2">
				<section className="relative flex min-h-[27rem] flex-col overflow-hidden rounded-[1.35rem] border border-brand-pink/30 bg-white p-7 text-center shadow-[0_24px_58px_-34px_rgba(214,86,86,0.55)] transition hover:-translate-y-0.5 hover:border-brand-pink/55">
					<div className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full bg-brand-pink/[0.10] blur-2xl" aria-hidden />
					<div className="pointer-events-none absolute right-8 top-12 text-brand-pink/35" aria-hidden>
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-5" />
					</div>
					<div className="relative z-[1] flex flex-1 flex-col items-center">
						<span className="flex size-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink/[0.10] via-brand-pink-lighter/55 to-white text-brand-pink-dark ring-1 ring-brand-pink/12">
							<span className="flex size-16 items-center justify-center rounded-2xl bg-white text-brand-pink shadow-[0_18px_34px_-24px_rgba(214,86,86,0.75)] ring-1 ring-brand-pink/12">
								<FontAwesomeIcon icon={faFileArrowUp} className="size-8" />
							</span>
						</span>
						<h3 className="mt-6 text-2xl font-black tracking-tight text-gray-950">I have a r&eacute;sum&eacute;</h3>
						<p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-gray-600">
							Upload a PDF or Word doc and we will help pull out the basics.
						</p>
					</div>

					{hasResume ? (
						<div className="relative z-[1] mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-left">
							<div className="flex items-center gap-3">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
									<FontAwesomeIcon icon={faCheck} className="size-3.5" />
								</span>
								<div className="min-w-0">
									<p className="font-black text-emerald-950">R&eacute;sum&eacute; imported</p>
									<p className="mt-1 truncate text-sm text-emerald-800">{formData.uploadedResumeFilename}</p>
								</div>
							</div>
							<div className="mt-4 flex flex-col gap-2 sm:flex-row">
								<button
									type="button"
									onClick={handleNext}
									className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-sm font-black text-white shadow-[0_16px_30px_-20px_rgba(214,86,86,0.9)] transition hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
								>
									Review imported profile
									<FontAwesomeIcon icon={faArrowRight} className="size-3.5" />
								</button>
								<button
									type="button"
									onClick={handleRemoveResume}
									className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-brand-pink/35 hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
								>
									<FontAwesomeIcon icon={faRotate} className="size-3.5" />
									Replace
								</button>
							</div>
						</div>
					) : (
						<div className="relative z-[1] mt-5">
							<input
								type="file"
								accept=".pdf,.docx,.doc"
								onChange={handleFileUpload}
								className="hidden"
								id="resume-upload"
								disabled={isParsing}
							/>
							<label
								htmlFor="resume-upload"
								className={[
									'flex min-h-[3.6rem] cursor-pointer items-center justify-center gap-3 rounded-xl border px-5 py-3 text-base font-black transition focus-within:ring-2 focus-within:ring-brand-pink focus-within:ring-offset-2',
									isParsing
										? 'border-brand-pink/35 bg-brand-pink/[0.07] text-brand-pink-dark'
										: 'border-brand-pink bg-brand-pink text-white shadow-[0_16px_30px_-20px_rgba(214,86,86,0.9)] hover:border-brand-pink-dark hover:bg-brand-pink-dark',
								].join(' ')}
							>
								{isParsing ? (
									<>
										<span className="flex gap-1">
											<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '0ms' }} />
											<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '130ms' }} />
											<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '260ms' }} />
										</span>
										Reading your file...
									</>
								) : (
									<>
										<FontAwesomeIcon icon={faFileArrowUp} className="size-4" />
										Upload r&eacute;sum&eacute;
										<FontAwesomeIcon icon={faArrowRight} className="size-4" />
									</>
								)}
							</label>
							<p className="mt-4 text-center text-sm font-semibold text-gray-500">PDF, DOC, DOCX &middot; Max 10MB</p>
						</div>
					)}

					{parseError ? (
						<div className="relative z-[1] mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
							{parseError}
						</div>
					) : null}
				</section>

				<button
					type="button"
					onClick={handleNext}
					disabled={isParsing}
					className="group relative flex min-h-[27rem] flex-col overflow-hidden rounded-[1.35rem] border border-gray-200 bg-white p-7 text-center shadow-[0_24px_58px_-38px_rgba(45,30,38,0.42)] transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_26px_60px_-38px_rgba(115,71,190,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
				>
					<div className="pointer-events-none absolute left-1/2 top-8 size-40 -translate-x-1/2 rounded-full bg-violet-500/[0.10] blur-2xl" aria-hidden />
					<div className="pointer-events-none absolute left-10 top-20 text-violet-300/70" aria-hidden>
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-4" />
					</div>
					<div className="relative z-[1] flex flex-1 flex-col items-center">
						<span className="flex size-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 via-violet-50 to-white text-violet-700 ring-1 ring-violet-200/70">
							<span className="flex size-16 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-[0_18px_34px_-24px_rgba(115,71,190,0.65)] ring-1 ring-violet-200/70">
								<FontAwesomeIcon icon={faKeyboard} className="size-8" />
							</span>
						</span>
						<h3 className="mt-6 text-2xl font-black tracking-tight text-gray-950">I will enter it myself</h3>
						<p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-gray-600">
							Add your experience, education, projects, and skills step by step.
						</p>
					</div>
					<span className="relative z-[1] mt-5 inline-flex min-h-[3.6rem] items-center justify-center gap-3 self-center rounded-xl border border-violet-400 bg-white px-9 py-3 text-base font-black text-violet-700 shadow-sm transition group-hover:border-violet-500 group-hover:bg-violet-50">
						Add my info
						<FontAwesomeIcon icon={faArrowRight} className="size-3.5 transition group-hover:translate-x-0.5" />
					</span>
					<div className="relative z-[1] mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500">
						<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3 text-brand-pink" />
						Start simple, refine as you go.
					</div>
				</button>
			</div>

			<div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-gray-500">
				<span>Nothing is final</span>
				<span className="text-brand-pink" aria-hidden>&middot;</span>
				<span>Edit anytime</span>
				<span className="text-brand-pink" aria-hidden>&middot;</span>
				<span>Create your first draft when ready</span>
			</div>
		</div>
	)
}

export default WelcomeStep
