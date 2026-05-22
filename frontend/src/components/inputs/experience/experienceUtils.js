const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export { ENTRY_THEME_PALETTE as EXPERIENCE_ENTRY_COLORS, getEntryTheme as getExperienceEntryTheme } from '../shared/entryThemePalette'

function formatMonthYear(value) {
	if (!value) return ''
	const s = String(value).slice(0, 7)
	const [y, m] = s.split('-').map(Number)
	if (!y || !m || m < 1 || m > 12) return s
	return `${MONTHS[m - 1]} ${y}`
}

export function formatExperienceDateRange(exp) {
	const start = formatMonthYear(exp?.startDate || exp?.start_date)
	const end = exp?.current ? 'Present' : formatMonthYear(exp?.endDate || exp?.end_date)
	if (start && end) return `${start} – ${end}`
	if (start) return `${start} – Present`
	if (end) return end
	return ''
}

/** complete | in_progress | incomplete — only required fields: role title or company name. */
export function getExperienceStatus(exp) {
	const title = (exp?.title || '').trim()
	const company = (exp?.company || '').trim()
	if (!title && !company) return 'incomplete'
	if (exp?.current) return 'in_progress'
	return 'complete'
}

export function statusLabel(status) {
	if (status === 'in_progress') return 'In progress'
	if (status === 'complete') return 'Complete'
	return 'Incomplete'
}

export function statusBadgeClass(status) {
	if (status === 'in_progress') return 'border-amber-200/90 bg-amber-50 text-amber-800'
	if (status === 'complete') return 'border-emerald-200/90 bg-emerald-50 text-emerald-800'
	return 'border-slate-200/90 bg-slate-50 text-slate-600'
}

export function getExperienceDisplayTitle(exp) {
	const title = (exp?.title || '').trim()
	const company = (exp?.company || '').trim()
	if (title && company) return `${title} @ ${company}`
	if (title) return title
	if (company) return company
	return 'New role'
}

export function getExperienceMetaLine(exp) {
	const parts = []
	const dates = formatExperienceDateRange(exp)
	const location = (exp?.location || '').trim()
	if (dates) parts.push(dates)
	if (location) parts.push(location)
	return parts.join(' · ')
}

/** Comma-separated skills for collapsed summary chips. */
export function getExperienceSkillChips(exp, max = 8) {
	const raw = (exp?.skills || '').trim()
	if (!raw) return []
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, max)
}
