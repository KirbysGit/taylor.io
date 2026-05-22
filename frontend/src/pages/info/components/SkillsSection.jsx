import React from 'react'
import SkillsInput from '@/components/inputs/SkillsInput'
import ProfileSectionCard from './ProfileSectionCard'

const SkillsSection = ({ skills, onAdd, onRemove, onUpdate, onReorder, onCategoryOrderChange }) => {
	return (
		<ProfileSectionCard
			title="Skills"
			description="Add skills, group them with suggested categories (languages, soft skills, and more), and drag pills to reorder."
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
