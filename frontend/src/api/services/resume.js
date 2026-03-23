// services / resume.js

// resume generation api calls.

// generate resume as a pdf.
// generate resume as an html preview.
// parse resume file (PDF or DOCX).

// services.
import { apiRequest, apiRequestText, apiRequestBlob } from '../api'

// parse resume file (PDF or DOCX) - saves to DB (WelcomeStep).
export async function parseResume(file) {
	const formData = new FormData()
	formData.append('file', file)
	return await apiRequest('/api/profile/parse-resume', {
		method: 'POST',
		body: formData,
	})
}

// parse resume file - returns only, no DB save (Info page merge).
export async function parseResumeMerge(file) {
	const formData = new FormData()
	formData.append('file', file)
	return await apiRequest('/api/profile/parse-resume-merge', {
		method: 'POST',
		body: formData,
	})
}

export async function generateResumePreview(template, resumeData) {

	// get token from localStorage.
	const token = localStorage.getItem('token')
	
	// construct url for request.

	const url = `/api/resume/generator/preview`

	// create payload for request.
	const payload = {
		template: template,
		resume_data: resumeData,
		}

	// make request to backend.
	try {
		return await apiRequestText(url, {
			method: 'POST',
			body: JSON.stringify(payload),
		})
	} catch (error) {
		console.error('Error generating resume preview:', error)
		throw error
	}
}

export async function generateResumePDF(template, resumeData) {

	// get token from localStorage.
	const token = localStorage.getItem('token')
	
	// construct url for request.
	const url = `/api/resume/generator/pdf`
	
	// create payload for request.
	const payload = {
		template: template,
		resume_data: resumeData,
	}

	// make request to backend.
	try {
		return await apiRequestBlob(url, {
			method: 'POST',
			body: JSON.stringify(payload),
		})
	} catch (error) {
		console.error('Error generating resume PDF:', error)
		throw error
	}
}

export async function generateResumeWord(template, resumeData) {
	const url = `/api/resume/generator/docx`
	const payload = {
		template: template,
		resume_data: resumeData,
	}
	try {
		return await apiRequestBlob(url, {
			method: 'POST',
			body: JSON.stringify(payload),
		})
	} catch (error) {
		console.error('Error generating resume Word:', error)
		throw error
	}
}

