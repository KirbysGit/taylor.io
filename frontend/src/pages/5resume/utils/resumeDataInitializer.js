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

	// Initialize header data
	const initialHeader = {
		first_name: userData.first_name,
		last_name: userData.last_name,
		email: userData.email,
		phone: contact.phone || '',
		location: contact.location || '',
		linkedin: contact.linkedin || '',
		github: contact.github || '',
		portfolio: contact.portfolio || '',
		visibility: {
			showEmail: contact.show_email ?? true,
			showPhone: contact.show_phone ?? true,
			showLocation: contact.show_location ?? true,
			showLinkedin: contact.show_linkedin ?? true,
			showGithub: contact.show_github ?? true,
			showPortfolio: contact.show_portfolio ?? true,
		},
		// Default contact ordering (includes email)
		contactOrder: ['email', 'phone', 'location', 'linkedin', 'github', 'portfolio'],
	}

	// Initialize education data
	const initialEducation = (responseData.education || []).map(edu => ({
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

	// Initialize experience data
	const initialExperience = (responseData.experiences || []).map(exp => ({
		title: exp.title || '',
		company: exp.company || '',
		description: exp.description || '',
		start_date: formatDateForInput(exp.start_date),
		end_date: formatDateForInput(exp.end_date),
		current: exp.current || false,
		location: exp.location || '',
		skills: exp.skills || '',
	}))

	// Initialize projects data
	const initialProjects = (responseData.projects || []).map(proj => ({
		title: proj.title || '',
		description: proj.description || '',
		tech_stack: Array.isArray(proj.tech_stack) ? proj.tech_stack : (proj.tech_stack ? [proj.tech_stack] : []),
		url: proj.url || '',
	}))

	// Initialize skills data
	const initialSkills = (responseData.skills || []).map(skill => ({
		name: skill.name || '',
		category: skill.category || '',
	}))

	// Initialize summary data
	const initialSummary = responseData.summary 
		? { summary: responseData.summary.summary || '' }
		: { summary: '' }

	// Create resume data object
	const resumeData = {
		header: initialHeader,
		education: initialEducation,
		experience: initialExperience,
		projects: initialProjects,
		skills: initialSkills,
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
