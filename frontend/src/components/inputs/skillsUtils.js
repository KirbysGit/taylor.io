import {
	faBullseye,
	faCertificate,
	faComments,
	faLanguage,
	faPlus,
	faUserGroup,
} from '@fortawesome/free-solid-svg-icons'

/** Quick-add category chips — same brand-pink styling as education highlight chips. */
export const SKILL_CATEGORY_CHIP_CLASS =
	'border-brand-pink/35 bg-brand-pink/10 text-brand-pink-dark hover:bg-brand-pink/16'

export const SKILL_CATEGORY_ADD_CHIP_CLASS =
	'border-red-300/80 bg-red-50 text-red-800 hover:border-red-400/90 hover:bg-red-100/90'

/** Suggested non-technical groupings; users can still add custom categories. */
export const SKILL_CATEGORY_PRESETS = [
	{ id: 'Languages', label: 'Languages' },
	{ id: 'Soft Skills', label: 'Soft Skills' },
	{ id: 'Focus Areas', label: 'Focus Areas' },
	{ id: 'Certifications', label: 'Certifications' },
	{ id: 'Leadership', label: 'Leadership' },
]

export const SKILL_PRESET_ICONS = {
	Languages: faLanguage,
	'Soft Skills': faComments,
	'Focus Areas': faBullseye,
	Certifications: faCertificate,
	Leadership: faUserGroup,
}

const PRESET_IDS = new Set(SKILL_CATEGORY_PRESETS.map((p) => p.id))

export function isPresetSkillCategory(name) {
	return PRESET_IDS.has(name)
}

export function iconForSkillCategory(categoryName) {
	return SKILL_PRESET_ICONS[categoryName] || null
}
