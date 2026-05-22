import React, { useRef } from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'
import ProfileSectionCard from './ProfileSectionCard'

const ProjectsSection = ({ projects, onAdd, onRemove, onUpdate }) => {
	const projectsRef = useRef(null)

	const addButton = (
		<button
			type="button"
			onClick={() => projectsRef.current?.addNew()}
			className="profileAddButtonPrimary w-full sm:w-auto"
		>
			+ Add project
		</button>
	)

	return (
		<ProfileSectionCard
			title="Projects"
			description="Portfolio work, technical projects, case studies, and outcomes."
			headerAction={addButton}
			hideEyebrow
			showAutoSaveBadge={false}
		>
			<ProjectsInput
				ref={projectsRef}
				projects={projects}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				hideHeader
			/>
		</ProfileSectionCard>
	)
}

export default ProjectsSection
