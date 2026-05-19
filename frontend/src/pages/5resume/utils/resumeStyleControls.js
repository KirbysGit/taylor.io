export const TEMPLATE_STYLE_CONTROL_IDS = [
	'typeScale',
	'fontPairing',
	'marginPreset',
	'lineSpacingPreset',
]

export const GLOBAL_FORMAT_CONTROL_IDS = ['contactUrlDisplay']

export const PLANNED_TEMPLATE_CONTROL_IDS = [
	'accentPreset',
	'sectionChromePreset',
	'headerLayoutPreset',
	'densityPreset',
]

export const STYLE_CONTROL_OPTIONS = {
	marginPreset: [
		{ id: 'balanced', label: 'Balanced', shortLabel: 'Balanced' },
		{ id: 'tight', label: 'Tight', shortLabel: 'Compact' },
		{ id: 'spacious', label: 'Spacious', shortLabel: 'Roomy' },
	],
	lineSpacingPreset: [
		{ id: 'standard', label: 'Standard', shortLabel: 'Standard' },
		{ id: 'compact', label: 'Compact', shortLabel: 'Compact' },
		{ id: 'relaxed', label: 'Relaxed', shortLabel: 'Comfortable' },
	],
	typeScale: [
		{ id: 'standard', label: 'Standard', shortLabel: 'Standard' },
		{ id: 'compact', label: 'Smaller', shortLabel: 'Smaller' },
		{ id: 'large', label: 'Larger', shortLabel: 'Larger' },
	],
	fontPairing: [
		{ id: 'serif_classic', label: 'Serif classic', shortLabel: 'Serif' },
		{ id: 'calibri_modern', label: 'Calibri modern', shortLabel: 'Modern' },
	],
	contactUrlDisplay: [
		{ id: 'full', label: 'Full URL', shortLabel: 'Full URL' },
		{ id: 'strip_protocol', label: 'Hide https://', shortLabel: 'Hide https://' },
	],
}

export const STYLE_CONTROL_LABELS = {
	marginPreset: 'Page margins',
	lineSpacingPreset: 'Line spacing',
	typeScale: 'Type scale',
	fontPairing: 'Fonts',
	contactUrlDisplay: 'URL text',
}

export const STYLE_PREFERENCE_KEYS = {
	marginPreset: 'marginPreset',
	lineSpacingPreset: 'lineSpacingPreset',
	typeScale: 'typeScalePreset',
	fontPairing: 'fontPairing',
	contactUrlDisplay: 'contactUrlDisplay',
}

function normalizeOption(option) {
	if (typeof option === 'string') return { id: option, label: option }
	if (!option || typeof option !== 'object') return null
	const id = option.id ?? option.value
	if (!id) return null
	return {
		id: String(id),
		label: String(option.label ?? option.name ?? id),
		shortLabel: option.shortLabel ? String(option.shortLabel) : undefined,
	}
}

export function getStyleControlOptions(controlId, meta, { shortLabels = false } = {}) {
	const override = meta?.controlOptions?.[controlId]
	const rawOptions = Array.isArray(override) ? override : STYLE_CONTROL_OPTIONS[controlId] || []
	return rawOptions
		.map(normalizeOption)
		.filter(Boolean)
		.map((option) => ({
			id: option.id,
			label: shortLabels && option.shortLabel ? option.shortLabel : option.label,
		}))
}

export function templateSupportsControl(meta, controlId) {
	return Array.isArray(meta?.allowedControls) && meta.allowedControls.includes(controlId)
}

export function getVisibleTemplateStyleControls(meta) {
	return TEMPLATE_STYLE_CONTROL_IDS.filter((controlId) => templateSupportsControl(meta, controlId))
}

export function getPlannedTemplateControls(meta) {
	return PLANNED_TEMPLATE_CONTROL_IDS.filter((controlId) => templateSupportsControl(meta, controlId))
}
