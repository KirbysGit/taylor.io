// pages / 3setup / steps / WelcomeStep.jsx

// imports.
import React from 'react';
import { useState } from 'react';

// services imports.
import { parseResume } from '@/api/services/resume'
import { attachResume } from '@/api/services/profile'
import { eduMatches } from '@/pages/info/utils/mergeParsedData'

const WelcomeStep = ({ user, handleNext, formData, onFormDataUpdate, onRemoveResume }) => {

    // parsed resume data state (local; formData.uploadedResumeFilename persists across steps).
	const [parsedData, setParsedData] = useState(null)
	const [isParsing, setIsParsing] = useState(false)
	const [parseError, setParseError] = useState('')
	const [uploadedFile, setUploadedFile] = useState(null)

	// persisted: resume already uploaded and attached (survives step navigation).
	const hasResume = !!formData?.uploadedResumeFilename

    // ---- helpers ----

	// normalizes parsed item with defaults and metadata.
	const normalizeParsedItem = (item, defaults = {}) => ({
		...defaults,
		...item,
		id: Date.now() + Math.random(),
		fromParsed: true
	})

	// merges contact info.
	const mergeContact = (parsed, existing) => ({
		email: parsed?.email || existing?.email,
		phone: parsed?.phone || existing?.phone,
		github: parsed?.github || existing?.github,
		linkedin: parsed?.linkedin || existing?.linkedin,
		portfolio: parsed?.portfolio || existing?.portfolio,
		location: parsed?.location || existing?.location,
		tagline: parsed?.tagline || existing?.tagline || '',
	})

    // ---- functions ----
    
    // handles file upload and automatically parses.
	const handleFileUpload = async (e) => {
		
		// grab file from event target.
		const file = e.target.files?.[0]

		if (file) {
			// validate file type (only PDF and DOCX are supported).
			const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
			const validExtensions = ['.pdf', '.docx', '.doc']
			const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
			
			// if file type is not valid, set error and return.
			if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
				setParseError('Invalid file type. Please upload a PDF or DOCX file.')
				return
			}
			
			// validate file size (max 10MB).
			if (file.size > 10 * 1024 * 1024) {
				setParseError('File size too large. Please upload a file smaller than 10MB.')
				return
			}
			
			// set uploaded file state and clear any previous errors.
			setUploadedFile(file)
			setParseError('')
			setParsedData(null) // clear previous parsed data
			
			// automatically parse the resume.
			await handleParseResume(file)
		}
	}

	// handles resume parsing.
	const handleParseResume = async (file = null) => {
		// use provided file or uploaded file.
		const fileToParse = file || uploadedFile
		if (!fileToParse) return

		// set parsing state to true.
		setIsParsing(true)
		setParseError('')

		try {
			const response = await parseResume(fileToParse)
			const data = response.data

			// set parsed data state.
			setParsedData(data)

			// replace vs merge: if no resume attached yet (first upload or after remove), replace; otherwise merge.
			const isReplace = !formData?.uploadedResumeFilename
			const baseContact = isReplace ? formData.contact : formData.contact
			const baseEducation = isReplace ? [] : formData.education
			const baseSkills = isReplace ? [] : formData.skills
			const baseExperiences = isReplace ? [] : formData.experiences
			const baseProjects = isReplace ? [] : formData.projects

			// education: dedupe with eduMatches (empty discipline = matches any)
			const eduDefaults = { school: '', degree: '', field: '', startDate: '', endDate: '', current: false, gpa: '', honorsAwards: '', clubsExtracurriculars: '', location: '', relevantCoursework: '' }
			const educationAccum = [...baseEducation]
			for (const edu of data.education || []) {
				const normalized = normalizeParsedItem(edu, eduDefaults)
				if (!educationAccum.some((ex) => eduMatches(normalized, ex))) {
					educationAccum.push(normalized)
				}
			}

			const mergedFormData = {
                ...formData,
                contact: mergeContact(data.contact_info, baseContact),
                education: educationAccum,
                skills: [
                    ...baseSkills,
                    ...(data.skills || []).map(skill => normalizeParsedItem(
                        typeof skill === 'string' ? { name: skill } : skill,
                        { name: '', category: null }
                    ))
                ],
                experiences: [
                    ...baseExperiences,
                    ...(data.experiences || []).map(exp => normalizeParsedItem(exp, {
                        title: '', company: '', description: Array.isArray(exp?.description) ? [] : '',
                        startDate: '', endDate: '', current: false
                    }))
                ],
                projects: [
                    ...baseProjects,
                    ...(data.projects || []).map(proj => normalizeParsedItem(proj, {
                        title: '', description: Array.isArray(proj?.description) ? [] : '', techStack: []
                    }))
                ],
                summary: (data.summary && data.summary.trim()) ? data.summary : (formData.summary || ''),
				uploadedResumeFilename: fileToParse.name
            }

            onFormDataUpdate(mergedFormData)

			// record attached resume for Info page banner
			try {
				await attachResume(fileToParse.name)
			} catch (attachErr) {
				console.warn('Could not attach resume metadata:', attachErr)
			}
		} catch (error) {
			// if error, set error state and return.
			console.error('Resume parsing failed:', error)
			setParseError(error.response?.data?.detail || 'Failed to parse resume. Please try again or enter information manually.')
		} finally {
			setIsParsing(false)
		}
	}


    return (
        <div className="text-center">
            {/* welcome message - friendly */}
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Welcome, {user?.first_name || 'there'}! 👋
            </h2>
            <p className="text-lg text-gray-600 mb-8">
                Let's build your professional profile together
            </p>

            {/* resume upload - friendly and optional */}
            <div className={`mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border-2 border-dashed transition-all ${
                (hasResume || uploadedFile) ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-300 hover:border-brand-pink/50'
            }`}>
                <p className="text-sm text-gray-600 mb-4">
                    Have a resume? We'd love to see it! If not, no worries! ➝ We'll help you build one from scratch.
                </p>

                {hasResume ? (
                    /* Success state: resume already attached (persists when navigating back) */
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-3 border-2 border-green-500 bg-green-50 text-green-700 font-semibold rounded-lg">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formData.uploadedResumeFilename}</span>
                        </div>
                        {onRemoveResume && (
                            <button
                                type="button"
                                onClick={onRemoveResume}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Replace
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <input
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="resume-upload"
                        />
                        <label
                            htmlFor="resume-upload"
                            className={`block px-6 py-3 border-2 font-semibold rounded-lg transition-all cursor-pointer text-center relative ${
                                uploadedFile 
                                    ? parsedData 
                                        ? 'border-green-500 bg-green-50 text-green-700' 
                                        : isParsing
                                        ? 'border-brand-pink bg-brand-pink/10 text-brand-pink'
                                        : 'border-brand-pink bg-brand-pink/10 text-brand-pink'
                                    : 'border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white shadow-sm hover:shadow-md'
                            }`}
                        >
                            {isParsing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="flex gap-1">
                                        <span className="w-2 h-2 bg-brand-pink rounded-full animate-wave" style={{ animationDelay: '0s' }}></span>
                                        <span className="w-2 h-2 bg-brand-pink rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-2 h-2 bg-brand-pink rounded-full animate-wave" style={{ animationDelay: '0.4s' }}></span>
                                    </span>
                                    Parsing...
                                </span>
                            ) : uploadedFile && parsedData ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {uploadedFile.name}
                                </span>
                            ) : uploadedFile ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {uploadedFile.name}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Upload Your Resume
                                </span>
                            )}
                        </label>
                    </>
                )}

                {parseError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {parseError}
                    </div>
                )}
            </div>

            {/* continue button - friendly messaging */}
            <div className="space-y-3">
                <button
                    onClick={handleNext}
                    className="w-full px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                >
                    {(parsedData || hasResume) ? 'Continue with Your Resume' : 'Continue & Build Your Profile'}
                </button>
                
                {!parsedData && !hasResume && (
                    <p className="text-sm text-gray-500">
                        Don't have a resume? No problem! We'll guide you through building one step by step. ✨
                    </p>
                )}
                
                {(parsedData || hasResume) && (
                    <p className="text-sm text-gray-500">
                        We've loaded your information. You can review and edit everything in the next steps!
                    </p>
                )}
            </div>
        </div>
    );
}

export default WelcomeStep;