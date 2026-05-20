// components / left / LeftPanel.jsx
// Left panel container: assist + styling + sections.

import { useEffect, useRef, useState } from 'react'
import EditorChrome from '@/components/EditorChrome'
import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import SimpleResumeSections from './SimpleResumeSections'
import TailorAssistPanel from './tailorAssist/TailorAssistPanel'

function LeftPanel({
	width,
	user,
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
	tailorLayoutPreview,
	onShowTailorFinalLayout,
}) {
	const [welcomeMessage, setWelcomeMessage] = useState(() => !localStorage.getItem('hasSeenResumeWelcome'))
	const [tailorReviewMode, setTailorReviewMode] = useState('expanded')
	const lastTailorResultRef = useRef(null)

	const handleDismissWelcome = () => {
		localStorage.setItem('hasSeenResumeWelcome', 'true')
		setWelcomeMessage(false)
	}

	useEffect(() => {
		if (!tailorIntent) {
			lastTailorResultRef.current = null
			setTailorReviewMode('expanded')
			return
		}
		if (aiTailorPhase === 'requesting' || aiTailorPhase === 'error') {
			setTailorReviewMode('expanded')
			return
		}
		if (aiTailorPhase !== 'reviewing' || !aiTailorResult) return
		if (lastTailorResultRef.current === aiTailorResult) return
		lastTailorResultRef.current = aiTailorResult
		setTailorReviewMode('expanded')
	}, [tailorIntent, aiTailorPhase, aiTailorResult])

	const tailorReviewOwnsPanel = Boolean(
		tailorIntent &&
		(
			aiTailorPhase === 'requesting' ||
			aiTailorPhase === 'error' ||
			(aiTailorPhase === 'reviewing' && tailorReviewMode === 'expanded')
		)
	)

	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 pl-8 pt-8 pb-8 pr-4 overflow-y-auto [scrollbar-gutter:stable]"
		>
			<EditorChrome />

			<TailorAssistPanel
				tailorIntent={tailorIntent}
				aiTailorResult={aiTailorResult}
				aiTailorPhase={aiTailorPhase}
				tailorLayoutPreview={tailorLayoutPreview}
				onShowTailorFinalLayout={onShowTailorFinalLayout}
				mode={tailorReviewMode}
				onContinue={() => setTailorReviewMode('collapsed')}
				onReopen={() => setTailorReviewMode('expanded')}
			/>

			{!tailorReviewOwnsPanel ? (
				<>
					{welcomeMessage && !tailorIntent && (
						<WelcomeMessage
							user={user}
							onDismiss={handleDismissWelcome}
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
				</>
			) : null}
		</aside>
	)
}

export default LeftPanel
