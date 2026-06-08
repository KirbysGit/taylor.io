// Education.jsx - Uses shared EducationInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo, useRef } from 'react'
import EducationInput from '@/components/inputs/EducationInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'
import { transformEducationForStep } from '@/pages/info/utils/dataTransform'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const EDUCATION_DESCRIPTION =
	'Schools, degrees, coursework, and honors for tailoring your résumé.'

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

function EducationSectionHeader({ onAdd }) {
	return (
		<div className="mb-5 flex flex-col gap-4 border-b border-brand-pink/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
			<p className="max-w-2xl text-sm leading-relaxed text-slate-600">{EDUCATION_DESCRIPTION}</p>
			<button type="button" onClick={onAdd} className="profileAddButtonPrimary w-full shrink-0 sm:w-auto">
				+ Add education
			</button>
		</div>
	)
}

const Education = ({
	educationData,
	onEducationChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
	/** When true, render only inputs (for compact bar + expand layout). */
	bare = false,
}) => {
	const educationRef = useRef(null)
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

	const handleReorder = useCallback(
		(reordered) => {
			onEducationChange(toResumeFormat(reordered))
		},
		[onEducationChange]
	)

	const triggerAddNew = useCallback(() => {
		educationRef.current?.addNew()
	}, [])

	const input = (
		<>
			{bare ? <EducationSectionHeader onAdd={triggerAddNew} /> : null}
			<EducationInput
				ref={educationRef}
				education={education}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				onReorder={handleReorder}
				showSubsections
				compact={bare}
				hideHeader
				showFooterTip={!bare}
			/>
		</>
	)

	if (bare) {
		return input
	}

	return (
		<ResumeSectionWrapper
			sectionKey="education"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Education"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description={EDUCATION_DESCRIPTION}
			headerAction={
				<button type="button" onClick={triggerAddNew} className="profileAddButtonPrimary w-full sm:w-auto">
					+ Add education
				</button>
			}
		>
			{input}
		</ResumeSectionWrapper>
	)
}

export default Education
