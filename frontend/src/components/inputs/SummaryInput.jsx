import React, { useState, useEffect } from 'react'

// Summary entry — textarea only; section title lives in ProfileSectionCard or setup/resume parents.
const SummaryInput = ({ summary, onUpdate }) => {
	const [summaryText, setSummaryText] = useState(summary || '')

	useEffect(() => {
		setSummaryText(summary || '')
	}, [summary])

	const handleChange = (e) => {
		const value = e.target.value
		setSummaryText(value)
		onUpdate(value)
	}

	return (
		<div className="space-y-2">
			<textarea
				id="summary"
				value={summaryText}
				onChange={handleChange}
				rows={8}
				className="input min-h-[10rem] w-full resize-y"
				placeholder="e.g., Experienced software engineer with 5+ years of expertise in full-stack development. Passionate about building scalable web applications and leading cross-functional teams..."
			/>
			<p className="text-right text-xs font-medium text-slate-400">{summaryText.length} characters</p>
		</div>
	)
}

export default SummaryInput
