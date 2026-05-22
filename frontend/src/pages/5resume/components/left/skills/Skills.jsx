// Skills.jsx - Uses shared SkillsInput with resume-specific wrapper (visibility, section label, hide/show)

import React, { useCallback, useMemo, useRef } from 'react'
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

function SkillsSectionHeader({ onNewCategory }) {
	return (
		<div className="mb-5 flex flex-col gap-4 border-b border-brand-pink/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
			<p className="max-w-2xl text-sm leading-relaxed text-slate-600">
				Organize skills into categories. Drag pills to reorder or hide skills you do not want on this résumé.
			</p>
			<button type="button" onClick={onNewCategory} className="profileAddButtonPrimary w-full shrink-0 sm:w-auto">
				+ New Category
			</button>
		</div>
	)
}

const Skills = ({
	skillsData,
	hiddenSkills,
	onSkillsChange,
	onHideSkill,
	onShowSkill,
	onCategoryOrderChange,
	isVisible = true,
	onVisibilityChange,
	sectionLabel,
	onSectionLabelChange,
	bare = false,
}) => {
	const skillsRef = useRef(null)
	const skills = useMemo(() => toInputFormat(skillsData ?? []), [skillsData])
	const hidden = useMemo(() => toInputFormat(hiddenSkills ?? []), [hiddenSkills])

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

	const triggerNewCategory = useCallback(() => {
		skillsRef.current?.addCategory()
	}, [])

	const inputBlock = (
		<>
			{bare ? <SkillsSectionHeader onNewCategory={triggerNewCategory} /> : null}
			<SkillsInput
				ref={skillsRef}
				skills={skills}
				hiddenSkills={hidden}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				onReorder={handleReorder}
				onCategoryOrderChange={onCategoryOrderChange}
				onHide={onHideSkill || undefined}
				onShowSkill={onShowSkill || undefined}
			/>
		</>
	)

	if (bare) {
		return inputBlock
	}

	return (
		<ResumeSectionWrapper
			sectionKey="skills"
			sectionLabel={sectionLabel}
			onSectionLabelChange={onSectionLabelChange}
			defaultLabel="Skills"
			isVisible={isVisible}
			onVisibilityChange={onVisibilityChange}
			description="Organize your skills into categories. Drag pills to reorder. Hide skills you don't want on this resume."
			headerAction={
				<button type="button" onClick={triggerNewCategory} className="profileAddButtonPrimary w-full sm:w-auto">
					+ New Category
				</button>
			}
		>
			{inputBlock}
		</ResumeSectionWrapper>
	)
}

export default Skills
