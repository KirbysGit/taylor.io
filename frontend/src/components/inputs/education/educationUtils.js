const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Quick-add chips — shared brand-pink styling (not row colors). */
export const HIGHLIGHT_CHIP_CLASS =
	'border-brand-pink/35 bg-brand-pink/10 text-brand-pink-dark hover:bg-brand-pink/16'

/** “+” custom chip — stronger accent so it reads as “add your own”. */
export const HIGHLIGHT_ADD_CHIP_CLASS =
	'border-red-300/80 bg-red-50 text-red-800 hover:border-red-400/90 hover:bg-red-100/90'

export const HIGHLIGHT_PRESETS = [
	{ id: 'Coursework', label: 'Coursework' },
	{ id: 'Honors', label: 'Honors' },
	{ id: 'Awards', label: 'Awards' },
	{ id: 'Clubs', label: 'Clubs' },
]

const PRESET_IDS = new Set(HIGHLIGHT_PRESETS.map((p) => p.id))

/** Pastel pill colors in highlight rows — light red / blue / pink / purple / orange. */
export const HIGHLIGHT_GRID_COLORS = [
	{ pillClass: 'border-red-200/75 bg-red-50 text-red-800/90' },
	{ pillClass: 'border-sky-200/75 bg-sky-50 text-sky-800/90' },
	{ pillClass: 'border-pink-200/75 bg-pink-50 text-pink-800/90' },
	{ pillClass: 'border-purple-200/75 bg-purple-50 text-purple-800/90' },
	{ pillClass: 'border-orange-200/75 bg-orange-50 text-orange-800/90' },
]

const PRESET_COLOR_INDEX = {
	Coursework: 0,
	Honors: 1,
	Awards: 2,
	Clubs: 3,
}

function colorIndexForCategory(category) {
	if (PRESET_COLOR_INDEX[category] != null) return PRESET_COLOR_INDEX[category]
	const s = String(category || '')
	let h = 0
	for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i)) % HIGHLIGHT_GRID_COLORS.length
	return h
}

export function presetForCategory(category) {
	const preset = HIGHLIGHT_PRESETS.find((p) => p.id === category)
	const idx = colorIndexForCategory(category)
	const grid = HIGHLIGHT_GRID_COLORS[idx % HIGHLIGHT_GRID_COLORS.length]
	return {
		id: category,
		label: preset?.label ?? category,
		isPreset: !!preset,
		gridPillClass: grid.pillClass,
		chipClass: HIGHLIGHT_CHIP_CLASS,
	}
}

function formatMonthYear(value) {
	if (!value) return ''
	const s = String(value).slice(0, 7)
	const [y, m] = s.split('-').map(Number)
	if (!y || !m || m < 1 || m > 12) return s
	return `${MONTHS[m - 1]} ${y}`
}

export function formatEducationDateRange(edu) {
	const start = formatMonthYear(edu?.startDate || edu?.start_date)
	const end = edu?.current ? 'Present' : formatMonthYear(edu?.endDate || edu?.end_date)
	if (start && end) return `${start} – ${end}`
	if (start) return `${start} – Present`
	if (end) return end
	return ''
}

/** complete | in_progress | incomplete */
export function getEducationStatus(edu) {
	if (edu?.current) return 'in_progress'
	const hasCore = !!(edu?.school?.trim() && edu?.degree?.trim() && (edu?.startDate || edu?.start_date))
	if (!hasCore) return 'incomplete'
	if (edu?.endDate || edu?.end_date || edu?.current) return 'complete'
	return 'incomplete'
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

export function getEducationDisplayTitle(edu) {
	const degree = (edu?.degree || '').trim()
	const field = (edu?.discipline || edu?.field || '').trim()
	const school = (edu?.school || '').trim()
	if (degree && field) return `${degree} in ${field}`
	if (degree) return degree
	if (field) return field
	if (school) return school
	return 'New education'
}

export function getEducationMetaLine(edu) {
	const parts = []
	const school = (edu?.school || '').trim()
	const dates = formatEducationDateRange(edu)
	const location = (edu?.location || '').trim()
	const gpa = (edu?.gpa || '').trim()
	if (school) parts.push(school)
	if (dates) parts.push(dates)
	if (location) parts.push(location)
	if (gpa) parts.push(gpa.startsWith('GPA') ? gpa : `GPA ${gpa}`)
	return parts.join(' · ')
}

/** Flat rows for highlight UI; newline-separated lines per subsection key. */
export function subsectionsToHighlightRows(subsections = {}) {
	const rows = []
	for (const [category, content] of Object.entries(subsections)) {
		const lines = String(content ?? '')
			.split('\n')
			.map((l) => l.trim())
		if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
			rows.push({ rowKey: `${category}__0`, category, text: '' })
			continue
		}
		lines.forEach((text, i) => {
			rows.push({ rowKey: `${category}__${i}`, category, text })
		})
	}
	return rows
}

export function highlightRowsToSubsections(rows) {
	const subs = {}
	for (const row of rows) {
		const cat = (row.category || '').trim()
		const text = (row.text || '').trim()
		if (!cat) continue
		if (!subs[cat]) subs[cat] = text
		else subs[cat] = `${subs[cat]}\n${text}`
	}
	for (const key of Object.keys(subs)) {
		if (!subs[key].trim()) delete subs[key]
	}
	return subs
}

export function isPresetCategory(category) {
	return PRESET_IDS.has(category)
}

export function newHighlightRow(category, index = 0) {
	return { rowKey: `${category}__${Date.now()}_${index}`, category, text: '' }
}
