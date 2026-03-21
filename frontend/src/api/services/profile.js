// services / profile.js

// profile-related api calls (experiences, projects, skills, education).

// services.
import { apiRequest } from '../api'

// get current user's full profile.
export async function getMyProfile() {
	return apiRequest('/api/profile/me', {
		method: 'GET',
	})
}

// create or update contact info (header section)
export async function upsertContact(contactData) {
	return apiRequest('/api/profile/contact', {
		method: 'POST',
		body: JSON.stringify(contactData),
	})
}

// create education.
export async function createEducation(educationData) {
	return apiRequest('/api/profile/education', {
		method: 'POST',
		body: JSON.stringify(educationData),
	})
}

// create experience.
export async function createExperience(experienceData) {
	return apiRequest('/api/profile/experiences', {
		method: 'POST',
		body: JSON.stringify(experienceData),
	})
}

// create project.
export async function createProject(projectData) {
	return apiRequest('/api/profile/projects', {
		method: 'POST',
		body: JSON.stringify(projectData),
	})
}

// create skill.
export async function createSkill(skillData) {
	return apiRequest('/api/profile/skills', {
		method: 'POST',
		body: JSON.stringify(skillData),
	})
}

// bulk create experiences.
export async function setupExperiences(experiencesData) {
	return apiRequest('/api/profile/experiences/bulk', {
		method: 'POST',
		body: JSON.stringify(experiencesData),
	})
}

// bulk create projects.
export async function setupProjects(projectsData) {
	return apiRequest('/api/profile/projects/bulk', {
		method: 'POST',
		body: JSON.stringify(projectsData),
	})
}

// bulk create skills.
export async function setupSkills(skillsData) {
	return apiRequest('/api/profile/skills/bulk', {
		method: 'POST',
		body: JSON.stringify(skillsData),
	})
}

// create summary.
export async function createSummary(summaryData) {
	return apiRequest('/api/profile/summary', {
		method: 'POST',
		body: JSON.stringify(summaryData),
	})
}

// bulk create education.
export async function setupEducation(educationData) {
	return apiRequest('/api/profile/education/bulk', {
		method: 'POST',
		body: JSON.stringify(educationData),
	})
}

// update section labels (per-user section header overrides)
export async function updateSectionLabels(sectionLabels) {
	return apiRequest('/api/profile/section-labels', {
		method: 'POST',
		body: JSON.stringify({ section_labels: sectionLabels }),
	})
}

// attach resume metadata (after upload)
export async function attachResume(filename) {
	return apiRequest('/api/profile/attached-resume', {
		method: 'POST',
		body: JSON.stringify({ filename }),
	})
}

// detach resume (clear metadata only)
export async function detachResume() {
	return apiRequest('/api/profile/attached-resume', {
		method: 'DELETE',
	})
}

// --------- saved resumes (preview snapshots) ---------

export async function listSavedResumes() {
	return apiRequest('/api/profile/saved-resumes', { method: 'GET' })
}

export async function createSavedResume(name, resumeData, template = null) {
	return apiRequest('/api/profile/saved-resumes', {
		method: 'POST',
		body: JSON.stringify({ name, resume_data: resumeData, template }),
	})
}

export async function getSavedResume(id) {
	return apiRequest(`/api/profile/saved-resumes/${id}`, { method: 'GET' })
}

export async function deleteSavedResume(id) {
	return apiRequest(`/api/profile/saved-resumes/${id}`, { method: 'DELETE' })
}

