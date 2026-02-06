// Utility functions to transform data between Info.jsx format and Step component format

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

// Convert backend date to month format (YYYY-MM)
export const toMonthInput = (value) => {
	if (!value) return ''
	return String(value).slice(0, 7)
}

// Convert month format to ISO date for backend
export const monthToISO = (monthValue) => {
	if (!monthValue) return null
	return `${monthValue}-01T00:00:00`
}

// Transform education from backend format to step format
export const transformEducationForStep = (edu) => {
	return {
		id: edu.id || newId(),
		school: edu.school || '',
		degree: edu.degree || '',
		discipline: edu.discipline || edu.field || '',
		minor: edu.minor || '',
		location: edu.location || '',
		startDate: toMonthInput(edu.start_date),
		endDate: toMonthInput(edu.end_date),
		current: edu.current || false,
		gpa: edu.gpa || '',
		subsections: edu.subsections || {},
	}
}

// Transform education from step format to backend format
export const transformEducationForBackend = (edu) => {
	return {
		...edu,
		start_date: edu.startDate ? monthToISO(edu.startDate) : null,
		end_date: edu.current ? null : (edu.endDate ? monthToISO(edu.endDate) : null),
		startDate: undefined,
		endDate: undefined,
	}
}

// Transform experience from backend format to step format
export const transformExperienceForStep = (exp) => {
	return {
		id: exp.id || newId(),
		title: exp.title || '',
		company: exp.company || '',
		description: exp.description || '',
		startDate: toMonthInput(exp.start_date),
		endDate: toMonthInput(exp.end_date),
		current: exp.current || false,
		location: exp.location || '',
		skills: exp.skills || '',
	}
}

// Transform experience from step format to backend format
export const transformExperienceForBackend = (exp) => {
	return {
		...exp,
		start_date: exp.startDate ? monthToISO(exp.startDate) : null,
		end_date: exp.current ? null : (exp.endDate ? monthToISO(exp.endDate) : null),
		startDate: undefined,
		endDate: undefined,
	}
}

// Transform project from backend format to step format
export const transformProjectForStep = (proj) => {
	return {
		id: proj.id || newId(),
		title: proj.title || '',
		description: proj.description || '',
		techStack: Array.isArray(proj.tech_stack) 
			? proj.tech_stack 
			: (proj.tech_stack ? proj.tech_stack.split(',').map(t => t.trim()).filter(Boolean) : []),
		url: proj.url || '',
	}
}

// Transform project from step format to backend format
export const transformProjectForBackend = (proj) => {
	return {
		...proj,
		tech_stack: Array.isArray(proj.techStack) && proj.techStack.length > 0 
			? proj.techStack 
			: null,
		techStack: undefined,
	}
}

// Transform skill from backend format to step format
export const transformSkillForStep = (skill) => {
	return {
		id: skill.id || newId(),
		name: skill.name || '',
		category: skill.category || '',
	}
}
