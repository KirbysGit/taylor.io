// Skills.jsx - Uses shared SkillsInput with resume-specific wrapper (visibility, section label, hide/show)

import React, { useCallback, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
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
	const [hiddenSectionOpen, setHiddenSectionOpen] = useState(false)
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

	const hiddenBlock =
		hidden.length > 0 ? (
			<div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
				<button
					type="button"
					onClick={() => setHiddenSectionOpen(!hiddenSectionOpen)}
					className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
				>
					<span className="font-medium text-gray-700">
						Hidden for this resume ({hidden.length})
					</span>
					<FontAwesomeIcon icon={hiddenSectionOpen ? faChevronUp : faChevronDown} className="w-4 h-4 text-gray-500" />
				</button>
				{hiddenSectionOpen && (
					<div className="p-4 bg-white border-t border-gray-200">
						<div className="flex flex-wrap gap-2">
							{hidden.map((skill) => (
								<div
									key={skill.id}
									className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
								>
									<span className="text-gray-600">{skill.name}</span>
									{skill.category && (
										<span className="text-xs text-gray-400">({skill.category})</span>
									)}
									<button
										type="button"
										onClick={() => onShowSkill?.(skill.id)}
										className="p-1 rounded hover:bg-brand-pink/20 text-brand-pink"
										title="Show on resume"
									>
										<FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		) : null

	const inputBlock = (
		<>
			<SkillsInput
				skills={skills}
				onAdd={handleAdd}
				onRemove={handleRemove}
				onUpdate={handleUpdate}
				onReorder={handleReorder}
				onCategoryOrderChange={onCategoryOrderChange}
				onHide={onHideSkill || undefined}
			/>
			{hiddenBlock}
		</>
	)

	if (bare) {
		return <div className="p-4">{inputBlock}</div>
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
		>
			{inputBlock}
		</ResumeSectionWrapper>
	)
}

export default Skills
