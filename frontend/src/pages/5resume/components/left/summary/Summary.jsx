// Summary.jsx - Uses shared SummaryInput with resume-specific wrapper (visibility, section label)

import React from 'react'
import SummaryInput from '@/components/inputs/SummaryInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'

const Summary = ({
	summaryData,
	onSummaryChange,
	isVisible = false,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
	bare = false,
}) => {
	const summary = summaryData?.summary ?? ''

	const handleUpdate = (value) => {
		onSummaryChange({ summary: value })
	}

	const input = <SummaryInput summary={summary} onUpdate={handleUpdate} hideLabel={bare} />

	if (bare) {
		return <div className="p-4">{input}</div>
	}

	return (
		<ResumeSectionWrapper
			sectionKey="summary"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Professional Summary"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Write a brief professional summary highlighting your experience, skills, and career goals."
		>
			{input}
		</ResumeSectionWrapper>
	)
}

export default Summary
