// Utility functions for converting between paragraph and bullet point formats

// Convert paragraph string to bullet array
export const paragraphToBullets = (paragraph) => {
	if (!paragraph) return ['']
	return paragraph
		.split('\n')
		.map(line => line.replace(/^•\s*/, '').trim()) // Remove bullet prefix if present
		.filter(line => line.length > 0) // Remove empty lines
}

// Convert bullet array to paragraph string (with bullet prefix)
export const bulletsToParagraph = (bullets) => {
	if (!bullets || bullets.length === 0) return ''
	return bullets
		.filter(b => b.trim().length > 0) // Filter empty bullets
		.map(b => `• ${b.trim()}`)
		.join('\n')
}

// Detect if description is in bullet format
export const isBulletFormat = (description) => {
	if (!description) return false
	const lines = description.split('\n').filter(l => l.trim())
	return lines.length > 0 && lines.every(line => line.trim().startsWith('•'))
}
