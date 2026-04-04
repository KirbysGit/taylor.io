/**
 * Mirrors backend/generator/html/tagline.py + shared/tagline.py rules:
 * ==underline==, **bold**, _italic_, * → middle dot (·). Keep in sync when Python changes.
 */
const INTERPUNCT = '\u00b7'

function outerItalicSegments(raw) {
	const out = []
	let i = 0
	const n = raw.length
	while (i < n) {
		if (raw[i] === '_') {
			const j = raw.indexOf('_', i + 1)
			if (j !== -1 && j > i + 1) {
				out.push([true, raw.slice(i + 1, j)])
				i = j + 1
			} else {
				const start = i
				i += 1
				while (i < n && raw[i] !== '_') i += 1
				out.push([false, raw.slice(start, i)])
			}
		} else {
			const start = i
			while (i < n && raw[i] !== '_') i += 1
			out.push([false, raw.slice(start, i)])
		}
	}
	return out
}

function applyBoldAndDots(text, italic) {
	const parts = text.split('**')
	if (parts.length % 2 === 0) {
		const t = text.replace(/\*/g, INTERPUNCT)
		return t ? [[t, false, italic]] : []
	}
	const runs = []
	for (let idx = 0; idx < parts.length; idx++) {
		const bold = idx % 2 === 1
		const t = parts[idx].replace(/\*/g, INTERPUNCT)
		if (t) runs.push([t, bold, italic])
	}
	return runs
}

function mergeBoldItalicRuns(rows) {
	const merged = []
	for (const row of rows) {
		const [text, b, it] = row
		if (!text) continue
		const last = merged[merged.length - 1]
		if (last && last[1] === b && last[2] === it) {
			last[0] += text
		} else {
			merged.push([text, b, it])
		}
	}
	return merged
}

function parseBoldItalicOnly(text) {
	let all = []
	for (const [isItalic, seg] of outerItalicSegments(text)) {
		all = all.concat(applyBoldAndDots(seg, isItalic))
	}
	return mergeBoldItalicRuns(all)
}

/**
 * @returns {Array<[string, boolean, boolean, boolean]>} [text, bold, italic, underline]
 */
export function parseTaglineRuns(raw) {
	const s = (raw || '').trim()
	if (!s) return []
	const parts = s.split('==')
	if (parts.length % 2 === 0) {
		return parseBoldItalicOnly(s).map(([t, b, it]) => [t, b, it, false])
	}
	const mergedFour = []
	for (let idx = 0; idx < parts.length; idx++) {
		const underline = idx % 2 === 1
		for (const [t, b, it] of parseBoldItalicOnly(parts[idx])) {
			mergedFour.push([t, b, it, underline])
		}
	}
	const out = []
	for (const row of mergedFour) {
		const [text, b, it, u] = row
		if (!text) continue
		const last = out[out.length - 1]
		if (last && last[1] === b && last[2] === it && last[3] === u) {
			last[0] += text
		} else {
			out.push([text, b, it, u])
		}
	}
	return out
}
