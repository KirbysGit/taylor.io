import React from 'react'
import EducationInput from '@/components/inputs/EducationInput'
import ProfileSectionCard from './ProfileSectionCard'

const EducationSection = ({ education, onAdd, onRemove, onUpdate, onSubsectionUpdate }) => {
	return (
		<ProfileSectionCard
			title="Education"
			description="Schools, degrees, coursework, honors, and academic highlights."
		>
			<EducationInput 
				education={education} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate}
				showSubsections={true}
				onSubsectionUpdate={onSubsectionUpdate}
			/>
		</ProfileSectionCard>
	)
}

export default EducationSection
