// services / resume.js

// resume generation api calls.

// services.
import { apiRequest, API_BASE_URL } from '../api'

// generate resume as PDF (download).
export async function generateResumePDF() {
	const token = localStorage.getItem('token')
	const url = `${API_BASE_URL}/api/resume/pdf`
	
	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		})

		if (!response.ok) {
			throw new Error('Failed to generate resume')
		}

		// Get filename from Content-Disposition header or use default
		const contentDisposition = response.headers.get('Content-Disposition')
		let filename = 'resume.pdf'
		if (contentDisposition) {
			// Try to get filename from filename*=UTF-8'' format first (RFC 5987)
			let filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/i)
			if (filenameMatch) {
				filename = decodeURIComponent(filenameMatch[1])
			} else {
				// Fallback to regular filename="..." format
				filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
				if (filenameMatch) {
					filename = filenameMatch[1].trim()
				}
			}
		}
		
		// Ensure filename ends with .pdf
		if (!filename.toLowerCase().endsWith('.pdf')) {
			filename = filename + '.pdf'
		}

		// Convert response to blob and create download link
		const blob = await response.blob()
		const downloadUrl = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(downloadUrl)

		return { success: true, filename }
	} catch (error) {
		console.error('Error generating resume PDF:', error)
		throw error
	}
}

// generate resume as HTML (preview).
export async function generateResumeHTML() {
	return apiRequest('/api/resume/html', {
		method: 'GET',
	})
}

// parse resume file (PDF or DOCX).
export async function parseResume(file) {
	const token = localStorage.getItem('token')
	const url = `${API_BASE_URL}/api/profile/parse-resume`
	
	// create form data for file upload.
	const formData = new FormData()
	formData.append('file', file)
	
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				// Don't set Content-Type - browser will set it with boundary for FormData
			},
			body: formData,
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw { response: { data: errorData, status: response.status } }
		}

		const data = await response.json()
		return { data }
	} catch (error) {
		console.error('Error parsing resume:', error)
		throw error
	}
}

