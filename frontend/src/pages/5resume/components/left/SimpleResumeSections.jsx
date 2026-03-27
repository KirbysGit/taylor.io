// SimpleResumeSections.jsx — Organize view: section bars + pencil expands full editors below (same inputs as Full editor).

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faPencil, faChevronUp, faGripVertical, faLock } from '@fortawesome/free-solid-svg-icons'

import ResumeHeader from './ResumeHeader'
import Education from './education/Education'
import Experience from './experience/Experience'
import Projects from './projects/Projects'
import Skills from './skills/Skills'
import Summary from './summary/Summary'

function OrganizeSectionBar({
	defaultLabel,
	sectionLabel,
	showVisibility,
	isVisible,
	onVisibilityChange,
	expanded,
	onToggleExpand,
	isLocked,
	isDraggable,
	isDragging,
	isDragOver,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}) {
	return (
		<div
			draggable={isDraggable}
			onDragStart={isDraggable ? onDragStart : undefined}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			onDragEnd={isDraggable ? onDragEnd : undefined}
			className={`
				flex items-center gap-2 pl-3 pr-2 py-2.5
				border-l-4 ${isLocked ? 'border-gray-400 bg-gray-50/60' : 'border-brand-pink'} bg-white
				shadow
				transition-all duration-200 ease-out
				hover:shadow-lg hover:-translate-y-0.5
				${expanded ? 'rounded-t-xl' : 'rounded-xl'}
				${isDragging ? 'opacity-50' : ''}
				${isDragOver ? 'ring-2 ring-brand-pink ring-dashed ring-offset-1 bg-brand-pink/5' : ''}
				${isDraggable ? 'cursor-move' : ''}
			`}
		>
			{/* Grip or lock — left side */}
			<div className="flex-shrink-0 w-6 flex items-center justify-center text-gray-400">
				{isLocked ? (
					<FontAwesomeIcon icon={faLock} className="w-3.5 h-3.5" />
				) : isDraggable ? (
					<FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5" />
				) : (
					<span className="w-3.5" aria-hidden />
				)}
			</div>
			{/* Label */}
			<span
				className="text-sm font-semibold text-gray-900 truncate flex-1 min-w-0"
				title={sectionLabel || defaultLabel}
			>
				{sectionLabel || defaultLabel}
			</span>
			{/* Eye + Pencil — right side, icon-only with light hover */}
			{showVisibility && onVisibilityChange && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						onVisibilityChange(!isVisible)
					}}
					className="flex-shrink-0 p-2 rounded-md text-gray-500 hover:text-brand-pink hover:bg-gray-100 transition-colors"
					aria-label={isVisible ? 'Hide from preview' : 'Show in preview'}
					title={isVisible ? 'Hide from preview' : 'Show in preview'}
				>
					<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4" />
				</button>
			)}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onToggleExpand()
				}}
				className={`flex-shrink-0 p-2 rounded-md transition-colors ${
					expanded
						? 'bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20'
						: 'text-gray-500 hover:text-brand-pink hover:bg-gray-100'
				}`}
				aria-expanded={expanded}
				title={expanded ? 'Click to collapse editor' : 'Click to expand editor'}
			>
				<FontAwesomeIcon icon={expanded ? faChevronUp : faPencil} className="w-3.5 h-3.5" />
			</button>
		</div>
	)
}

function AnimatedExpand({ expanded, children }) {
	return (
		<div
			className="grid transition-[grid-template-rows] duration-150 ease-out"
			style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
		>
			<div className="min-h-0 overflow-hidden">{children}</div>
		</div>
	)
}

function ExpandedChromeSimple({ children }) {
	return (
		<div className="rounded-b-xl border-l-4 border-brand-pink border border-gray-100 border-t-0 bg-white overflow-hidden shadow">
			<div className="px-4 pt-4 pb-4">{children}</div>
		</div>
	)
}

