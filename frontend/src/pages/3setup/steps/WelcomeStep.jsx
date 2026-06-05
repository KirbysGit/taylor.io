// pages / 3setup / steps / WelcomeStep.jsx

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
	faArrowRight,
	faCheck,
	faEye,
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
		<div className="mx-auto max-w-2xl">
			{/* Header */}
			<div className="mb-10 text-center">
				<h2 className="font-serif text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
					Start with what you have.
				</h2>
				<p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-500">
					Upload a r&eacute;sum&eacute;, or answer a few quick questions.
					You can edit everything later.
				</p>
			</div>

			{/* Option cards */}
			<div className="space-y-4">

				{/* Upload card */}
				<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-brand-pink/30 hover:shadow-md">
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
						<div className="p-5">
							<div className="flex items-center gap-4">
								<div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
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
										className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white shadow-sm transition hover:bg-brand-pink-dark"
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
							className={`flex cursor-pointer items-center gap-4 p-5 ${isParsing ? 'pointer-events-none' : ''}`}
						>
							<div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.10] text-brand-pink">
								{isParsing ? (
									<span className="flex gap-1">
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '0ms' }} />
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '130ms' }} />
										<span className="size-1.5 animate-bounce rounded-full bg-brand-pink" style={{ animationDelay: '260ms' }} />
									</span>
								) : (
									<FontAwesomeIcon icon={faFileArrowUp} className="size-6" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="font-black text-gray-950">
									{isParsing ? 'Reading your file…' : 'Upload a résumé'}
								</p>
								<p className="mt-0.5 text-sm text-gray-500">
									{isParsing ? 'This usually takes a few seconds.' : 'PDF or Word · We\'ll pull out the basics'}
								</p>
								{isParsing ? (
									<div className="mt-2 overflow-hidden rounded-full bg-brand-pink/[0.10]">
										<div className="h-1 w-1/2 animate-pulse rounded-full bg-gradient-to-r from-brand-pink via-rose-400 to-violet-400" />
									</div>
								) : null}
							</div>
							{!isParsing ? (
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-pink/[0.10] text-brand-pink transition group-hover:bg-brand-pink group-hover:text-white">
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
						className="group flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
					>
						<div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
							<FontAwesomeIcon icon={faKeyboard} className="size-6" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-black text-gray-950">Enter my information</p>
							<p className="mt-0.5 text-sm text-gray-500">Add experience, education, projects, and skills</p>
						</div>
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
							<FontAwesomeIcon icon={faArrowRight} className="size-4 transition group-hover:translate-x-0.5" />
						</div>
					</button>
				) : null}
			</div>

			{/* Footer note */}
			<div className="mt-8 flex items-center justify-center gap-2.5 text-sm text-gray-500">
				<span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-500">
					<FontAwesomeIcon icon={faWandMagicSparkles} className="size-3.5" />
				</span>
				<span className="font-medium">Nothing is final &middot; You can edit everything later</span>
			</div>
		</div>
	)
}

export default WelcomeStep
