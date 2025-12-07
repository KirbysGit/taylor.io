// pages/5resume/ResumePreview.jsx

// resume preview and customization page.

// imports.
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { generateResumePDF, generateResumeDOCX, listTemplates } from '@/api/services/resume'
import { getMyProfile, upsertContact } from '@/api/services/profile'
import { API_BASE_URL } from '@/api/api'
import HeaderFieldsPanel from './components/HeaderFieldsPanel'
import ResumeStylingPanel from './components/ResumeStylingPanel'

// ----------- main component -----------

function ResumePreview() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	
	// get initial template from URL params or defaults.
	const initialTemplate = searchParams.get('template') || 'testing'
	
	const [profile, setProfile] = useState(null)
	const [template, setTemplate] = useState(initialTemplate) // template for resume
	const [availableTemplates, setAvailableTemplates] = useState(['Testing']) // available templates
	const [isGenerating, setIsGenerating] = useState(false)
	const [isLoadingPreview, setIsLoadingPreview] = useState(true) // loading state for preview only
	const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
	const [previewError, setPreviewError] = useState(null)
	const [isSavingHeader, setIsSavingHeader] = useState(false)
	const lastPreviewKeyRef = useRef(null)
	const [activeTab, setActiveTab] = useState('style') // 'style' | 'data'

// header fields + visibility
const [headerFields, setHeaderFields] = useState({
	name: '',
	email: '',
	github: '',
	linkedin: '',
	portfolio: '',
	phone_number: '',
	location: ''
})
const [headerVisibility, setHeaderVisibility] = useState({
	name: true,
	email: true,
	github: true,
	linkedin: true,
	portfolio: true,
	phone_number: true,
	location: true
})
// ordering of header pills
const [headerOrder, setHeaderOrder] = useState([
	'phone_number',
	'email',
	'github',
	'linkedin',
	'portfolio',
	'location',
])
const [headerAlignment, setHeaderAlignment] = useState('center') // left | center | right
const [fontFamily, setFontFamily] = useState('Calibri')
const [educationFields, setEducationFields] = useState({
	school: '',
	degree: '',
	field: '',
	location: '',
	date: '',
	gpa: '',
	honors: '',
	clubs: '',
	coursework: ''
})

// margins and header alignment
const [marginPreset, setMarginPreset] = useState('normal') // normal | narrow | wide | custom
const [marginCustom, setMarginCustom] = useState({
	top: '0.6',
	right: '0.6',
	bottom: '0.6',
	left: '0.6'
})

const stripProtocol = (value) => (value || '').replace(/^https?:\/\//i, '')

// build overrides for preview/download (non-destructive): header + margins
const buildOverrides = () => {
	const map = {}
	const fields = [
		{ key: 'name', value: headerFields.name },
		{ key: 'email', value: headerFields.email },
		{ key: 'github', value: stripProtocol(headerFields.github) },
		{ key: 'linkedin', value: stripProtocol(headerFields.linkedin) },
		{ key: 'portfolio', value: stripProtocol(headerFields.portfolio) },
		{ key: 'phone', value: headerFields.phone_number },
		{ key: 'location', value: headerFields.location },
	]

	fields.forEach(({ key, value }) => {
		const visible =
			key === 'phone'
				? headerVisibility.phone_number
				: headerVisibility[key] ?? true
		map[key] = visible ? (value ?? '') : '' // send empty string to hide when not visible
	})
	map.header_order = Array.isArray(headerOrder) ? headerOrder.join(',') : headerOrder
	map.header_alignment = headerAlignment
	map.font_family = fontFamily

	// education overrides (single-entry template)
	const eduDegree = [educationFields.degree, educationFields.field].filter(Boolean).join(' ')
	map.edu_name = educationFields.school
	map.edu_degree = eduDegree
	map.edu_location = educationFields.location
	map.edu_gpa = educationFields.gpa
	map.edu_date = educationFields.date
	map.edu_honors = educationFields.honors
	map.edu_clubs = educationFields.clubs
	map.edu_coursework = educationFields.coursework

	const presetMargins = {
		extraNarrow: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 },
		narrow: { top: 0.35, right: 0.35, bottom: 0.35, left: 0.35 },
		normal: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
		wide: { top: 0.65, right: 0.65, bottom: 0.65, left: 0.65 }
	};

	if (marginPreset === 'custom') {
		map.margin_top = marginCustom.top || ''
		map.margin_right = marginCustom.right || ''
		map.margin_bottom = marginCustom.bottom || ''
		map.margin_left = marginCustom.left || ''
	} else {
		const m = presetMargins[marginPreset] ?? presetMargins.normal
		map.margin_top = m.top
		map.margin_right = m.right
		map.margin_bottom = m.bottom
		map.margin_left = m.left
	}

	return map
	}

