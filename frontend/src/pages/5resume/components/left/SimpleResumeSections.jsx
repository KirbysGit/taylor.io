// SimpleResumeSections.jsx — Organize view: section bars + pencil expands full editors below (same inputs as Full editor).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import ResumeHeader from './ResumeHeader'
import Education from './education/Education'
import Experience from './experience/Experience'
import Projects from './projects/Projects'
import Skills from './skills/Skills'
import Summary from './summary/Summary'
import SectionTitleEditor from './SectionTitleEditor'

function truncatePreview(s, len = 72) {
	if (s == null || s === '') return ''
	const t = String(s).replace(/\s+/g, ' ').trim()
	if (!t) return ''
	return t.length <= len ? t : `${t.slice(0, len)}…`
}

function OrganizeSectionBar({
	defaultLabel,
	sectionLabel,
	preview,
	showVisibility,
	isVisible,
	onVisibilityChange,
	expanded,
	onToggleExpand,
}) {
	return (
		<div
			className={`flex items-center gap-2 border border-gray-200 bg-gray-50/90 px-3 py-2.5 ${
				expanded ? 'rounded-t-lg border-b-0' : 'rounded-lg'
			}`}
		>
			{showVisibility && onVisibilityChange && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						onVisibilityChange(!isVisible)
					}}
					className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
					aria-label={isVisible ? 'Hide from preview' : 'Show in preview'}
					title={isVisible ? 'Hide from preview' : 'Show in preview'}
				>
					<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
				</button>
			)}
			<span
				className="text-sm font-semibold text-gray-900 shrink-0 max-w-[42%] truncate"
				title={sectionLabel || defaultLabel}
			>
				{sectionLabel || defaultLabel}
			</span>
			<span className="text-xs text-gray-500 truncate min-w-0 flex-1" title={preview}>
				{preview || '—'}
			</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onToggleExpand()
				}}
				className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700"
				aria-expanded={expanded}
				title={expanded ? 'Collapse editor' : 'Expand editor'}
			>
				<FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
			</button>
		</div>
	)
}

function ExpandedChrome({ children, sectionKey, defaultLabel, sectionLabel, onSectionLabelChange, description }) {
	return (
		<div className="rounded-b-lg border border-gray-200 border-t-0 bg-white overflow-hidden shadow-sm">
			<div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-white">
				<SectionTitleEditor
					sectionKey={sectionKey}
					currentLabel={sectionLabel}
					onLabelChange={onSectionLabelChange}
					defaultLabel={defaultLabel}
					size="compact"
				/>
				{description ? <p className="text-xs text-gray-500 mt-1.5">{description}</p> : null}
			</div>
			{children}
		</div>
	)
}

