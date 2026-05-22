export { ENTRY_THEME_PALETTE as PROJECT_ENTRY_COLORS, getEntryTheme as getProjectEntryTheme } from '../shared/entryThemePalette'

/** complete | incomplete — only project title is required. */
export function getProjectStatus(proj) {
	if (!(proj?.title || '').trim()) return 'incomplete'
	return 'complete'
}

export function statusLabel(status) {
	if (status === 'complete') return 'Complete'
	return 'Incomplete'
}

export function statusBadgeClass(status) {
	if (status === 'complete') return 'border-emerald-200/90 bg-emerald-50 text-emerald-800'
	return 'border-slate-200/90 bg-slate-50 text-slate-600'
}

export function getProjectDisplayTitle(proj) {
	const title = (proj?.title || '').trim()
	if (title) return title
	return 'New project'
}

export function getTechStackString(proj) {
	if (!proj?.techStack) return ''
	return Array.isArray(proj.techStack) ? proj.techStack.join(', ') : String(proj.techStack)
}

export function getProjectTechChips(proj, max = 8) {
	const raw = getTechStackString(proj).trim()
	if (!raw) return []
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, max)
}

export function getProjectMetaLine(proj) {
	const url = (proj?.url || '').trim()
	if (!url) return ''
	try {
		const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
		return host.replace(/^www\./, '')
	} catch {
		return url
	}
}
