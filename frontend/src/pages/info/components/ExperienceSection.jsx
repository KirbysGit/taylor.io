import React from 'react'
import ExperienceInput from '@/components/inputs/ExperienceInput'
import ProfileSectionCard from './ProfileSectionCard'

const ExperienceSection = ({ experiences, onAdd, onRemove, onUpdate }) => {
	return (
		<ProfileSectionCard
			title="Work Experience"
			description="Roles, companies, responsibilities, impact, and tools you used."
		>
			<ExperienceInput 
				experiences={experiences} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
			/>
		</ProfileSectionCard>
	)
}

export default ExperienceSection