function SimpleResumeSections({
	sectionOrder,
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

	const toggle = (key) => {
		setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
	}

	const educationList = Array.isArray(educationData) ? educationData : []
	const experienceList = Array.isArray(experienceData) ? experienceData : []
	const projectsList = Array.isArray(projectsData) ? projectsData : []
	const skillsList = Array.isArray(skillsData) ? skillsData : []

	const renderSection = (sectionKey) => {
		switch (sectionKey) {
			case 'header': {
				if (!headerData) return null
				const name = [headerData.first_name, headerData.last_name].filter(Boolean).join(' ') || 'Your name'
				const preview = `${name} · ${headerData.email || '—'}`
				const ex = !!expandedSections.header
				return (
					<div key="header" id="section-header" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Header"
							sectionLabel={sectionLabels?.header || 'Header'}
							preview={preview}
							showVisibility={false}
							expanded={ex}
							onToggleExpand={() => toggle('header')}
						/>
						{ex && (
							<div className="rounded-b-lg border border-gray-200 border-t-0 bg-white overflow-hidden shadow-sm">
								<div className="px-4 pt-3 pb-2 border-b border-gray-100">
									<p className="text-xs text-gray-500">Name, email, and optional contacts for the top of your resume.</p>
								</div>
								<ResumeHeader headerData={headerData} onHeaderChange={onHeaderChange} bare />
							</div>
						)}
					</div>
				)
			}

			case 'summary': {
				if (!summaryData) return null
				const text = (summaryData.summary || '').trim()
				const preview = text ? truncatePreview(text) : 'No summary yet'
				const ex = !!expandedSections.summary
				return (
					<div key="summary" id="section-summary" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Professional Summary"
							sectionLabel={sectionLabels?.summary}
							preview={preview}
							showVisibility
							isVisible={vis.summary ?? false}
							onVisibilityChange={(v) => onVisibilityChange('summary', v)}
							expanded={ex}
							onToggleExpand={() => toggle('summary')}
						/>
						{ex && (
							<ExpandedChrome
								sectionKey="summary"
								defaultLabel="Professional Summary"
								sectionLabel={sectionLabels?.summary}
								onSectionLabelChange={onSectionLabelChange}
								description="Write a brief professional summary highlighting your experience, skills, and career goals."
							>
								<Summary
									bare
									summaryData={summaryData}
									onSummaryChange={onSummaryChange}
									isVisible={vis.summary ?? false}
									onVisibilityChange={(v) => onVisibilityChange('summary', v)}
									sectionLabel={sectionLabels?.summary}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChrome>
						)}
					</div>
				)
			}

			case 'education': {
				if (!educationData) return null
				const first = educationList[0]
				const preview =
					educationList.length === 0
						? 'No entries yet'
						: `${educationList.length} · ${first?.school || 'School'}${first?.degree ? ` · ${first.degree}` : ''}`
				const ex = !!expandedSections.education
				return (
					<div key="education" id="section-education" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Education"
							sectionLabel={sectionLabels?.education}
							preview={preview}
							showVisibility
							isVisible={vis.education ?? true}
							onVisibilityChange={(v) => onVisibilityChange('education', v)}
							expanded={ex}
							onToggleExpand={() => toggle('education')}
						/>
						{ex && (
							<ExpandedChrome
								sectionKey="education"
								defaultLabel="Education"
								sectionLabel={sectionLabels?.education}
								onSectionLabelChange={onSectionLabelChange}
								description="Your academic background"
							>
								<Education
									bare
									educationData={educationData}
									onEducationChange={onEducationChange}
									isVisible={vis.education ?? true}
									onVisibilityChange={(v) => onVisibilityChange('education', v)}
									sectionLabel={sectionLabels?.education}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChrome>
						)}
					</div>
				)
			}

			case 'experience': {
				if (!experienceData) return null
				const first = experienceList[0]
				const preview =
					experienceList.length === 0
						? 'No entries yet'
						: `${experienceList.length} · ${first?.title || 'Role'}${first?.company ? ` @ ${first.company}` : ''}`
				const ex = !!expandedSections.experience
				return (
					<div key="experience" id="section-experience" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Experience"
							sectionLabel={sectionLabels?.experience}
							preview={preview}
							showVisibility
							isVisible={vis.experience ?? true}
							onVisibilityChange={(v) => onVisibilityChange('experience', v)}
							expanded={ex}
							onToggleExpand={() => toggle('experience')}
						/>
						{ex && (
							<ExpandedChrome
								sectionKey="experience"
								defaultLabel="Experience"
								sectionLabel={sectionLabels?.experience}
								onSectionLabelChange={onSectionLabelChange}
								description="Your work history"
							>
								<Experience
									bare
									experienceData={experienceData}
									onExperienceChange={onExperienceChange}
									isVisible={vis.experience ?? true}
									onVisibilityChange={(v) => onVisibilityChange('experience', v)}
									sectionLabel={sectionLabels?.experience}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChrome>
						)}
					</div>
				)
			}

			case 'projects': {
				if (!projectsData) return null
				const first = projectsList[0]
				const preview =
					projectsList.length === 0
						? 'No entries yet'
						: `${projectsList.length} · ${first?.title || 'Project'}`
				const ex = !!expandedSections.projects
				return (
					<div key="projects" id="section-projects" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Projects"
							sectionLabel={sectionLabels?.projects}
							preview={preview}
							showVisibility
							isVisible={vis.projects ?? true}
							onVisibilityChange={(v) => onVisibilityChange('projects', v)}
							expanded={ex}
							onToggleExpand={() => toggle('projects')}
						/>
						{ex && (
							<ExpandedChrome
								sectionKey="projects"
								defaultLabel="Projects"
								sectionLabel={sectionLabels?.projects}
								onSectionLabelChange={onSectionLabelChange}
								description="Highlight your projects"
							>
								<Projects
									bare
									projectsData={projectsData}
									onProjectsChange={onProjectsChange}
									isVisible={vis.projects ?? true}
									onVisibilityChange={(v) => onVisibilityChange('projects', v)}
									sectionLabel={sectionLabels?.projects}
									onSectionLabelChange={onSectionLabelChange}
								/>
							</ExpandedChrome>
						)}
					</div>
				)
			}

			case 'skills': {
				if (!Array.isArray(skillsData) && !skillsData) return null
				const n = skillsList.length
				const names = skillsList.slice(0, 3).map((s) => s.name).filter(Boolean)
				const preview = n === 0 ? 'No skills yet' : `${n} skill${n === 1 ? '' : 's'} · ${names.join(', ') || '—'}`
				const ex = !!expandedSections.skills
				return (
					<div key="skills" id="section-skills" className="mb-4">
						<OrganizeSectionBar
							defaultLabel="Skills"
							sectionLabel={sectionLabels?.skills}
							preview={preview}
							showVisibility
							isVisible={vis.skills ?? true}
							onVisibilityChange={(v) => onVisibilityChange('skills', v)}
							expanded={ex}
							onToggleExpand={() => toggle('skills')}
						/>
						{ex && (
							<ExpandedChrome
								sectionKey="skills"
								defaultLabel="Skills"
								sectionLabel={sectionLabels?.skills}
								onSectionLabelChange={onSectionLabelChange}
								description="Organize your skills into categories. Drag pills to reorder. Hide skills you don't want on this resume."
							>
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
							</ExpandedChrome>
						)}
					</div>
				)
			}

			default:
				return null
		}
	}

	return (
		<div className="space-y-1">
			<div className="mb-4 p-3 rounded-lg bg-brand-pink/5 border border-brand-pink/20">
				<p className="text-sm text-gray-800 font-medium">Organize your resume</p>
				<p className="text-xs text-gray-600 mt-1">
					Each row is a section—use the pencil to expand and edit here, or switch to{' '}
					<strong>Full editor</strong> to open every section at once.
				</p>
				<p className="text-xs text-gray-500 mt-2">
					Profile and account details:{' '}
					<Link to="/info" className="text-brand-pink font-medium hover:underline">
						Info
					</Link>
					.
				</p>
			</div>
			{sectionOrder.map(renderSection)}
		</div>
	)
}

export default SimpleResumeSections
