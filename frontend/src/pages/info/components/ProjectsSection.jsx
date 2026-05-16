import React from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'
import ProfileSectionCard from './ProfileSectionCard'

const ProjectsSection = ({ projects, onAdd, onRemove, onUpdate }) => {
	return (
		<ProfileSectionCard
			title="Projects"
			description="Portfolio work, technical projects, case studies, and outcomes."
		>
			<ProjectsInput 
				projects={projects} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
			/>
		</ProfileSectionCard>
	)
}

export default ProjectsSection
