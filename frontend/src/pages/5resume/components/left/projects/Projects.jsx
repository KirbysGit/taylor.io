// Projects.jsx - Uses shared ProjectsInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo } from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'
import { transformProjectForStep } from '@/pages/info/utils/dataTransform'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

// Resume format (tech_stack) -> Input format (techStack, id)
const toInputFormat = (projectsData) => {
	if (!projectsData || !Array.isArray(projectsData)) return []
	return projectsData.map((proj) => transformProjectForStep(proj))
}

// Input format -> Resume format (step format; normalizeProjectForBackend uses techStack)
const toResumeFormat = (projects) => {
	if (!projects || !Array.isArray(projects)) return []
	return projects
}

const Projects = ({
	projectsData,
	onProjectsChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
	bare = false,
}) => {
	const projects = useMemo(() => toInputFormat(projectsData), [projectsData])

	const handleAdd = useCallback(
		(newProj) => {
			const withId = { ...newProj, id: newProj.id || newId() }
			const next = [...toInputFormat(projectsData), withId]
			onProjectsChange(toResumeFormat(next))
		},
		[projectsData, onProjectsChange]
	)

	const handleRemove = useCallback(
		(index) => {
			const next = toInputFormat(projectsData).filter((_, i) => i !== index)
			onProjectsChange(toResumeFormat(next))
		},
		[projectsData, onProjectsChange]
	)

	const handleUpdate = useCallback(
		(index, updated) => {
			const next = [...toInputFormat(projectsData)]
			next[index] = { ...next[index], ...updated }
			onProjectsChange(toResumeFormat(next))
		},
		[projectsData, onProjectsChange]
	)

	const input = (
		<ProjectsInput
			projects={projects}
			onAdd={handleAdd}
			onRemove={handleRemove}
			onUpdate={handleUpdate}
		/>
	)

	if (bare) {
		return <div className="p-4">{input}</div>
	}

	return (
		<ResumeSectionWrapper
			sectionKey="projects"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Projects"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Highlight your projects"
		>
			{input}
		</ResumeSectionWrapper>
	)
}

export default Projects
