import React, { useRef } from 'react'
import ExperienceInput from '@/components/inputs/ExperienceInput'
import ProfileSectionCard from './ProfileSectionCard'

const ExperienceSection = ({ experiences, onAdd, onRemove, onUpdate }) => {
	const experienceRef = useRef(null)

	const addButton = (
		<button
			type="button"
			onClick={() => experienceRef.current?.addNew()}
			className="profileAddButtonPrimary w-full sm:w-auto"
		>
			+ Add experience
		</button>
	)

	return (
		<ProfileSectionCard
			title="Work Experience"
			description="Roles, companies, responsibilities, impact, and tools you used."
			headerAction={addButton}
			hideEyebrow
			showAutoSaveBadge={false}
		>
			<ExperienceInput
				ref={experienceRef}
				experiences={experiences}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				hideHeader
			/>
		</ProfileSectionCard>
	)
}

export default ExperienceSection
