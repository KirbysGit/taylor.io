// pages/5resume/ResumePreview.jsx

// resume preview and customization page.

// imports.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateResumePDF, generateResumeDOCX } from '@/api/services/resume'
import { getMyProfile } from '@/api/services/profile'
import { API_BASE_URL } from '@/api/api'

// ----------- main component -----------

function ResumePreview() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	
	// get initial format and template from URL params or defaults.
	const initialFormat = searchParams.get('format') || 'pdf'
	const initialTemplate = searchParams.get('template') || 'modern'
	
	const [profile, setProfile] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [resumeFormat, setResumeFormat] = useState(initialFormat) // 'pdf' or 'docx'
	const [docxTemplate, setDocxTemplate] = useState(initialTemplate) // template for DOCX
	const [isGenerating, setIsGenerating] = useState(false)
	const [previewHtml, setPreviewHtml] = useState(null)
	const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
	const [previewError, setPreviewError] = useState(null)

	// fetch profile and preview on mount.
	useEffect(() => {
		const fetchData = async () => {
			const token = localStorage.getItem('token')
			const userData = localStorage.getItem('user')
			
			if (!token || !userData) {
				navigate('/auth')
				return
			}

			try {
				// fetch profile.
				const response = await getMyProfile()
				setProfile(response.data)
				
				// fetch HTML preview.
				await loadPreview()
			} catch (error) {
				console.error('Error fetching data:', error)
				setPreviewError('Failed to load preview')
			} finally {
				setIsLoading(false)
			}
		}

		fetchData()
	}, [])

	// reload preview when format or template changes.
	useEffect(() => {
		if (profile) {
			loadPreview()
		}
	}, [resumeFormat, docxTemplate])

	// function to load preview based on format.
	const loadPreview = async () => {
		try {
			setPreviewError(null)
			const token = localStorage.getItem('token')
			
			if (resumeFormat === 'pdf') {
				// for PDF, use preview parameter to get inline PDF.
				const pdfUrl = `${API_BASE_URL}/api/resume/pdf?preview=true`
				// create a blob URL for preview (we'll fetch it and create object URL).
				const response = await fetch(pdfUrl, {
					method: 'GET',
					headers: { 'Authorization': `Bearer ${token}` }
				})
				
				if (!response.ok) {
					throw new Error('Failed to load PDF preview')
				}
				
				const blob = await response.blob()
				const blobUrl = URL.createObjectURL(blob)
				setPreviewPdfUrl(blobUrl)
				setPreviewHtml(null) // clear HTML preview
			} else {
				// for DOCX, show HTML preview as similar representation.
				const response = await fetch(`${API_BASE_URL}/api/resume/html`, {
					method: 'GET',
					headers: { 'Authorization': `Bearer ${token}` }
				})

				if (!response.ok) {
					throw new Error('Failed to load preview')
				}

				const html = await response.text()
				setPreviewHtml(html)
				setPreviewPdfUrl(null) // clear PDF preview
			}
		} catch (error) {
			console.error('Error loading preview:', error)
			setPreviewError('Failed to load preview. Please try again.')
		}
	}
	
	// cleanup blob URL on unmount or format change.
	useEffect(() => {
		return () => {
			if (previewPdfUrl) {
				URL.revokeObjectURL(previewPdfUrl)
			}
		}
	}, [previewPdfUrl])

	// function to handle download.
	const handleDownload = async () => {
		setIsGenerating(true)
		try {
			if (resumeFormat === 'docx') {
				await generateResumeDOCX(docxTemplate)
			} else {
				await generateResumePDF()
			}
			// Success - file will download automatically
		} catch (error) {
			console.error('Error generating resume:', error)
			alert('Failed to generate resume. Please try again.')
		} finally {
			setIsGenerating(false)
		}
	}

	// function to handle back.
	const handleBack = () => {
		navigate('/home')
	}

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-cream">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
					<p className="text-gray-600">Loading preview...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-cream">
			{/* Header */}
			<header className="bg-brand-pink text-white py-4 shadow-md">
				<div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
					<h1 className="text-2xl font-bold">Resume Preview & Customization</h1>
					<button
						onClick={handleBack}
						className="px-4 py-2 bg-white-bright text-brand-pink font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						← Back to Home
					</button>
				</div>
			</header>

			{/* Main Content - Split Layout */}
			<main className="flex-1 flex overflow-hidden">
				{/* Left Sidebar - Customization */}
				<div className="w-80 bg-white-bright border-r border-gray-200 p-6 overflow-y-auto">
					<h2 className="text-xl font-bold mb-6 text-gray-900">Customization</h2>
					
					{/* Format Selection */}
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-3">Format</label>
						<div className="flex gap-2">
							<button
								onClick={() => setResumeFormat('pdf')}
								className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
									resumeFormat === 'pdf'
										? 'bg-brand-pink text-white'
										: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
								}`}
							>
								PDF
							</button>
							<button
								onClick={() => setResumeFormat('docx')}
								className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
									resumeFormat === 'docx'
										? 'bg-brand-pink text-white'
										: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
								}`}
							>
								Word (DOCX)
							</button>
						</div>
					</div>

					{/* Template Selection (only for DOCX) */}
					{resumeFormat === 'docx' && (
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-3">Template</label>
							<select
								value={docxTemplate}
								onChange={(e) => setDocxTemplate(e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
							>
								<option value="modern">Modern</option>
								<option value="classic">Classic</option>
							</select>
						</div>
					)}

					{/* Info Section */}
					<div className="mb-6 p-4 bg-gray-50 rounded-lg">
						<h3 className="text-sm font-semibold text-gray-900 mb-2">Preview Info</h3>
						{resumeFormat === 'pdf' ? (
							<p className="text-xs text-gray-600">
								The PDF preview shows exactly how your resume will appear when downloaded.
							</p>
						) : (
							<>
								<p className="text-xs text-gray-600 mb-2">
									<strong>Note:</strong> Word documents cannot be previewed in the browser. The HTML preview shown is a similar representation.
								</p>
								<p className="text-xs text-gray-600">
									Download the DOCX file to view it in Microsoft Word or Google Docs. The file will use the selected template styling.
								</p>
							</>
						)}
					</div>

					{/* Download Button */}
					<button
						onClick={handleDownload}
						disabled={isGenerating}
						className="w-full px-6 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isGenerating ? 'Generating...' : `Download ${resumeFormat.toUpperCase()}`}
					</button>

					{/* Quick Stats */}
					{profile && (
						<div className="mt-6 pt-6 border-t border-gray-200">
							<h3 className="text-sm font-semibold text-gray-900 mb-3">Your Resume Stats</h3>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-gray-600">Experiences:</span>
									<span className="font-medium text-gray-900">{profile.experiences?.length || 0}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Projects:</span>
									<span className="font-medium text-gray-900">{profile.projects?.length || 0}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Skills:</span>
									<span className="font-medium text-gray-900">{profile.skills?.length || 0}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Education:</span>
									<span className="font-medium text-gray-900">{profile.education?.length || 0}</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Right Side - Preview */}
				<div className="flex-1 flex flex-col bg-gray-100">
					{/* Preview Header */}
					<div className="bg-white-bright border-b border-gray-200 p-4">
						<h2 className="text-lg font-semibold text-gray-900">Preview</h2>
						{resumeFormat === 'pdf' ? (
							<p className="text-sm text-gray-600">PDF preview - This is how your resume will appear</p>
						) : (
							<p className="text-sm text-gray-600">
								HTML representation - DOCX files cannot be previewed in browser. Download to view in Word.
							</p>
						)}
					</div>

					{/* Preview Content */}
					<div className="flex-1 overflow-auto p-8 bg-gray-50">
						{previewError ? (
							<div className="h-full flex items-center justify-center">
								<div className="text-center">
									<p className="text-red-600 mb-4">{previewError}</p>
									<button
										onClick={loadPreview}
										className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:opacity-90"
									>
										Retry
									</button>
								</div>
							</div>
						) : resumeFormat === 'pdf' && previewPdfUrl ? (
							// PDF Preview
							<div className="max-w-4xl mx-auto bg-white shadow-lg" style={{ minHeight: '800px' }}>
								<iframe
									src={previewPdfUrl}
									title="PDF Resume Preview"
									className="w-full h-full border-0"
									style={{ minHeight: '800px' }}
									type="application/pdf"
								/>
							</div>
						) : resumeFormat === 'docx' && previewHtml ? (
							// DOCX - Show HTML as similar representation with notice
							<div className="max-w-4xl mx-auto">
								<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
									<p className="text-sm text-yellow-800">
										<strong>Note:</strong> Word documents (DOCX) cannot be previewed directly in the browser. 
										This HTML preview shows a similar representation. The actual DOCX file will have the selected 
										template styling and can be edited in Microsoft Word or Google Docs after downloading.
									</p>
								</div>
								<div className="bg-white shadow-lg" style={{ minHeight: '800px' }}>
									<iframe
										srcDoc={previewHtml}
										title="Resume Preview (HTML representation)"
										className="w-full h-full border-0"
										style={{ minHeight: '800px' }}
									/>
								</div>
							</div>
						) : previewHtml ? (
							// HTML Preview (fallback)
							<div className="max-w-4xl mx-auto bg-white shadow-lg" style={{ minHeight: '800px' }}>
								<iframe
									srcDoc={previewHtml}
									title="Resume Preview"
									className="w-full h-full border-0"
									style={{ minHeight: '800px' }}
								/>
							</div>
						) : (
							<div className="h-full flex items-center justify-center">
								<div className="text-center">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
									<p className="text-gray-600">Loading preview...</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	)
}

// export.
export default ResumePreview

