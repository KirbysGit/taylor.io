// Education.jsx - Uses shared EducationInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo } from 'react'
import EducationInput from '@/components/inputs/EducationInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'
import { transformEducationForStep } from '@/pages/info/utils/dataTransform'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

// Resume format (start_date, end_date) -> Input format (startDate, endDate, id, subsections)
const toInputFormat = (educationData) => {
	if (!educationData || !Array.isArray(educationData)) return []
	return educationData.map((edu) => transformEducationForStep(edu))
}

// Input format -> Resume format (step format; normalizeEducationForBackend handles startDate/endDate)
const toResumeFormat = (education) => {
	if (!education || !Array.isArray(education)) return []
	return education
}

const Education = ({
	educationData,
	onEducationChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
}) => {
	const education = useMemo(() => toInputFormat(educationData), [educationData])

	const handleAdd = useCallback(
		(newEdu) => {
			const withId = { ...newEdu, id: newEdu.id || newId() }
			const next = [...toInputFormat(educationData), withId]
			onEducationChange(toResumeFormat(next))
		},
		[educationData, onEducationChange]
	)

	const handleRemove = useCallback(
		(index) => {
			const next = toInputFormat(educationData).filter((_, i) => i !== index)
			onEducationChange(toResumeFormat(next))
		},
		[educationData, onEducationChange]
	)

	const handleUpdate = useCallback(
		(index, updated) => {
			const next = [...toInputFormat(educationData)]
			next[index] = { ...next[index], ...updated }
			onEducationChange(toResumeFormat(next))
		},
		[educationData, onEducationChange]
	)

	return (
		<ResumeSectionWrapper
			sectionKey="education"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Education"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Your academic background"
		>
			<EducationInput
				education={education}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				showSubsections={true}
			/>
		</ResumeSectionWrapper>
	)
}

export default Education
