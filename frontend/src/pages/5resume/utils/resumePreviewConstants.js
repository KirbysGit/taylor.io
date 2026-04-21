/** Aligns with backend `shared.template_slug.normalize_template_slug` (legacy `default` → `classic`). */
export function normalizeTemplateSlug(name) {
	if (name == null || name === '') return 'classic'
	const s = String(name).trim()
	if (s.toLowerCase() === 'default') return 'classic'
	return s
}

/** Defaults for `style` sent with preview/PDF/Word; presets apply when layoutProfile is classic_single_column. */
export const DEFAULT_STYLE_PREFERENCES = {
	marginPreset: 'balanced',
	lineSpacingPreset: 'standard',
	typeScalePreset: 'standard',
	fontPairing: 'serif_classic',
	/** 'full' | 'strip_protocol' — contact / rail link labels only; hrefs stay correct (backend). */
	contactUrlDisplay: 'full',
}

export const defaultSectionLabels = {
	summary: 'Professional Summary',
	education: 'Education',
	experience: 'Experience',
	projects: 'Projects',
	skills: 'Skills',
}

/** Initial width (px) for the resume editor left panel before drag / clamp. */
export const DEFAULT_LEFT_PANEL_WIDTH = 700
