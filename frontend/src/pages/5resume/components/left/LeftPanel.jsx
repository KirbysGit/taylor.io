// components / left / LeftPanel.jsx
// Left panel container: assist + styling + sections.

import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import SimpleResumeSections from './SimpleResumeSections'
import TailorAssistPanel from './tailorAssist/TailorAssistPanel'

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
	templateStyling,
	isLoadingTemplates,
	stylePreferences,
	onStylePreferenceChange,
	onScrollToSection,
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
	tailorIntent,
	aiTailorResult,
	aiTailorPhase,
}) {
	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 pl-8 pt-8 pb-8 pr-4 overflow-y-auto [scrollbar-gutter:stable]"
		>
			<TailorAssistPanel tailorIntent={tailorIntent} aiTailorResult={aiTailorResult} aiTailorPhase={aiTailorPhase} />

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
				templateStyling={templateStyling}
				isLoadingTemplates={isLoadingTemplates}
				stylePreferences={stylePreferences}
				onStylePreferenceChange={onStylePreferenceChange}
			/>

			<SimpleResumeSections
					sectionOrder={sectionOrder}
					onSectionOrderChange={onSectionOrderChange}
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
