import React from 'react';

// helper function to convert ISO datetime string to date-only format (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    // If it's already in YYYY-MM-DD format, return as-is
    if (dateString.length === 10) return dateString
    // If it's an ISO datetime string (YYYY-MM-DDTHH:mm:ss), extract just the date part
    if (dateString.includes('T')) {
        return dateString.split('T')[0]
    }
    return dateString
}

// helper function to convert date string to ISO format (YYYY-MM-DDTHH:mm:ss)
// handles: YYYY-MM, YYYY-MM-DD, or already ISO format
const convertToISODate = (dateString) => {
    if (!dateString) return null
    // if already in ISO format, return as-is
    if (dateString.includes('T')) {
        return dateString
    }
    // if YYYY-MM format, convert to YYYY-MM-01T00:00:00
    if (dateString.length === 7) {
        return `${dateString}-01T00:00:00`
    }
    // if YYYY-MM-DD format, convert to YYYY-MM-DDTHH:mm:ss
    if (dateString.length === 10) {
        return `${dateString}T00:00:00`
    }
    // fallback: assume YYYY-MM format
    return `${dateString}-01T00:00:00`
}

// helper function to normalize empty strings to null
const normalizeValue = (value) => {
    if (value === '' || value === undefined) return null
    return value
}

// helper function to convert array description to bullet-point string
const normalizeDescription = (description) => {
    if (!description) return null
    if (Array.isArray(description)) {
        return description.length > 0 ? description.map(item => `• ${item}`).join('\n') : null
    }
    return description || null
}

// normalize education data for backend API
// handles both form data (startDate/endDate) and already-normalized data (start_date/end_date)
const normalizeEducationForBackend = (edu) => {
    // handle date fields - check both form format (startDate) and backend format (start_date)
    const startDate = edu.startDate || edu.start_date
    const endDate = edu.endDate || edu.end_date
    const isCurrent = edu.current || false
    
    // backend expects datetime (ISO with T); convert date-only strings (YYYY-MM-DD) to ISO
    const start_date = startDate ? convertToISODate(startDate) : null
    const end_date = isCurrent ? null : (endDate ? convertToISODate(endDate) : null)
    
    return {
        school: normalizeValue(edu.school),
        degree: normalizeValue(edu.degree),
        discipline: normalizeValue(edu.discipline),
        minor: normalizeValue(edu.minor),
        start_date: start_date,
        end_date: end_date,
        current: isCurrent,
        gpa: normalizeValue(edu.gpa),
        location: normalizeValue(edu.location),
        subsections: edu.subsections || null,
    }
}

// normalize experience data for backend API
// handles both form data (startDate/endDate) and already-normalized data (start_date/end_date)
const normalizeExperienceForBackend = (exp) => {
    // handle date fields - check both form format (startDate) and backend format (start_date)
    const startDate = exp.startDate || exp.start_date
    const endDate = exp.endDate || exp.end_date
    const isCurrent = exp.current || false
    
    // backend expects datetime (ISO with T); convert date-only strings (YYYY-MM-DD) to ISO
    const start_date = startDate ? convertToISODate(startDate) : null
    const end_date = isCurrent ? null : (endDate ? convertToISODate(endDate) : null)
    
    return {
        title: normalizeValue(exp.title),
        company: normalizeValue(exp.company),
        description: normalizeDescription(exp.description),
        start_date: start_date,
        end_date: end_date,
        current: isCurrent,
        location: normalizeValue(exp.location),
        skills: normalizeValue(exp.skills),
    }
}

// normalize project data for backend API
// handles both form data (techStack) and already-normalized data (tech_stack)
const normalizeProjectForBackend = (proj) => {
    // handle tech_stack - check both form format (techStack) and backend format (tech_stack)
    const techStack = proj.techStack || proj.tech_stack
    // backend expects: array with items, or null (not empty array)
    let tech_stack = null
    if (techStack) {
        if (Array.isArray(techStack) && techStack.length > 0) {
            tech_stack = techStack
        } else if (typeof techStack === 'string' && techStack.trim().length > 0) {
            // handle string format (comma-separated) - convert to array
            tech_stack = techStack.split(',').map(item => item.trim()).filter(item => item.length > 0)
            tech_stack = tech_stack.length > 0 ? tech_stack : null
        }
    }
    
    return {
        title: normalizeValue(proj.title),
        description: normalizeDescription(proj.description),
        tech_stack: tech_stack,
        url: normalizeValue(proj.url),
    }
}

// normalize skill data for backend API
const normalizeSkillForBackend = (skill) => {
    return {
        name: normalizeValue(skill.name),
        category: normalizeValue(skill.category),
    }
}

// filter out empty entries before sending to backend (avoids 422 on bulk endpoints)
const hasContent = (v) => v != null && String(v).trim() !== ''
const hasObjectContent = (obj) => obj && typeof obj === 'object' && Object.keys(obj).length > 0

// description can be string or array of bullets
const hasDescriptionContent = (d) => {
    if (!d) return false
    if (Array.isArray(d)) return d.some((x) => x != null && String(x).trim() !== '')
    return hasContent(d)
}

// Minimum requirements per section - entry must meet these to be saved / shown on resume
export const isValidEducation = (edu) =>
    hasContent(edu.school) || hasContent(edu.degree) || hasContent(edu.discipline) ||
    hasContent(edu.minor) || hasContent(edu.gpa) || hasContent(edu.location) ||
    hasContent(edu.startDate) || hasContent(edu.start_date) ||
    hasContent(edu.endDate) || hasContent(edu.end_date) || edu.current === true ||
    hasObjectContent(edu.subsections)

export const isValidExperience = (exp) =>
    hasContent(exp.title) && hasContent(exp.company) && hasDescriptionContent(exp.description)

export const isValidProject = (proj) => hasContent(proj.title)

export const isValidSkill = (skill) => hasContent(skill.name)

export const filterEmptyEducation = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidEducation)
}

export const filterEmptyExperiences = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidExperience)
}

export const filterEmptyProjects = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidProject)
}

export const filterEmptySkills = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.filter(isValidSkill)
}

export { 
    formatDateForInput, 
    convertToISODate,
    normalizeEducationForBackend,
    normalizeExperienceForBackend,
    normalizeProjectForBackend,
    normalizeSkillForBackend
};