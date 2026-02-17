// components / left / ResumeSections.jsx

// Renders resume sections in the specified order.

import ResumeHeader from './ResumeHeader'
import Education from './education/Education'
import Experience from './experience/Experience'
import Projects from './projects/Projects'
import Skills from './skills/Skills'
import Summary from './summary/Summary'

function ResumeSections({ 
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
	onSummaryChange,
	onVisibilityChange,
	sectionLabels,
	onSectionLabelChange,
}) {
	const renderSection = (sectionKey) => {
		switch (sectionKey) {
			case 'header':
				return headerData ? (
					<div key="header" id="section-header" className="mb-6">
						<ResumeHeader 
							headerData={headerData}
							onHeaderChange={onHeaderChange}
						/>
					</div>
				) : null
			
			case 'summary':
				return summaryData ? (
					<div key="summary" id="section-summary" className="mb-6">
						<Summary 
							summaryData={summaryData}
							onSummaryChange={onSummaryChange}
							isVisible={resumeData.sectionVisibility?.summary ?? false}
							onVisibilityChange={(isVisible) => {
								onVisibilityChange('summary', isVisible)
							}}
							sectionLabel={sectionLabels?.summary}
							onSectionLabelChange={onSectionLabelChange}
						/>
					</div>
				) : null
			
			case 'education':
				return educationData ? (
					<div key="education" id="section-education" className="mb-6">
						<Education 
							educationData={educationData}
							onEducationChange={onEducationChange}
							isVisible={resumeData.sectionVisibility?.education ?? true}
							onVisibilityChange={(isVisible) => {
								onVisibilityChange('education', isVisible)
							}}
							sectionLabel={sectionLabels?.education}
							onSectionLabelChange={onSectionLabelChange}
						/>
					</div>
				) : null
			
			case 'experience':
				return experienceData ? (
					<div key="experience" id="section-experience" className="mb-6">
						<Experience 
							experienceData={experienceData}
							onExperienceChange={onExperienceChange}
							isVisible={resumeData.sectionVisibility?.experience ?? true}
							onVisibilityChange={(isVisible) => {
								onVisibilityChange('experience', isVisible)
							}}
							sectionLabel={sectionLabels?.experience}
							onSectionLabelChange={onSectionLabelChange}
						/>
					</div>
				) : null
			
			case 'projects':
				return projectsData ? (
					<div key="projects" id="section-projects" className="mb-6">
						<Projects 
							projectsData={projectsData}
							onProjectsChange={onProjectsChange}
							isVisible={resumeData.sectionVisibility?.projects ?? true}
							onVisibilityChange={(isVisible) => {
								onVisibilityChange('projects', isVisible)
							}}
							sectionLabel={sectionLabels?.projects}
							onSectionLabelChange={onSectionLabelChange}
						/>
					</div>
				) : null
			
			case 'skills':
				return skillsData ? (
					<div key="skills" id="section-skills" className="mb-6">
						<Skills 
							skillsData={skillsData}
							onSkillsChange={onSkillsChange}
							isVisible={resumeData.sectionVisibility?.skills ?? true}
							onVisibilityChange={(isVisible) => {
								onVisibilityChange('skills', isVisible)
							}}
							sectionLabel={sectionLabels?.skills}
							onSectionLabelChange={onSectionLabelChange}
						/>
					</div>
				) : null
			
			default:
				return null
		}
	}

	return (
		<>
			{sectionOrder.map(renderSection)}
		</>
	)
}

export default ResumeSections
