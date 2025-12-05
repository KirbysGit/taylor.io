// services / resume.js

// resume generation api calls.

// generate resume as a pdf.
// generate resume as an html preview.
// parse resume file (PDF or DOCX).

// services.
import { apiRequest, API_BASE_URL } from '../api'

// generate resume as PDF (download).
export async function generateResumePDF(template = 'main', overrides = {}) {
	// get token from localStorage.
	const token = localStorage.getItem('token')
	
	// construct url for request with template parameter.
	const params = new URLSearchParams({ template })
	if (overrides.header_order && Array.isArray(overrides.header_order)) {
		params.append('header_order', overrides.header_order.join(','))
		delete overrides.header_order
	}
	if (overrides.header_alignment) {
		params.append('header_align', overrides.header_alignment)
		delete overrides.header_alignment
	}
	Object.entries(overrides || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			params.append(key, value)
		}
	})
	const url = `${API_BASE_URL}/api/resume/pdf?${params.toString()}`
	
	// try to generate resume.
	try {
		const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })

		if (!response.ok) {
			throw new Error('Failed to generate resume')
		}

		// get filename from response headers.
		const contentDisposition = response.headers.get('Content-Disposition')
		let filename = 'resume.pdf'

		if (contentDisposition) {
			// try to get filename from filename*=UTF-8'' format first (RFC 5987).
			let filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/i)
			if (filenameMatch) {
				filename = decodeURIComponent(filenameMatch[1])
			} else {
				// fallback to regular filename="..." format.
				filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
				if (filenameMatch) {
					filename = filenameMatch[1].trim()
				}
			}
		}
		
		// ensure filename ends with .pdf
		if (!filename.toLowerCase().endsWith('.pdf')) {
			filename = filename + '.pdf'
		}

		// convert response to blob and create download link.
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

// generate resume as DOCX (download).
export async function generateResumeDOCX(template = 'modern', overrides = {}) {
	// get token from localStorage.
	const token = localStorage.getItem('token')
	
	// construct url for request with template parameter.
	const params = new URLSearchParams({ template })
	if (overrides.header_order && Array.isArray(overrides.header_order)) {
		params.append('header_order', overrides.header_order.join(','))
		delete overrides.header_order
	}
	if (overrides.header_alignment) {
		params.append('header_align', overrides.header_alignment)
		delete overrides.header_alignment
	}
	Object.entries(overrides || {}).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			params.append(key, value)
		}
	})
	const url = `${API_BASE_URL}/api/resume/docx?${params.toString()}`
	
	// try to generate resume.
	try {
		const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } })

		if (!response.ok) {
			throw new Error('Failed to generate resume')
		}

		// get filename from response headers.
		const contentDisposition = response.headers.get('Content-Disposition')
		let filename = 'resume.docx'

		if (contentDisposition) {
			// try to get filename from filename*=UTF-8'' format first (RFC 5987).
			let filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/i)
			if (filenameMatch) {
				filename = decodeURIComponent(filenameMatch[1])
			} else {
				// fallback to regular filename="..." format.
				filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
				if (filenameMatch) {
					filename = filenameMatch[1].trim()
				}
			}
		}
		
		// ensure filename ends with .docx
		if (!filename.toLowerCase().endsWith('.docx')) {
			filename = filename + '.docx'
		}

		// convert response to blob and create download link.
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
		console.error('Error generating resume DOCX:', error)
		throw error
	}
}

// generate resume as HTML (preview).
export async function generateResumeHTML() {
	return apiRequest('/api/resume/html', {
		method: 'GET',
	})
}

// list available templates.
export async function listTemplates() {
	return apiRequest('/api/resume/templates', {
		method: 'GET',
	})
}

// parse resume file (PDF or DOCX).
export async function parseResume(file) {
	// get token from localStorage.
	const token = localStorage.getItem('token')
	
	// construct url for request.
	const url = `${API_BASE_URL}/api/profile/parse-resume`
	
	// create form data for file upload.
	const formData = new FormData()
	formData.append('file', file)
	
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${token}` },
			body: formData,
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw { response: { data: errorData, status: response.status } }
		}

		// parse response body as json.
		const data = await response.json()
		return { data }
	} catch (error) {
		console.error('Error parsing resume:', error)
		throw error
	}
}

