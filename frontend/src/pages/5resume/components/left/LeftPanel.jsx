// components / left / LeftPanel.jsx

// Left panel containing all input sections and controls.

import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import ResumeSections from './ResumeSections'

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
	onSummaryChange,
	onVisibilityChange,
	sectionLabels,
	onSectionLabelChange,
}) {
	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 p-8 overflow-y-auto"
		>
			{welcomeMessage && (
				<WelcomeMessage
					user={user}
					onDismiss={onDismissWelcome}
				/>
			)}

			<ResumeStyling 
				sectionOrder={sectionOrder}
				onSectionOrderChange={onSectionOrderChange}
				template={template}
				onTemplateChange={onTemplateChange}
				availableTemplates={availableTemplates}
				isLoadingTemplates={isLoadingTemplates}
				onScrollToSection={onScrollToSection}
			/>

			<ResumeSections
				sectionOrder={sectionOrder}
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
				onSummaryChange={onSummaryChange}
				onVisibilityChange={onVisibilityChange}
				sectionLabels={sectionLabels}
				onSectionLabelChange={onSectionLabelChange}
			/>
		</aside>
	)
}

export default LeftPanel
