// Projects.jsx - Uses shared ProjectsInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo, useRef } from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'
import { transformProjectForStep } from '@/pages/info/utils/dataTransform'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const PROJECTS_DESCRIPTION =
	'Portfolio work, technical projects, case studies, and outcomes you want available when tailoring a résumé.'

const toInputFormat = (projectsData) => {
	if (!projectsData || !Array.isArray(projectsData)) return []
	return projectsData.map((proj) => transformProjectForStep(proj))
}

const toResumeFormat = (projects) => {
	if (!projects || !Array.isArray(projects)) return []
	return projects
}

function ProjectsSectionHeader({ onAdd }) {
	return (
		<div className="mb-5 flex flex-col gap-4 border-b border-brand-pink/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
			<p className="max-w-2xl text-sm leading-relaxed text-slate-600">{PROJECTS_DESCRIPTION}</p>
			<button type="button" onClick={onAdd} className="profileAddButtonPrimary w-full shrink-0 sm:w-auto">
				+ Add project
			</button>
		</div>
	)
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
	const projectsRef = useRef(null)
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

	const handleReorder = useCallback(
		(reordered) => {
			onProjectsChange(toResumeFormat(reordered))
		},
		[onProjectsChange]
	)

	const triggerAddNew = useCallback(() => {
		projectsRef.current?.addNew()
	}, [])

	const input = (
		<>
			{bare ? <ProjectsSectionHeader onAdd={triggerAddNew} /> : null}
			<ProjectsInput
				ref={projectsRef}
				projects={projects}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				onReorder={handleReorder}
				compact={bare}
				hideHeader
			/>
		</>
	)

	if (bare) {
		return input
	}

	return (
		<ResumeSectionWrapper
			sectionKey="projects"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Projects"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description={PROJECTS_DESCRIPTION}
			headerAction={
				<button type="button" onClick={triggerAddNew} className="profileAddButtonPrimary w-full sm:w-auto">
					+ Add project
				</button>
			}
		>
			{input}
		</ResumeSectionWrapper>
	)
}

export default Projects
