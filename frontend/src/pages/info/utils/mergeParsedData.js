// Merge parsed resume data into Info page state with deduplication.
// Contact: parsed always overwrites.
// Summary: append only if current is empty.
// Education, Experience, Projects, Skills: dedupe by key, add only new items.

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalize = (s) => (s || '').toString().trim().toLowerCase()

// Keys for deduplication
const eduKey = (e) => `${normalize(e.school)}|${normalize(e.degree)}|${normalize(e.discipline || e.field)}`
const expKey = (e) => `${normalize(e.company)}|${normalize(e.title)}|${normalize(e.startDate)}`
const projKey = (p) => normalize(p.title)
const skillKey = (s) => `${normalize(s.name)}|${normalize(s.category || '')}`

// Convert parsed description (array or string) to string
const descToString = (d) => {
	if (!d) return ''
	if (Array.isArray(d)) return d.filter(Boolean).join('\n')
	return String(d)
}

/**
 * Merge parsed resume data into existing Info state.
 * @param {Object} parsed - Response from parseResumeMerge
 * @param {Object} existing - Current state { contact, education, experiences, projects, skills, summary }
 * @returns {{ merged, counts }} - merged state and counts of added items per section
 */
export function mergeParsedData(parsed, existing) {
	const counts = { education: 0, experiences: 0, projects: 0, skills: 0 }

	// Contact: parsed always overwrites
	const contact = {
		...existing.contact,
		email: parsed.contact_info?.email ?? existing.contact?.email ?? '',
		phone: parsed.contact_info?.phone ?? existing.contact?.phone ?? '',
		github: parsed.contact_info?.github ?? existing.contact?.github ?? '',
		linkedin: parsed.contact_info?.linkedin ?? existing.contact?.linkedin ?? '',
		portfolio: parsed.contact_info?.portfolio ?? existing.contact?.portfolio ?? '',
		location: parsed.contact_info?.location ?? existing.contact?.location ?? '',
	}

	// Summary: append only if current is empty
	let summary = existing.summary || ''
	if (!summary.trim() && parsed.summary?.trim()) {
		summary = parsed.summary.trim()
	}

	// Education: dedupe, add new
	const existingEduKeys = new Set((existing.education || []).map(eduKey))
	const education = [...(existing.education || [])]
	for (const edu of parsed.education || []) {
		const key = eduKey(edu)
		if (!existingEduKeys.has(key)) {
			existingEduKeys.add(key)
			education.push({
				id: newId(),
				school: edu.school || '',
				degree: edu.degree || '',
				discipline: edu.discipline || edu.field || '',
				minor: edu.minor || '',
				location: edu.location || '',
				startDate: edu.startDate || '',
				endDate: edu.endDate || '',
				current: edu.current || false,
				gpa: edu.gpa || '',
				subsections: edu.subsections || {},
				fromParsed: true,
			})
			counts.education++
		}
	}

	// Experiences: dedupe, add new
	const existingExpKeys = new Set((existing.experiences || []).map(expKey))
	const experiences = [...(existing.experiences || [])]
	for (const exp of parsed.experiences || []) {
		const key = expKey(exp)
		if (!existingExpKeys.has(key)) {
			existingExpKeys.add(key)
			experiences.push({
				id: newId(),
				title: exp.title || '',
				company: exp.company || '',
				description: descToString(exp.description),
				startDate: exp.startDate || '',
				endDate: exp.endDate || '',
				current: exp.current || false,
				location: exp.location || '',
				skills: exp.skills || '',
				fromParsed: true,
			})
			counts.experiences++
		}
	}

	// Projects: dedupe, add new
	const existingProjKeys = new Set((existing.projects || []).map(projKey))
	const projects = [...(existing.projects || [])]
	for (const proj of parsed.projects || []) {
		const key = projKey(proj)
		if (!key) continue // skip empty title
		if (!existingProjKeys.has(key)) {
			existingProjKeys.add(key)
			const techStack = Array.isArray(proj.techStack) ? proj.techStack : (proj.techStack ? [proj.techStack] : [])
			projects.push({
				id: newId(),
				title: proj.title || '',
				description: descToString(proj.description),
				techStack,
				url: proj.url || '',
				fromParsed: true,
			})
			counts.projects++
		}
	}

	// Skills: dedupe, add new
	const existingSkillKeys = new Set((existing.skills || []).map(skillKey))
	const skills = [...(existing.skills || [])]
	const rawSkills = parsed.skills || []
	for (const s of rawSkills) {
		const skill = typeof s === 'string' ? { name: s, category: '' } : s
		const key = skillKey(skill)
		if (!key) continue
		if (!existingSkillKeys.has(key)) {
			existingSkillKeys.add(key)
			skills.push({
				id: newId(),
				name: skill.name || '',
				category: skill.category || '',
				fromParsed: true,
			})
			counts.skills++
		}
	}

	return {
		merged: { contact, education, experiences, projects, skills, summary },
		counts,
	}
}
