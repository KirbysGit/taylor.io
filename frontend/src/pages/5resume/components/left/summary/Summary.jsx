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
}) => {
	const summary = summaryData?.summary ?? ''

	const handleUpdate = (value) => {
		onSummaryChange({ summary: value })
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
			<SummaryInput summary={summary} onUpdate={handleUpdate} />
		</ResumeSectionWrapper>
	)
}

export default Summary
