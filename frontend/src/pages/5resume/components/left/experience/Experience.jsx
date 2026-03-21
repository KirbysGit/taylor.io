// Experience.jsx - Uses shared ExperienceInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo } from 'react'
import ExperienceInput from '@/components/inputs/ExperienceInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'
import { transformExperienceForStep } from '@/pages/info/utils/dataTransform'

// Resume format (start_date, end_date) -> Input format (startDate, endDate, id)
const toInputFormat = (experienceData) => {
	if (!experienceData || !Array.isArray(experienceData)) return []
	return experienceData.map((exp) => transformExperienceForStep(exp))
}

// Input format -> Resume format (step format; normalizeExperienceForBackend handles startDate/endDate)
const toResumeFormat = (experiences) => {
	if (!experiences || !Array.isArray(experiences)) return []
	return experiences
}

const Experience = ({
	experienceData,
	onExperienceChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
	bare = false,
}) => {
	const experiences = useMemo(() => toInputFormat(experienceData), [experienceData])

	const handleAdd = useCallback(
		(newExp) => {
			const next = [...toInputFormat(experienceData), newExp]
			onExperienceChange(toResumeFormat(next))
		},
		[experienceData, onExperienceChange]
	)

	const handleRemove = useCallback(
		(index) => {
			const next = toInputFormat(experienceData).filter((_, i) => i !== index)
			onExperienceChange(toResumeFormat(next))
		},
		[experienceData, onExperienceChange]
	)

	const handleUpdate = useCallback(
		(index, updated) => {
			const next = [...toInputFormat(experienceData)]
			next[index] = { ...next[index], ...updated }
			onExperienceChange(toResumeFormat(next))
		},
		[experienceData, onExperienceChange]
	)

	const input = (
		<ExperienceInput
			experiences={experiences}
			onAdd={handleAdd}
			onRemove={handleRemove}
			onUpdate={handleUpdate}
		/>
	)

	if (bare) {
		return <div className="p-4">{input}</div>
	}

	return (
		<ResumeSectionWrapper
			sectionKey="experience"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Experience"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Your work history"
		>
			{input}
		</ResumeSectionWrapper>
	)
}

export default Experience
