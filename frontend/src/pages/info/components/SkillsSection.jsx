import React, { useRef } from 'react'
import SkillsInput from '@/components/inputs/SkillsInput'
import ProfileSectionCard from './ProfileSectionCard'

const SkillsSection = ({ skills, onAdd, onRemove, onUpdate, onReorder, onCategoryOrderChange }) => {
	const skillsRef = useRef(null)

	const newCategoryButton = (
		<button
			type="button"
			onClick={() => skillsRef.current?.addCategory()}
			className="profileAddButtonPrimary w-full sm:w-auto"
		>
			+ New Category
		</button>
	)

	return (
		<ProfileSectionCard
			title="Skills"
			description="Add skills, group them with suggested categories, and drag pills to reorder."
			headerAction={newCategoryButton}
			hideEyebrow
			showAutoSaveBadge={false}
		>
			<SkillsInput
				ref={skillsRef}
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
