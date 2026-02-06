import React, { useState, useEffect } from 'react'

// Summary Input Component - Just the textarea, no headers
const SummaryInput = ({ summary, onUpdate }) => {
	const [summaryText, setSummaryText] = useState(summary || '')
	
	// Sync with prop changes
	useEffect(() => {
		setSummaryText(summary || '')
	}, [summary])
	
	const handleChange = (e) => {
		const value = e.target.value
		setSummaryText(value)
		onUpdate(value)
	}
	
	return (
		<div>
			<label htmlFor="summary" className="label">
				Professional Summary
			</label>
			<textarea
				id="summary"
				value={summaryText}
				onChange={handleChange}
				rows={8}
				className="input resize-y"
				placeholder="e.g., Experienced software engineer with 5+ years of expertise in full-stack development. Passionate about building scalable web applications and leading cross-functional teams..."
			/>
			<p className="mt-2 text-xs text-gray-500">
				{summaryText.length} characters
			</p>
		</div>
	)
}

export default SummaryInput
