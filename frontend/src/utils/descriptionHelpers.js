// Utility functions for converting between paragraph and bullet point formats

// Convert paragraph string to bullet array
export const paragraphToBullets = (paragraph) => {
	try {
		if (!paragraph || typeof paragraph !== 'string') return ['']
		const result = paragraph
			.split('\n')
			.map(line => line.replace(/^•\s*/, '').trim()) // Remove bullet prefix if present
			.filter(line => line.length > 0) // Remove empty lines
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

// Detect if description is in bullet format
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
