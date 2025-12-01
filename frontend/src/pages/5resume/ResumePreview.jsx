// pages/5resume/ResumePreview.jsx

// resume preview and customization page.

// imports.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateResumePDF, generateResumeDOCX, listTemplates } from '@/api/services/resume'
import { getMyProfile } from '@/api/services/profile'
import { API_BASE_URL } from '@/api/api'

// ----------- main component -----------

function ResumePreview() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	
	// get initial template from URL params or defaults.
	const initialTemplate = searchParams.get('template') || 'main'
	
	const [profile, setProfile] = useState(null)
	const [template, setTemplate] = useState(initialTemplate) // template for resume
	const [availableTemplates, setAvailableTemplates] = useState(['main']) // available templates
	const [isGenerating, setIsGenerating] = useState(false)
	const [isLoadingPreview, setIsLoadingPreview] = useState(true) // loading state for preview only
	const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
	const [previewError, setPreviewError] = useState(null)

	// fetch profile and templates on mount (page loads immediately).
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
				
				// fetch available templates.
				const templatesResponse = await listTemplates()
				if (templatesResponse?.data?.templates) {
					setAvailableTemplates(templatesResponse.data.templates)
					// if current template not in list, use first available
					if (!templatesResponse.data.templates.includes(initialTemplate)) {
						setTemplate(templatesResponse.data.templates[0] || 'main')
					}
				}
				// Note: Preview will be loaded by the useEffect that watches template/profile
			} catch (error) {
				console.error('Error fetching data:', error)
				setPreviewError('Failed to load preview')
				setIsLoadingPreview(false)
			}
		}

		fetchData()
	}, [])

	// load/reload preview when template or profile changes.
	useEffect(() => {
		if (profile) {
			loadPreview()
		}
	}, [template, profile])

	// function to load PDF preview.
	const loadPreview = async () => {
		try {
			setPreviewError(null)
			setIsLoadingPreview(true)
			const token = localStorage.getItem('token')
			
			// always show PDF preview (generated from template).
			const pdfUrl = `${API_BASE_URL}/api/resume/pdf?template=${encodeURIComponent(template)}&preview=true`
			const response = await fetch(pdfUrl, {
				method: 'GET',
				headers: { 'Authorization': `Bearer ${token}` }
			})

			if (!response.ok) {
				throw new Error('Failed to load preview')
			}

			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			setPreviewPdfUrl(blobUrl)
		} catch (error) {
			console.error('Error loading preview:', error)
			setPreviewError('Failed to load preview. Please try again.')
		} finally {
			setIsLoadingPreview(false)
		}
	}
	
	// cleanup blob URL on unmount or when preview URL changes.
	useEffect(() => {
		return () => {
			if (previewPdfUrl) {
				URL.revokeObjectURL(previewPdfUrl)
			}
		}
	}, [previewPdfUrl])

	// function to handle PDF download.
	const handleDownloadPDF = async () => {
		setIsGenerating(true)
		try {
			await generateResumePDF(template)
			// Success - file will download automatically
		} catch (error) {
			console.error('Error generating PDF:', error)
			alert('Failed to generate PDF. Please try again.')
		} finally {
			setIsGenerating(false)
		}
	}

	// function to handle DOCX download.
	const handleDownloadDOCX = async () => {
		setIsGenerating(true)
		try {
			await generateResumeDOCX(template)
			// Success - file will download automatically
		} catch (error) {
			console.error('Error generating DOCX:', error)
			alert('Failed to generate DOCX. Please try again.')
		} finally {
			setIsGenerating(false)
		}
	}

	// function to handle back.
	const handleBack = () => {
		navigate('/home')
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
					
					{/* Template Selection */}
					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700 mb-3">Template</label>
						<select
							value={template}
							onChange={(e) => setTemplate(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
						>
							{availableTemplates.map(t => (
								<option key={t} value={t}>
									{t.charAt(0).toUpperCase() + t.slice(1)}
								</option>
							))}
						</select>
					</div>

					{/* Info Section */}
					<div className="mb-6 p-4 bg-gray-50 rounded-lg">
						<h3 className="text-sm font-semibold text-gray-900 mb-2">Preview Info</h3>
						<p className="text-xs text-gray-600">
							The PDF preview shows exactly how your resume will appear. Both PDF and DOCX downloads use the same template styling.
						</p>
					</div>

					{/* Download Buttons */}
					<div className="space-y-3">
						<button
							onClick={handleDownloadPDF}
							disabled={isGenerating}
							className="w-full px-6 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isGenerating ? 'Generating...' : 'Download PDF'}
						</button>
						<button
							onClick={handleDownloadDOCX}
							disabled={isGenerating}
							className="w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isGenerating ? 'Generating...' : 'Download Word (DOCX)'}
						</button>
					</div>

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
						<p className="text-sm text-gray-600">PDF preview - This is how your resume will appear</p>
					</div>

					{/* Preview Content */}
					<div className="flex-1 overflow-auto p-8 bg-gray-50 relative">
						{isLoadingPreview ? (
							<div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
								<div className="text-center">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
									<p className="text-gray-600">Loading preview...</p>
								</div>
							</div>
						) : previewError ? (
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
						) : previewPdfUrl ? (
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
						) : null}
					</div>
				</div>
			</main>
		</div>
	)
}

// export.
export default ResumePreview
