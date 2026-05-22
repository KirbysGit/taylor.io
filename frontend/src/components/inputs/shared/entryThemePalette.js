/**
 * Pastel icon + chip themes for profile entry cards (education, experience, projects).
 * Ordered roughly ROYGBIV with intermediates — stable pick by entry id, not list index.
 */
export const ENTRY_THEME_PALETTE = [
	// Red → orange
	{ icon: 'bg-red-100 text-red-800', chip: 'border-red-200/80 bg-red-50 text-red-900/90' },
	{ icon: 'bg-rose-100 text-rose-800', chip: 'border-rose-200/80 bg-rose-50 text-rose-900/90' },
	{ icon: 'bg-orange-100 text-orange-900', chip: 'border-orange-200/80 bg-orange-50 text-orange-950/90' },
	{ icon: 'bg-amber-100 text-amber-900', chip: 'border-amber-200/80 bg-amber-50 text-amber-950/90' },
	// Yellow → green
	{ icon: 'bg-yellow-100 text-yellow-900', chip: 'border-yellow-200/80 bg-yellow-50 text-yellow-950/90' },
	{ icon: 'bg-lime-100 text-lime-900', chip: 'border-lime-200/80 bg-lime-50 text-lime-950/90' },
	{ icon: 'bg-green-100 text-green-800', chip: 'border-green-200/80 bg-green-50 text-green-900/90' },
	{ icon: 'bg-emerald-100 text-emerald-800', chip: 'border-emerald-200/80 bg-emerald-50 text-emerald-900/90' },
	// Green → blue
	{ icon: 'bg-teal-100 text-teal-900', chip: 'border-teal-200/80 bg-teal-50 text-teal-950/90' },
	{ icon: 'bg-cyan-100 text-cyan-900', chip: 'border-cyan-200/80 bg-cyan-50 text-cyan-950/90' },
	{ icon: 'bg-sky-100 text-sky-800', chip: 'border-sky-200/80 bg-sky-50 text-sky-900/90' },
	{ icon: 'bg-blue-100 text-blue-800', chip: 'border-blue-200/80 bg-blue-50 text-blue-900/90' },
	// Blue → violet
	{ icon: 'bg-indigo-100 text-indigo-800', chip: 'border-indigo-200/80 bg-indigo-50 text-indigo-900/90' },
	{ icon: 'bg-violet-100 text-violet-800', chip: 'border-violet-200/80 bg-violet-50 text-violet-900/90' },
	{ icon: 'bg-purple-100 text-purple-800', chip: 'border-purple-200/80 bg-purple-50 text-purple-900/90' },
	{ icon: 'bg-fuchsia-100 text-fuchsia-800', chip: 'border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-900/90' },
	// Extra steps between primaries (red-orange, yellow-green, teal, blue-violet, magenta)
	{ icon: 'bg-orange-50 text-orange-800', chip: 'border-orange-200/70 bg-orange-50/90 text-orange-900/90' },
	{ icon: 'bg-amber-50 text-amber-900', chip: 'border-amber-200/70 bg-amber-50/90 text-amber-950/90' },
	{ icon: 'bg-lime-50 text-lime-800', chip: 'border-lime-200/70 bg-lime-50/90 text-lime-900/90' },
	{ icon: 'bg-teal-50 text-teal-800', chip: 'border-teal-200/70 bg-teal-50/90 text-teal-900/90' },
	{ icon: 'bg-sky-50 text-sky-800', chip: 'border-sky-200/70 bg-sky-50/90 text-sky-900/90' },
	{ icon: 'bg-indigo-50 text-indigo-900', chip: 'border-indigo-200/70 bg-indigo-50/90 text-indigo-950/90' },
	{ icon: 'bg-violet-50 text-violet-900', chip: 'border-violet-200/70 bg-violet-50/90 text-violet-950/90' },
	{ icon: 'bg-pink-100 text-pink-800', chip: 'border-pink-200/80 bg-pink-50 text-pink-900/90' },
]

/** Spread hues by entry id so list order does not look like strict alternation. */
export function getEntryTheme(entryId, index = 0) {
	const key = String(entryId ?? index)
	let h = 0
	for (let i = 0; i < key.length; i += 1) {
		h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
	}
	const idx = Math.abs(h) % ENTRY_THEME_PALETTE.length
	return ENTRY_THEME_PALETTE[idx]
}
