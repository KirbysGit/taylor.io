import React from 'react'
import SkillsInput from '@/components/inputs/SkillsInput'
import ProfileSectionCard from './ProfileSectionCard'

const SkillsSection = ({ skills, onAdd, onRemove, onUpdate, onReorder, onCategoryOrderChange }) => {
	return (
		<ProfileSectionCard
			title="Skills"
			description="Organize your skills into categories. Drag pills to reorder."
		>
			<SkillsInput 
				skills={skills} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
				onReorder={onReorder}
				onCategoryOrderChange={onCategoryOrderChange}
			/>
		</ProfileSectionCard>
	)
}

export default SkillsSection
