// components / left / LeftPanel.jsx

// Left panel: styling + either compact "Organize" view or full editors.

import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import ResumeSections from './ResumeSections'
import SimpleResumeSections from './SimpleResumeSections'

function LeftPanel({
	leftPanelMode = 'simple',
	onLeftPanelModeChange,
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
				sectionVisibility={resumeData?.sectionVisibility}
				onVisibilityChange={onVisibilityChange}
				template={template}
				onTemplateChange={onTemplateChange}
				availableTemplates={availableTemplates}
				isLoadingTemplates={isLoadingTemplates}
				onScrollToSection={onScrollToSection}
			/>

			{/* Organize (default) vs full inline editors */}
			<div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
				<p className="text-sm font-medium text-gray-700">Resume content</p>
				<div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
					<button
						type="button"
						onClick={() => onLeftPanelModeChange?.('simple')}
						className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
							leftPanelMode === 'simple'
								? 'bg-white text-brand-pink shadow-sm'
								: 'text-gray-600 hover:text-gray-900'
						}`}
					>
						Organize
					</button>
					<button
						type="button"
						onClick={() => onLeftPanelModeChange?.('full')}
						className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
							leftPanelMode === 'full'
								? 'bg-white text-brand-pink shadow-sm'
								: 'text-gray-600 hover:text-gray-900'
						}`}
					>
						Full editor
					</button>
				</div>
			</div>

			{leftPanelMode === 'full' ? (
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
					onHideSkill={onHideSkill}
					onShowSkill={onShowSkill}
					onSkillsCategoryOrderChange={onSkillsCategoryOrderChange}
					onSummaryChange={onSummaryChange}
					onVisibilityChange={onVisibilityChange}
					sectionLabels={sectionLabels}
					onSectionLabelChange={onSectionLabelChange}
				/>
			) : (
				<SimpleResumeSections
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
					onHideSkill={onHideSkill}
					onShowSkill={onShowSkill}
					onSkillsCategoryOrderChange={onSkillsCategoryOrderChange}
					onSummaryChange={onSummaryChange}
					onVisibilityChange={onVisibilityChange}
					sectionLabels={sectionLabels}
					onSectionLabelChange={onSectionLabelChange}
				/>
			)}
		</aside>
	)
}

export default LeftPanel
