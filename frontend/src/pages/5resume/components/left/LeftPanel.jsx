// components / left / LeftPanel.jsx

// Left panel: styling + Organize view (collapsible sections with grip to reorder).

import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import SimpleResumeSections from './SimpleResumeSections'

function LeftPanel({
	width,
	welcomeMessage,
	user,
	onDismissWelcome,
	sectionOrder,
	onSectionOrderChange,
	template,
	onTemplateChange,
	availableTemplates,
	isLoadingTemplates,
	onScrollToSection,
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
	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 pl-8 pt-8 pb-8 pr-4 overflow-y-auto [scrollbar-gutter:stable]"
		>
			{welcomeMessage && (
				<WelcomeMessage
					user={user}
					onDismiss={onDismissWelcome}
				/>
			)}

			<ResumeStyling
				template={template}
				onTemplateChange={onTemplateChange}
				availableTemplates={availableTemplates}
				isLoadingTemplates={isLoadingTemplates}
			/>

			<SimpleResumeSections
					sectionOrder={sectionOrder}
					onSectionOrderChange={onSectionOrderChange}
					headerData={headerData}
					educationData={educationData}
					experienceData={experienceData}
					projectsData={projectsData}
					skillsData={skillsData}
					summaryData={summaryData}
					resumeData={resumeData}
					onHeaderChange={onHeaderChange}
					onEducationChange={onEducationChange}
					onExperienceChange={onExperienceChange}
					onProjectsChange={onProjectsChange}
					onSkillsChange={onSkillsChange}
					onHideSkill={onHideSkill}
					onShowSkill={onShowSkill}
					onSkillsCategoryOrderChange={onSkillsCategoryOrderChange}
					onSummaryChange={onSummaryChange}
					onVisibilityChange={onVisibilityChange}
					sectionLabels={sectionLabels}
					onSectionLabelChange={onSectionLabelChange}
				/>
		</aside>
	)
}

export default LeftPanel
