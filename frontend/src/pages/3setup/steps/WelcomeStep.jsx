// pages / 3setup / steps / WelcomeStep.jsx

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faCheck,
	faEye,
	faFileArrowUp,
	faPen,
	faRotate,
	faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'

import { parseResume } from '@/api/services/resume'
import { attachResume } from '@/api/services/profile'
import { eduMatches } from '@/pages/info/utils/mergeParsedData'

const WelcomeStep = ({ user, handleNext, formData, onFormDataUpdate, onRemoveResume, onSkipSetup }) => {
	const [parsedData, setParsedData] = useState(null)
	const [isParsing, setIsParsing] = useState(false)
	const [parseError, setParseError] = useState('')
	const [uploadedFile, setUploadedFile] = useState(null)
	const [resumePreviewUrl, setResumePreviewUrl] = useState('')
	const hasResume = Boolean(formData?.uploadedResumeFilename)
	const [selectedPath, setSelectedPath] = useState(hasResume ? 'upload' : '')

	useEffect(() => {
		if (!uploadedFile) {
			setResumePreviewUrl('')
			return undefined
		}
		const url = URL.createObjectURL(uploadedFile)
		setResumePreviewUrl(url)
		return () => URL.revokeObjectURL(url)
	}, [uploadedFile])

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
		setSelectedPath('upload')
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
				school: '', degree: '', field: '', startDate: '', endDate: '',
				current: false, gpa: '', honorsAwards: '', clubsExtracurriculars: '',
				location: '', relevantCoursework: '',
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
						title: '', company: '',
						description: Array.isArray(experience?.description) ? [] : '',
						startDate: '', endDate: '', current: false,
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
			setParseError(error.response?.data?.detail || "Couldn't read that file — try a different PDF or Word doc.")
		} finally {
			setIsParsing(false)
		}
	}

	const handleRemoveResume = async () => {
		setUploadedFile(null)
		setParsedData(null)
		setSelectedPath('')
		setParseError('')
		if (onRemoveResume) await onRemoveResume()
	}

	return (
		<div className="mx-auto max-w-3xl">
			{/* Header */}
			<div className="mb-9 text-center">
				<h2 className="font-serif text-4xl font-black tracking-tight text-gray-950 sm:text-[2.85rem]">
					Start with what you have.
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
					Upload a r&eacute;sum&eacute;, or answer a few quick questions.
					<span className="block">You can edit everything later.</span>
				</p>
			</div>

			{/* Option cards */}
			<div className="space-y-4">

				{/* Upload card */}
				<div className="group overflow-hidden rounded-[1.25rem] border border-brand-pink/12 bg-white shadow-[0_18px_42px_-30px_rgba(90,45,45,0.48)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-pink/32 hover:shadow-[0_24px_52px_-30px_rgba(214,86,86,0.38)]">
					<input
						type="file"
						accept=".pdf,.docx,.doc"
						onChange={handleFileUpload}
						className="hidden"
						id="resume-upload"
						disabled={isParsing}
					/>

					{hasResume ? (
						/* Success state */
						<div className="p-5 sm:p-6">
							<div className="flex items-center gap-4">
								<div className="flex size-16 shrink-0 items-center justify-center rounded-[1.15rem] bg-emerald-50 text-emerald-600">
									<FontAwesomeIcon icon={faCheck} className="size-6" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-black text-gray-950">Résumé imported</p>
									<p className="mt-0.5 truncate text-sm text-gray-500">{formData.uploadedResumeFilename}</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{resumePreviewUrl ? (
										<a
											href={resumePreviewUrl}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
										>
											<FontAwesomeIcon icon={faEye} className="size-3" />
											View
										</a>
									) : null}
									<button
										type="button"
										onClick={handleRemoveResume}
										className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:border-brand-pink/30 hover:text-brand-pink-dark"
									>
										<FontAwesomeIcon icon={faRotate} className="size-3" />
										Replace
									</button>
									<button
										type="button"
										onClick={handleNext}
										className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.11] text-brand-pink shadow-sm transition duration-300 hover:translate-x-1 hover:bg-brand-pink hover:text-white"
										aria-label="Continue"
									>
										<FontAwesomeIcon icon={faArrowRight} className="size-4" />
									</button>
								</div>
							</div>
						</div>
					) : (
						/* Upload trigger */
						<label
							htmlFor="resume-upload"
							className={`flex min-h-[8rem] cursor-pointer items-center gap-5 px-6 py-5 sm:px-7 ${isParsing ? 'pointer-events-none' : ''}`}
						>
							<div className="flex size-16 shrink-0 items-center justify-center rounded-[1.15rem] bg-brand-pink/[0.10] text-brand-pink">
								{isParsing ? (
									<span className="flex gap-1">
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '0ms' }} />
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '130ms' }} />
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '260ms' }} />
									</span>
								) : (
									<FontAwesomeIcon icon={faFileArrowUp} className="size-7" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-lg font-black text-gray-950">
									{isParsing ? 'Reading your file…' : 'Upload a résumé'}
								</p>
								<p className="mt-1 text-sm text-gray-500 sm:text-base">
									{isParsing ? 'This usually takes a few seconds.' : 'PDF or Word · We\'ll pull out the basics'}
								</p>
								{isParsing ? (
									<div className="mt-2 overflow-hidden rounded-full bg-brand-pink/[0.10]">
										<div className="h-1 w-1/2 animate-pulse rounded-full bg-gradient-to-r from-brand-pink to-rose-400" />
									</div>
								) : null}
							</div>
							{!isParsing ? (
								<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.10] text-brand-pink transition duration-300 group-hover:translate-x-1 group-hover:bg-brand-pink group-hover:text-white">
									<FontAwesomeIcon icon={faArrowRight} className="size-4" />
								</div>
							) : null}
						</label>
					)}

					{parseError ? (
						<div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
							{parseError}
						</div>
					) : null}
				</div>

				{/* Manual entry card */}
				{!hasResume ? (
					<button
						type="button"
						onClick={() => {
							setSelectedPath('manual')
							handleNext()
						}}
						disabled={isParsing}
						className="group flex min-h-[8rem] w-full items-center gap-5 rounded-[1.25rem] border border-brand-pink/12 bg-white px-6 py-5 text-left shadow-[0_18px_42px_-30px_rgba(90,45,45,0.48)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-pink/32 hover:shadow-[0_24px_52px_-30px_rgba(214,86,86,0.38)] disabled:pointer-events-none disabled:opacity-60 sm:px-7"
					>
						<div className="flex size-16 shrink-0 items-center justify-center rounded-[1.15rem] bg-brand-pink/[0.10] text-brand-pink">
							<FontAwesomeIcon icon={faPen} className="size-7" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-lg font-black text-gray-950">Enter my information</p>
							<p className="mt-1 text-sm text-gray-500 sm:text-base">Add experience, education, projects, and skills</p>
						</div>
						<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.10] text-brand-pink transition duration-300 group-hover:translate-x-1 group-hover:bg-brand-pink group-hover:text-white">
							<FontAwesomeIcon icon={faArrowRight} className="size-4" />
						</div>
					</button>
				) : null}
			</div>

			{/* Footer note */}
			<div className="mt-8 flex items-center justify-center gap-3 text-sm text-gray-500">
				<FontAwesomeIcon icon={faShieldHalved} className="size-5 text-brand-pink" />
				<span className="font-medium">Nothing is final &middot; Edit anytime</span>
			</div>
			<button
				type="button"
				onClick={onSkipSetup}
				disabled={isParsing}
				className="mx-auto mt-5 block rounded-lg px-3 py-2 text-sm font-bold text-gray-500 transition hover:bg-white/70 hover:text-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink disabled:pointer-events-none disabled:opacity-50"
			>
				Set up later
			</button>
		</div>
	)
}

export default WelcomeStep
