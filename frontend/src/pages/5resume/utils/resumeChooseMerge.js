// Choose-from-profile: editor state is a *subset* of profile rows, but bulk profile saves
// replace the full collection. Merge edited rows by id with untouched rows from the snapshot.

import {
	formatDateForInput,
	normalizeEducationForBackend,
	normalizeExperienceForBackend,
	normalizeProjectForBackend,
} from '@/pages/utils/DataFormatting'

function mapBackendEducationToFrontend(edu) {
	return {
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
	}
}

function mapBackendExperienceToFrontend(exp) {
	return {
		id: exp.id,
		title: exp.title || '',
		company: exp.company || '',
		description: exp.description || '',
		start_date: formatDateForInput(exp.start_date),
		end_date: formatDateForInput(exp.end_date),
		current: exp.current || false,
		location: exp.location || '',
		skills: exp.skills || '',
	}
}

function mapBackendProjectToFrontend(proj) {
	return {
		id: proj.id,
		title: proj.title || '',
		description: proj.description || '',
		tech_stack: Array.isArray(proj.tech_stack) ? proj.tech_stack : proj.tech_stack ? [proj.tech_stack] : [],
		url: proj.url || '',
	}
}

/**
 * @param {Array} editedSubset - rows visible in the resume editor (may include new client-only ids)
 * @param {Array} fullBackendList - full list from getMyProfile before choose-time filtering
 * @returns {Array} payload for setupEducation (same length as full profile, plus any new rows)
 */
export function mergeEducationForChooseProfileSave(editedSubset, fullBackendList) {
	const edited = Array.isArray(editedSubset) ? editedSubset : []
	const full = Array.isArray(fullBackendList) ? fullBackendList : []
	const byId = new Map(edited.map((e) => [e.id, e]))
	const backendIds = new Set(full.map((r) => r.id).filter(Boolean))

	const mergedNorm = full.map((row) => {
		const fe = byId.has(row.id) ? byId.get(row.id) : mapBackendEducationToFrontend(row)
		return normalizeEducationForBackend(fe)
	})

	const appended = edited
		.filter((e) => e.id != null && !backendIds.has(e.id))
		.map((e) => normalizeEducationForBackend(e))

	return mergedNorm.concat(appended)
}

export function mergeExperienceForChooseProfileSave(editedSubset, fullBackendList) {
	const edited = Array.isArray(editedSubset) ? editedSubset : []
	const full = Array.isArray(fullBackendList) ? fullBackendList : []
	const byId = new Map(edited.map((e) => [e.id, e]))
	const backendIds = new Set(full.map((r) => r.id).filter(Boolean))

	const mergedNorm = full.map((row) => {
		const fe = byId.has(row.id) ? byId.get(row.id) : mapBackendExperienceToFrontend(row)
		return normalizeExperienceForBackend(fe)
	})

	const appended = edited
		.filter((e) => e.id != null && !backendIds.has(e.id))
		.map((e) => normalizeExperienceForBackend(e))

	return mergedNorm.concat(appended)
}

export function mergeProjectForChooseProfileSave(editedSubset, fullBackendList) {
	const edited = Array.isArray(editedSubset) ? editedSubset : []
	const full = Array.isArray(fullBackendList) ? fullBackendList : []
	const byId = new Map(edited.map((e) => [e.id, e]))
	const backendIds = new Set(full.map((r) => r.id).filter(Boolean))

	const mergedNorm = full.map((row) => {
		const fe = byId.has(row.id) ? byId.get(row.id) : mapBackendProjectToFrontend(row)
		return normalizeProjectForBackend(fe)
	})

	const appended = edited
		.filter((e) => e.id != null && !backendIds.has(e.id))
		.map((e) => normalizeProjectForBackend(e))

	return mergedNorm.concat(appended)
}
