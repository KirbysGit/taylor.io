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
	tailorIntent,
	aiTailorResult,
	aiAppliedChanges,
	aiPendingChanges,
	aiRejectedChanges,
	aiTailorPhase,
	onAiUndoLastChange,
	onAiRevertAllChanges,
	onAiAcceptAllPending,
	onAiRejectAllPending,
	onAiAcceptChange,
	onAiRejectChange,
	onAiRevertSingleChange,
	onAiRevertSection,
}) {
	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 pl-8 pt-8 pb-8 pr-4 overflow-y-auto [scrollbar-gutter:stable]"
		>
			<TailorAssistPanel
				tailorIntent={tailorIntent}
				aiTailorResult={aiTailorResult}
				aiAppliedChanges={aiAppliedChanges}
				aiPendingChanges={aiPendingChanges}
				aiRejectedChanges={aiRejectedChanges}
				aiTailorPhase={aiTailorPhase}
				onAiUndoLastChange={onAiUndoLastChange}
				onAiRevertAllChanges={onAiRevertAllChanges}
				onAiAcceptAllPending={onAiAcceptAllPending}
				onAiRejectAllPending={onAiRejectAllPending}
				onAiAcceptChange={onAiAcceptChange}
				onAiRejectChange={onAiRejectChange}
				onAiRevertSingleChange={onAiRevertSingleChange}
				onAiRevertSection={onAiRevertSection}
			/>

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
