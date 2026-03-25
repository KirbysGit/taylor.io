// utils / resumeDataInitializer.js

// Helper function to initialize resume data from backend API response.
// Transforms backend data format into frontend component format.

import { formatDateForInput } from '@/pages/utils/DataFormatting'

/**
 * Initialize resume data from backend API response
 * @param {Object} responseData - The response data from getMyProfile API
 * @param {Array} sectionOrder - The current section order
 * @returns {Object} Object containing all initialized data states
 */
export function initializeResumeDataFromBackend(responseData, sectionOrder = ['header', 'summary', 'education', 'experience', 'projects', 'skills']) {
	const userData = responseData.user
	const contact = responseData.contact || {}

	// Initialize header data - merge visibility and contactOrder from localStorage if saved previously
	const defaultVisibility = {
		showEmail: contact.show_email ?? true,
		showPhone: contact.show_phone ?? true,
		showLocation: contact.show_location ?? true,
		showLinkedin: contact.show_linkedin ?? true,
		showGithub: contact.show_github ?? true,
		showPortfolio: contact.show_portfolio ?? true,
		showTagline: true,
	}
	const savedVisibility = (() => {
		try {
			const v = localStorage.getItem('resumeHeaderVisibility')
			return v ? JSON.parse(v) : null
		} catch {
			return null
		}
	})()
	const savedContactOrder = (() => {
		try {
			const o = localStorage.getItem('resumeHeaderContactOrder')
			return o ? JSON.parse(o) : null
		} catch {
			return null
		}
	})()

	const initialHeader = {
		first_name: userData.first_name,
		last_name: userData.last_name,
		email: userData.email,
		phone: contact.phone || '',
		location: contact.location || '',
		linkedin: contact.linkedin || '',
		github: contact.github || '',
		portfolio: contact.portfolio || '',
		tagline: contact.tagline || '',
		visibility: { ...defaultVisibility, ...(savedVisibility || {}) },
		contactOrder: savedContactOrder || ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio'],
	}

	// Initialize education data (preserve id for React keys and sync logic)
	const initialEducation = (responseData.education || []).map(edu => ({
		id: edu.id,
		school: edu.school || '',
		degree: edu.degree || '',
		discipline: edu.discipline || '',
		location: edu.location || '',
		start_date: formatDateForInput(edu.start_date),
		end_date: formatDateForInput(edu.end_date),
		current: edu.current || false,
		gpa: edu.gpa || '',
		minor: edu.minor || '',
		subsections: edu.subsections || {},
	}))

	// Initialize experience data (preserve id for React keys and sync logic)
	const initialExperience = (responseData.experiences || []).map(exp => ({
		id: exp.id,
		title: exp.title || '',
		company: exp.company || '',
		description: exp.description || '',
		start_date: formatDateForInput(exp.start_date),
		end_date: formatDateForInput(exp.end_date),
		current: exp.current || false,
		location: exp.location || '',
		skills: exp.skills || '',
	}))

	// Initialize projects data (preserve id for React keys and sync logic)
	const initialProjects = (responseData.projects || []).map(proj => ({
		id: proj.id,
		title: proj.title || '',
		description: proj.description || '',
		tech_stack: Array.isArray(proj.tech_stack) ? proj.tech_stack : (proj.tech_stack ? [proj.tech_stack] : []),
		url: proj.url || '',
	}))

	const mapSkillRow = (skill, i, prefix = 'skill') => ({
		id: skill.id ?? `${prefix}-${Date.now()}-${i}`,
		name: skill.name || '',
		category: skill.category || '',
	})

	// Initialize skills data (preserve id for hide/show stability)
	const initialSkills = (responseData.skills || []).map((skill, i) => mapSkillRow(skill, i, 'skill'))

	// Hidden-for-this-resume skills (e.g. "Start fresh" puts all profile skills here)
	const initialHiddenSkills = (responseData.hiddenSkills || []).map((skill, i) => mapSkillRow(skill, i, 'skill'))

	// Initialize summary data
	const initialSummary = responseData.summary 
		? { summary: responseData.summary.summary || '' }
		: { summary: '' }

	// Create resume data object (hiddenSkills from API when provided, else [])
	const resumeData = {
		header: initialHeader,
		education: initialEducation,
		experience: initialExperience,
		projects: initialProjects,
		skills: initialSkills,
		hiddenSkills: initialHiddenSkills,
		summary: initialSummary,
		sectionVisibility: {
			summary: false, // hidden by default
			education: true,
			experience: true,
			projects: true,
			skills: true,
		},
		sectionOrder: sectionOrder,
	}

	return {
		user: userData,
		headerData: initialHeader,
		educationData: initialEducation,
		experienceData: initialExperience,
		projectsData: initialProjects,
		skillsData: initialSkills,
		summaryData: initialSummary,
		resumeData,
	}
}

/**
 * Initialize resume data with optional selection (for "Choose from profile" flow)
 * or empty experience/projects (for "Start fresh" flow).
 * @param {Object} responseData - The response data from getMyProfile API
 * @param {Array} sectionOrder - The current section order
 * @param {Object} options - { selectedEducationIds, selectedExperienceIds, selectedProjectIds } for choose; or { startFresh: true }
 */
export function initializeResumeDataWithOptions(responseData, sectionOrder, options = {}) {
	const { selectedEducationIds, selectedExperienceIds, selectedProjectIds, startFresh } = options

	let data = { ...responseData }
	if (startFresh) {
		// Empty sections; keep profile skills only under hiddenSkills so the resume starts with nothing visible to add
		const profileSkills = responseData.skills || []
		data = {
			...data,
			education: [],
			experiences: [],
			projects: [],
			skills: [],
			hiddenSkills: profileSkills,
		}
	} else if (selectedEducationIds || selectedExperienceIds || selectedProjectIds) {
		if (selectedEducationIds && selectedEducationIds.length >= 0) {
			data.education = (responseData.education || []).filter((e) =>
				selectedEducationIds.includes(e.id)
			)
		}
		if (selectedExperienceIds && selectedExperienceIds.length >= 0) {
			data.experiences = (responseData.experiences || []).filter((e) =>
				selectedExperienceIds.includes(e.id)
			)
		}
		if (selectedProjectIds && selectedProjectIds.length >= 0) {
			data.projects = (responseData.projects || []).filter((p) =>
				selectedProjectIds.includes(p.id)
			)
		}
	}
	return initializeResumeDataFromBackend(data, sectionOrder)
}
