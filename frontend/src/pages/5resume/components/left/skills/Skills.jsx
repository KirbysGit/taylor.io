// Skills.jsx - Uses shared SkillsInput with resume-specific wrapper (visibility, section label)

import React, { useCallback, useMemo } from 'react'
import SkillsInput from '@/components/inputs/SkillsInput'
import ResumeSectionWrapper from '../ResumeSectionWrapper'

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

// Resume format: [{ name, category }] -> Input format: [{ id, name, category }]
const toInputFormat = (skillsData) => {
	if (!skillsData || !Array.isArray(skillsData)) return []
	return skillsData.map((s, i) => ({
		id: s.id || newId(),
		name: s.name || '',
		category: s.category ?? '',
	}))
}

// Input format -> Resume format (keep id for stability, backend ignores it)
const toResumeFormat = (skills) => {
	if (!skills || !Array.isArray(skills)) return []
	return skills.map((s) => ({
		id: s.id,
		name: s.name || '',
		category: s.category ?? '',
	}))
}

const Skills = ({
	skillsData,
	onSkillsChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
}) => {
	const skills = useMemo(() => toInputFormat(skillsData ?? []), [skillsData])

	const handleAdd = useCallback(
		(skill) => {
			const withId = { ...skill, id: skill.id || newId() }
			onSkillsChange(toResumeFormat([...toInputFormat(skillsData), withId]))
		},
		[skillsData, onSkillsChange]
	)

	const handleRemove = useCallback(
		(index) => {
			const next = [...toInputFormat(skillsData)]
			next.splice(index, 1)
			onSkillsChange(toResumeFormat(next))
		},
		[skillsData, onSkillsChange]
	)

	const handleUpdate = useCallback(
		(index, updated) => {
			const next = [...toInputFormat(skillsData)]
			next[index] = { ...next[index], ...updated }
			onSkillsChange(toResumeFormat(next))
		},
		[skillsData, onSkillsChange]
	)

	const handleReorder = useCallback(
		(fromIndex, toIndex) => {
			const next = [...toInputFormat(skillsData)]
			const [removed] = next.splice(fromIndex, 1)
			next.splice(toIndex, 0, removed)
			onSkillsChange(toResumeFormat(next))
		},
		[skillsData, onSkillsChange]
	)

	return (
		<ResumeSectionWrapper
			sectionKey="skills"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Skills"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Organize your skills into categories. Drag pills to reorder."
		>
			<SkillsInput
				skills={skills}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				onReorder={handleReorder}
			/>
		</ResumeSectionWrapper>
	)
}

export default Skills
