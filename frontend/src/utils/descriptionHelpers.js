// Utility functions for converting between paragraph and bullet point formats

// Convert paragraph string (or array) to bullet array
export const paragraphToBullets = (paragraph) => {
	try {
		if (!paragraph) return ['']
		// Handle array from parser (e.g. ['Line1', 'Line2'])
		if (Array.isArray(paragraph)) {
			const filtered = paragraph.filter(Boolean).map((line) => String(line).replace(/^•\s*/, '').trim()).filter((line) => line.length > 0)
			return filtered.length > 0 ? filtered : ['']
		}
		if (typeof paragraph !== 'string') return ['']
		const result = paragraph
			.split(/\r?\n|\r/)
			.map((line) => line.replace(/^•\s*/, '').trim()) // Remove bullet prefix if present
			.filter((line) => line.length > 0) // Remove empty lines
		return Array.isArray(result) && result.length > 0 ? result : ['']
	} catch (error) {
		console.error('Error in paragraphToBullets:', error)
		return ['']
	}
}

// Convert bullet array to paragraph string (with bullet prefix)
export const bulletsToParagraph = (bullets) => {
	try {
		if (!bullets || !Array.isArray(bullets) || bullets.length === 0) return ''
		const result = bullets
			.filter(b => b && typeof b === 'string' && b.trim().length > 0) // Filter empty bullets
			.map(b => `• ${b.trim()}`)
			.join('\n')
		return typeof result === 'string' ? result : ''
	} catch (error) {
		console.error('Error in bulletsToParagraph:', error)
		return ''
	}
}

// Detect if description is in bullet format (all lines start with •)
export const isBulletFormat = (description) => {
	try {
		if (!description || typeof description !== 'string') return false
		const lines = description.split('\n').filter(l => l.trim())
		return lines.length > 0 && lines.every(line => line.trim().startsWith('•'))
	} catch (error) {
		console.error('Error in isBulletFormat:', error)
		return false
	}
}

// Normalize description to string (handles array from parser e.g. ['Line1', 'Line2'])
const toDescriptionString = (d) => {
	if (!d) return ''
	if (Array.isArray(d)) return d.filter(Boolean).join('\n')
	return String(d)
}

// Split by newlines (handles \n, \r\n, \r)
const splitLines = (str) => str.split(/\r?\n|\r/).filter((l) => l.trim())

// Default to bullet mode when: already bullet format OR newline-separated (multiple lines) OR array with multiple items
export const shouldDefaultToBullets = (description) => {
	try {
		// Array with multiple items = treat as bullets (from projects parser)
		if (Array.isArray(description) && description.filter(Boolean).length > 1) return true
		const str = toDescriptionString(description)
		if (!str) return false
		const lines = splitLines(str)
		return isBulletFormat(str) || lines.length > 1
	} catch (error) {
		console.error('Error in shouldDefaultToBullets:', error)
		return false
	}
}
