import React, { useRef } from 'react'
import EducationInput from '@/components/inputs/EducationInput'
import ProfileSectionCard from './ProfileSectionCard'

const EducationSection = ({ education, onAdd, onRemove, onUpdate }) => {
	const educationRef = useRef(null)

	const addButton = (
		<button
			type="button"
			onClick={() => educationRef.current?.addNew()}
			className="profileAddButtonPrimary w-full sm:w-auto"
		>
			+ Add education
		</button>
	)

	return (
		<ProfileSectionCard
			title="Education"
			description="Schools, degrees, coursework, and honors for tailoring your résumé."
			headerAction={addButton}
			hideEyebrow
			showAutoSaveBadge={false}
		>
			<EducationInput
				ref={educationRef}
				education={education}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				showSubsections
				hideHeader
			/>
		</ProfileSectionCard>
	)
}

export default EducationSection
