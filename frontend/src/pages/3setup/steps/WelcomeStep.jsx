// pages / 3setup / steps / WelcomeStep.jsx

// imports.
import React from 'react';
import { useState } from 'react';

// services imports.
import { parseResume } from '@/api/services/resume'

const WelcomeStep = ({ user, handleNext, formData, onFormDataUpdate }) => {

    // parsed resume data state.
	const [parsedData, setParsedData] = useState(null)
	const [isParsing, setIsParsing] = useState(false)
	const [parseError, setParseError] = useState('')
	const [uploadedFile, setUploadedFile] = useState(null)

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
		email: parsed?.email || existing.email,
		phone: parsed?.phone || existing.phone,
		github: parsed?.github || existing.github,
		linkedin: parsed?.linkedin || existing.linkedin,
		portfolio: parsed?.portfolio || existing.portfolio,
	})

    // ---- functions ----
    
    // handles file upload.
	const handleFileUpload = (e) => {
		
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
			
			// set uploaded file state.
			setUploadedFile(file)
			setParseError('')
		}
	}

	// handles resume parsing.
	const handleParseResume = async () => {
		// if no file uploaded, return.
		if (!uploadedFile) return

		// set parsing state to true.
		setIsParsing(true)
		setParseError('')

		try {
			const response = await parseResume(uploadedFile)
			const data = response.data

			// set parsed data state.
			setParsedData(data)
            
			// merge parsed data into form data.
			const mergedFormData = {
                ...formData,
                contact: mergeContact(data.contact_info, formData.contact),
                education: [
                    ...formData.education,
                    ...(data.education || []).map(edu => normalizeParsedItem(edu, {
                        school: '', degree: '', field: '', startDate: '', endDate: '', current: false, gpa: '', honorsAwards: '', clubsExtracurriculars: '', location: '', relevantCoursework: ''
                    }))
                ],
                skills: [
                    ...formData.skills,
                    ...(data.skills || []).map(skill => normalizeParsedItem(
                        typeof skill === 'string' ? { name: skill } : skill,
                        { name: '', category: null }
                    ))
                ],
                experiences: [
                    ...formData.experiences,
                    ...(data.experiences || []).map(exp => normalizeParsedItem(exp, {
                        title: '', company: '', description: Array.isArray(exp?.description) ? [] : '',
                        startDate: '', endDate: '', current: false
                    }))
                ],
                projects: [
                    ...formData.projects,
                    ...(data.projects || []).map(proj => normalizeParsedItem(proj, {
                        title: '', description: Array.isArray(proj?.description) ? [] : '', techStack: []
                    }))
                ],
                summary: (data.summary && data.summary.trim()) ? data.summary : (formData.summary || '')
            }

            // return merged form data to parent.
            onFormDataUpdate(mergedFormData)
		} catch (error) {
			// if error, set error state and return.
			console.error('Resume parsing failed:', error)
			setParseError(error.response?.data?.detail || 'Failed to parse resume. Please try again or enter information manually.')
		} finally {
			setIsParsing(false)
		}
	}

    return (
        <div className="py-8">
            {/* welcome message */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome, {user?.first_name || 'there'}! 👋
            </h2>

            {/* intro message */}
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Let's get started with some of your background before we get to getting you a job.
                This will only take a few minutes, and you can always come back to add more later.
            </p>

            {/* resume upload section */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Upload Your Resume (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Upload a PDF or DOCX resume to automatically fill in your information
                </p>
                
                {/* input field */}
                <div className="flex flex-col items-center gap-4">
                    <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="resume-upload"
                    />
                    <label
                        htmlFor="resume-upload"
                        className="px-6 py-2 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink/10 transition-all cursor-pointer"
                    >
                        {uploadedFile ? uploadedFile.name : 'Choose File'}
                    </label>

                    {uploadedFile && (
                        <button
                            onClick={handleParseResume}
                            disabled={isParsing}
                            className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isParsing ? 'Parsing Resume...' : 'Parse Resume'}
                        </button>
                    )}

                    {isParsing && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-pink"></div>
                            <span>Extracting information from your resume...</span>
                        </div>
                    )}

                    {parsedData && (
                        <div className="mt-4 w-full">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-left mb-4">
                                <p className="font-semibold text-green-800 mb-2">✓ Resume parsed successfully!</p>
                                <div className="text-green-700 space-y-1">
                                    {parsedData.contact_info && (parsedData.contact_info.email || parsedData.contact_info.github || parsedData.contact_info.linkedin || parsedData.contact_info.portfolio) && (
                                        <p>• Found contact information</p>
                                    )}
                                    {parsedData.education?.length > 0 && (
                                        <p>• Found {parsedData.education.length} education entry/entries</p>
                                    )}
                                    {parsedData.experiences?.length > 0 && (
                                        <p>• Found {parsedData.experiences.length} experience(s)</p>
                                    )}
                                    {parsedData.skills?.length > 0 && (
                                        <p>• Found {parsedData.skills.length} skill(s)</p>
                                    )}
                                    {parsedData.projects?.length > 0 && (
                                        <p>• Found {parsedData.projects.length} project(s)</p>
                                    )}
                                    {parsedData.summary && (
                                        <p>• Found professional summary</p>
                                    )}
                                </div>
                                {parsedData.warnings?.length > 0 && (
                                    <div className="mt-2 text-yellow-700">
                                        <p className="font-semibold">Note:</p>
                                        {parsedData.warnings.map((warning, i) => (
                                            <p key={i}>• {warning}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 p-4 bg-gray-900 rounded-lg overflow-auto max-h-96">
                                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                    {JSON.stringify(parsedData, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    {parseError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {parseError}
                        </div>
                    )}
                </div>
            </div>

            {/* continue button */}
            <div className="flex gap-4 justify-center">
                <button
                    onClick={handleNext}
                    className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
                >
                    {parsedData ? 'Continue with Parsed Data →' : "Let's Get Started →"}
                </button>
            </div>
        </div>
    );
}

export default WelcomeStep;