function SimpleResumeSections({
	sectionOrder,
	onSectionOrderChange,
	headerData,
	educationData,
	experienceData,
	projectsData,
	skillsData,
	summaryData,
	resumeData,
	onHeaderChange,
	onEducationChange,
	onExperienceChange,
	onProjectsChange,
	onSkillsChange,
	onHideSkill,
	onShowSkill,
	onSkillsCategoryOrderChange,
	onSummaryChange,
	onVisibilityChange,
	sectionLabels,
	onSectionLabelChange,
}) {
	const vis = resumeData?.sectionVisibility || {}
	const [expandedSections, setExpandedSections] = useState({})
	const [draggedSection, setDraggedSection] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	// Header + Professional Summary are fixed at top; only reorder the rest
	const draggableOrder = sectionOrder.filter((k) => k !== 'header' && k !== 'summary')
	const displayOrder = [
		'header',
		...(summaryData != null ? ['summary'] : []),
		...draggableOrder,
	]

	const handleDragStart = (e, sectionKey) => {
		setDraggedSection(sectionKey)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', sectionKey)
	}
	const handleDragOver = (e, index) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverIndex(index)
	}
	const handleDragLeave = () => setDragOverIndex(null)
	const handleDrop = (e, dropIndex) => {
		e.preventDefault()
		if (!draggedSection) return
		const draggedIndex = draggableOrder.indexOf(draggedSection)
		if (draggedIndex === -1 || draggedIndex === dropIndex) {
			setDraggedSection(null)
			setDragOverIndex(null)
			return
		}
		const newDraggable = [...draggableOrder]
		const [removed] = newDraggable.splice(draggedIndex, 1)
		newDraggable.splice(dropIndex, 0, removed)
		onSectionOrderChange?.(['header', 'summary', ...newDraggable])
		setDraggedSection(null)
		setDragOverIndex(null)
	}
	const handleDragEnd = () => {
		setDraggedSection(null)
		setDragOverIndex(null)
	}

	const toggle = (key) => {
		setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
	}

	const skillsList = Array.isArray(skillsData) ? skillsData : []

	const renderSection = (sectionKey) => {
		switch (sectionKey) {
			case 'header': {
				if (!headerData) return null
				const ex = !!expandedSections.header
				return (
					<div key="header" id="section-header" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Header"
							sectionLabel={sectionLabels?.header || 'Header'}
							showVisibility={false}
							expanded={ex}
							onToggleExpand={() => toggle('header')}
							isLocked
							isDraggable={false}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<ResumeHeader headerData={headerData} onHeaderChange={onHeaderChange} bare />
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			case 'summary': {
				if (!summaryData) return null
				const ex = !!expandedSections.summary
				return (
					<div key="summary" id="section-summary" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Professional Summary"
							sectionLabel={sectionLabels?.summary}
							showVisibility
							isVisible={vis.summary ?? false}
							onVisibilityChange={(v) => onVisibilityChange('summary', v)}
							expanded={ex}
							onToggleExpand={() => toggle('summary')}
							isLocked
							isDraggable={false}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<Summary
									bare
									summaryData={summaryData}
									onSummaryChange={onSummaryChange}
									isVisible={vis.summary ?? false}
									onVisibilityChange={(v) => onVisibilityChange('summary', v)}
									sectionLabel={sectionLabels?.summary}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			case 'education': {
				if (!educationData) return null
				const ex = !!expandedSections.education
				return (
					<div key="education" id="section-education" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Education"
							sectionLabel={sectionLabels?.education}
							showVisibility
							isVisible={vis.education ?? true}
							onVisibilityChange={(v) => onVisibilityChange('education', v)}
							expanded={ex}
							onToggleExpand={() => toggle('education')}
							isLocked={false}
							isDraggable
							isDragging={draggedSection === 'education'}
							isDragOver={dragOverIndex === draggableOrder.indexOf('education')}
							onDragStart={(e) => handleDragStart(e, 'education')}
							onDragOver={(e) => handleDragOver(e, draggableOrder.indexOf('education'))}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, draggableOrder.indexOf('education'))}
							onDragEnd={handleDragEnd}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<Education
									bare
									educationData={educationData}
									onEducationChange={onEducationChange}
									isVisible={vis.education ?? true}
									onVisibilityChange={(v) => onVisibilityChange('education', v)}
									sectionLabel={sectionLabels?.education}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			case 'experience': {
				if (!experienceData) return null
				const ex = !!expandedSections.experience
				return (
					<div key="experience" id="section-experience" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Experience"
							sectionLabel={sectionLabels?.experience}
							showVisibility
							isVisible={vis.experience ?? true}
							onVisibilityChange={(v) => onVisibilityChange('experience', v)}
							expanded={ex}
							onToggleExpand={() => toggle('experience')}
							isLocked={false}
							isDraggable
							isDragging={draggedSection === 'experience'}
							isDragOver={dragOverIndex === draggableOrder.indexOf('experience')}
							onDragStart={(e) => handleDragStart(e, 'experience')}
							onDragOver={(e) => handleDragOver(e, draggableOrder.indexOf('experience'))}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, draggableOrder.indexOf('experience'))}
							onDragEnd={handleDragEnd}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<Experience
									bare
									experienceData={experienceData}
									onExperienceChange={onExperienceChange}
									isVisible={vis.experience ?? true}
									onVisibilityChange={(v) => onVisibilityChange('experience', v)}
									sectionLabel={sectionLabels?.experience}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			case 'projects': {
				if (!projectsData) return null
				const ex = !!expandedSections.projects
				return (
					<div key="projects" id="section-projects" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Projects"
							sectionLabel={sectionLabels?.projects}
							showVisibility
							isVisible={vis.projects ?? true}
							onVisibilityChange={(v) => onVisibilityChange('projects', v)}
							expanded={ex}
							onToggleExpand={() => toggle('projects')}
							isLocked={false}
							isDraggable
							isDragging={draggedSection === 'projects'}
							isDragOver={dragOverIndex === draggableOrder.indexOf('projects')}
							onDragStart={(e) => handleDragStart(e, 'projects')}
							onDragOver={(e) => handleDragOver(e, draggableOrder.indexOf('projects'))}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, draggableOrder.indexOf('projects'))}
							onDragEnd={handleDragEnd}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<Projects
									bare
									projectsData={projectsData}
									onProjectsChange={onProjectsChange}
									isVisible={vis.projects ?? true}
									onVisibilityChange={(v) => onVisibilityChange('projects', v)}
									sectionLabel={sectionLabels?.projects}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			case 'skills': {
				if (!Array.isArray(skillsData) && !skillsData) return null
				const ex = !!expandedSections.skills
				return (
					<div key="skills" id="section-skills" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Skills"
							sectionLabel={sectionLabels?.skills}
							showVisibility
							isVisible={vis.skills ?? true}
							onVisibilityChange={(v) => onVisibilityChange('skills', v)}
							expanded={ex}
							onToggleExpand={() => toggle('skills')}
							isLocked={false}
							isDraggable
							isDragging={draggedSection === 'skills'}
							isDragOver={dragOverIndex === draggableOrder.indexOf('skills')}
							onDragStart={(e) => handleDragStart(e, 'skills')}
							onDragOver={(e) => handleDragOver(e, draggableOrder.indexOf('skills'))}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, draggableOrder.indexOf('skills'))}
							onDragEnd={handleDragEnd}
						/>
						<AnimatedExpand expanded={ex}>
							<ExpandedChromeSimple>
								<Skills
									bare
									skillsData={skillsList}
									hiddenSkills={resumeData?.hiddenSkills ?? []}
									onSkillsChange={onSkillsChange}
									onHideSkill={onHideSkill}
									onShowSkill={onShowSkill}
									onCategoryOrderChange={onSkillsCategoryOrderChange}
									isVisible={vis.skills ?? true}
									onVisibilityChange={(v) => onVisibilityChange('skills', v)}
									sectionLabel={sectionLabels?.skills}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChromeSimple>
						</AnimatedExpand>
					</div>
				)
			}

			default:
				return null
		}
	}

	return (
		<div className="space-y-4">
			{displayOrder.map(renderSection)}
		</div>
	)
}

export default SimpleResumeSections