// simple heuristic to warn when header contact line may overflow (includes prefixes)
const isHeaderOverflowing = () => {
	const prefixMap = {
		github: 'https://github.com/',
		linkedin: 'https://linkedin.com/in/',
		portfolio: 'https://',
	}
	const withPrefix = (key, value) => {
		if (!value) return ''
		const prefix = prefixMap[key]
		if (!prefix) return value
		return value.startsWith(prefix) ? value : `${prefix}${value}`
	}

	const parts = []
	if (headerVisibility.phone_number && headerFields.phone_number) parts.push(headerFields.phone_number)
	if (headerVisibility.email && headerFields.email) parts.push(headerFields.email)
	if (headerVisibility.github && headerFields.github) parts.push(withPrefix('github', headerFields.github))
	if (headerVisibility.linkedin && headerFields.linkedin) parts.push(withPrefix('linkedin', headerFields.linkedin))
	if (headerVisibility.portfolio && headerFields.portfolio) parts.push(withPrefix('portfolio', headerFields.portfolio))
	if (headerVisibility.location && headerFields.location) parts.push(headerFields.location)
	// estimate length including separators
	const estimated = parts.join(' | ')

	// thresholds tuned per margin preset
	const thresholds = {
		// smaller margin → more space → higher threshold
		extraNarrow: 135, // ≈0.25"
		narrow: 120,      // ≈0.35"
		normal: 105,      // ≈0.5"
		wide: 90,         // ≈0.65"
		custom: 105,
	}
	const limit = thresholds[marginPreset] ?? thresholds.normal
	return estimated.length > limit
}

	// guard so fetchData only runs once even under React.StrictMode in dev.
	const hasFetchedInitialData = useRef(false)

	// fetch profile and templates on mount (page loads immediately).
	useEffect(() => {
		// prevent double-fetch in React.StrictMode (dev) by guarding with a ref.
		if (hasFetchedInitialData.current) {
			return
		}
		hasFetchedInitialData.current = true

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
				const profileData = response.data || {}
				setProfile(profileData)

				const userInfo = profileData.user || {}
				const contact = profileData.contact || {}
		const edu0 = (profileData.education && profileData.education[0]) || {}
		const fmtDate = (start, end, current) => {
			const toText = (d) => {
				if (!d) return ''
				const dt = new Date(d)
				return dt.toLocaleString('en-US', { month: 'short', year: 'numeric' })
			}
			const s = toText(start)
			const e = toText(end) || (current ? 'Present' : '')
			if (s && e) return `${s} – ${e}`
			return s || e || ''
		}
				// prefill header fields from profile/contact
				setHeaderFields((prev) => ({
					...prev,
					name: userInfo.name || prev.name,
					email: contact.email || userInfo.email || prev.email,
					github: contact.github || prev.github,
					linkedin: contact.linkedin || prev.linkedin,
					portfolio: contact.portfolio || prev.portfolio,
					phone_number: contact.phone || prev.phone_number,
					location: userInfo.location || contact.location || profileData.location || prev.location
				}))
		// prefill education fields from first education entry
		setEducationFields((prev) => ({
			...prev,
			school: edu0.school || prev.school,
			degree: edu0.degree || prev.degree,
			field: edu0.field || prev.field,
			location: edu0.location || prev.location,
			date: fmtDate(edu0.start_date, edu0.end_date, edu0.current),
			gpa: edu0.gpa || prev.gpa,
			honors: edu0.honors_awards || prev.honors,
			clubs: edu0.clubs_extracurriculars || prev.clubs,
			coursework: edu0.relevant_coursework || prev.coursework
		}))
				
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
		if (!profile) return

		const overrides = buildOverrides()
		const keyParts = [
			template || '',
			profile?.user?.id || '',
			profile?.user?.name || '',
			profile?.contact?.email || '',
			profile?.contact?.github || '',
			profile?.contact?.linkedin || '',
			profile?.contact?.portfolio || '',
			profile?.contact?.phone || '',
			overrides.name || '',
			overrides.email || '',
			overrides.github || '',
			overrides.linkedin || '',
			overrides.portfolio || '',
			overrides.phone || '',
			overrides.location || '',
			overrides.header_order || '',
			overrides.header_alignment || '',
			overrides.font_family || '',
			overrides.edu_name || '',
			overrides.edu_degree || '',
			overrides.edu_location || '',
			overrides.edu_gpa || '',
			overrides.edu_date || '',
			overrides.edu_honors || '',
			overrides.edu_clubs || '',
			overrides.edu_coursework || '',
			overrides.margin_top || '',
			overrides.margin_right || '',
			overrides.margin_bottom || '',
			overrides.margin_left || '',
		]
		const key = keyParts.join('|')
		if (lastPreviewKeyRef.current === key) {
			return
		}
		lastPreviewKeyRef.current = key
		loadPreview()
	}, [template, profile, headerAlignment, headerOrder, fontFamily, educationFields])

	// function to load PDF preview.
	const loadPreview = async () => {
		try {
			setPreviewError(null)
			setIsLoadingPreview(true)
			const token = localStorage.getItem('token')
			
			// always show PDF preview (generated from template) with header overrides
			const params = new URLSearchParams({
				template: template,
				preview: 'true',
			})
			const overrides = buildOverrides()
		// map UI keys to API expectations before appending
		Object.entries(overrides).forEach(([k, v]) => {
			if (v === undefined || v === null) return
			const key = k === 'header_alignment' ? 'header_align' : k
			params.append(key, v)
		})
			const pdfUrl = `${API_BASE_URL}/api/resume/pdf?${params.toString()}`
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

	// manual refresh for PDF after edits
	const handleRefreshPDF = () => {
		loadPreview()
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
			await generateResumePDF(template, buildOverrides())
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
			await generateResumeDOCX(template, buildOverrides())
			// Success - file will download automatically
		} catch (error) {
			console.error('Error generating DOCX:', error)
			alert('Failed to generate DOCX. Please try again.')
		} finally {
			setIsGenerating(false)
		}
	}

	// header editor helpers (inline)
	const handleHeaderFieldChange = (field, value) => {
		setHeaderFields((prev) => ({ ...prev, [field]: value }))
	}

const handleEducationFieldChange = (field, value) => {
	setEducationFields((prev) => ({ ...prev, [field]: value }))
}

	const toggleHeaderVisibility = (field) => {
		setHeaderVisibility((prev) => ({ ...prev, [field]: !prev[field] }))
	}

	const handleReorderHeader = (fromKey, toKey) => {
		if (fromKey === toKey) return
		// keep name locked
		if (fromKey === 'name' || toKey === 'name') return
		setHeaderOrder((prev) => {
			const filtered = prev.filter((k) => k !== fromKey)
			const idx = filtered.indexOf(toKey)
			if (idx === -1) {
				return [...filtered, fromKey]
			}
			return [
				...filtered.slice(0, idx),
				fromKey,
				...filtered.slice(idx),
			]
		})
	}

	const handleSaveHeader = async () => {
		setIsSavingHeader(true)
		try {
			// map visible fields to payload; hidden fields are omitted (non-destructive)
			const payload = {}
			if (headerVisibility.email) payload.email = headerFields.email
			if (headerVisibility.github) payload.github = headerFields.github
			if (headerVisibility.linkedin) payload.linkedin = headerFields.linkedin
			if (headerVisibility.portfolio) payload.portfolio = headerFields.portfolio
			if (headerVisibility.phone_number) payload.phone = headerFields.phone_number

			const res = await upsertContact(payload)
			const updatedContact = res.data || payload

			// update local profile cache
			setProfile((prev) =>
				prev
					? {
							...prev,
							contact: {
								...(prev.contact || {}),
								...updatedContact
							}
					  }
					: prev
			)

			// refresh PDF to reflect saved header
			// useEffect on `profile` will trigger loadPreview
		} catch (error) {
			console.error('Error saving header:', error)
			alert('Failed to save header. Please try again.')
		} finally {
			setIsSavingHeader(false)
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
				<div className="w-[38rem] bg-white-bright border-r border-gray-200 p-6 overflow-y-auto">
					<h2 className="text-xl font-bold mb-6 text-gray-900">Customization</h2>

					{/* Tabs */}
					<div className="mb-6 flex gap-2">
						{[
							{ key: 'style', label: 'Styling' },
							{ key: 'data', label: 'Header data' },
						].map((tab) => (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key)}
								className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
									activeTab === tab.key
										? 'bg-brand-pink text-white border-brand-pink'
										: 'bg-white text-gray-700 border-gray-300 hover:border-brand-pink'
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>

					{activeTab === 'style' && (
						<>
							<ResumeStylingPanel
								template={template}
								availableTemplates={availableTemplates}
								onTemplateChange={setTemplate}
								headerAlignment={headerAlignment}
								onHeaderAlignmentChange={setHeaderAlignment}
								marginPreset={marginPreset}
								onMarginPresetChange={setMarginPreset}
								marginCustom={marginCustom}
								onMarginCustomChange={setMarginCustom}
								fontFamily={fontFamily}
								onFontFamilyChange={setFontFamily}
							/>
						</>
					)}

					{activeTab === 'data' && (
						<>
							<HeaderFieldsPanel
								headerFields={headerFields}
								headerVisibility={headerVisibility}
								headerOrder={headerOrder}
								onFieldChange={handleHeaderFieldChange}
								onToggleVisibility={toggleHeaderVisibility}
								onReorder={handleReorderHeader}
							/>

							<div className="mt-6 mb-4">
								<h3 className="text-sm font-semibold text-gray-900 mb-3">Education data</h3>
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">School</label>
											<input
												type="text"
												value={educationFields.school}
												onChange={(e) => handleEducationFieldChange('school', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">Location</label>
											<input
												type="text"
												value={educationFields.location}
												onChange={(e) => handleEducationFieldChange('location', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">Degree</label>
											<input
												type="text"
												value={educationFields.degree}
												onChange={(e) => handleEducationFieldChange('degree', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">Field</label>
											<input
												type="text"
												value={educationFields.field}
												onChange={(e) => handleEducationFieldChange('field', e.target.value)}
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">Date range</label>
											<input
												type="text"
												value={educationFields.date}
												onChange={(e) => handleEducationFieldChange('date', e.target.value)}
												placeholder="Aug 2021 – May 2025"
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
										<div className="flex flex-col">
											<label className="text-sm text-gray-700 mb-1">GPA</label>
											<input
												type="text"
												value={educationFields.gpa}
												onChange={(e) => handleEducationFieldChange('gpa', e.target.value)}
												placeholder="3.8 / 4.0"
												className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
											/>
										</div>
									</div>
									<div className="flex flex-col">
										<label className="text-sm text-gray-700 mb-1">Honors & Awards</label>
										<textarea
											value={educationFields.honors}
											onChange={(e) => handleEducationFieldChange('honors', e.target.value)}
											rows={2}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										/>
									</div>
									<div className="flex flex-col">
										<label className="text-sm text-gray-700 mb-1">Clubs & Extracurriculars</label>
										<textarea
											value={educationFields.clubs}
											onChange={(e) => handleEducationFieldChange('clubs', e.target.value)}
											rows={2}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										/>
									</div>
									<div className="flex flex-col">
										<label className="text-sm text-gray-700 mb-1">Relevant Coursework</label>
										<textarea
											value={educationFields.coursework}
											onChange={(e) => handleEducationFieldChange('coursework', e.target.value)}
											rows={2}
											className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
										/>
									</div>
								</div>
							</div>

							{isHeaderOverflowing() && (
								<div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
									Looks like the contact line may overflow. We recommend keeping it on one line; you can shorten fields or hide some items, or continue as-is.
								</div>
							)}

							<div className="mb-6 flex justify-end">
								<button
									type="button"
									onClick={handleSaveHeader}
									disabled={isSavingHeader}
									className="px-4 py-2 bg-brand-pink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSavingHeader ? 'Saving...' : 'Save header'}
								</button>
							</div>
						</>
					)}

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
						<div className="flex items-center justify-between gap-4">
							<div>
								<h2 className="text-lg font-semibold text-gray-900">Preview</h2>
								<p className="text-sm text-gray-600">PDF preview - This is how your resume will appear</p>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={handleRefreshPDF}
									disabled={isLoadingPreview}
									className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
								>
									Refresh PDF
								</button>
								<button
									onClick={handleDownloadPDF}
									disabled={isGenerating}
									className="px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
								>
									{isGenerating ? 'Generating...' : 'Download PDF'}
								</button>
								<button
									onClick={handleDownloadDOCX}
									disabled={isGenerating}
									className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
								>
									{isGenerating ? 'Generating...' : 'Download DOCX'}
								</button>
							</div>
						</div>
					</div>

					{/* Preview Content */}
					<div className="flex-1 overflow-auto px-6 py-8 bg-gray-50 relative">
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
