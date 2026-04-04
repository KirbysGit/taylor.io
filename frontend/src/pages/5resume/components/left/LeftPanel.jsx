// components / left / LeftPanel.jsx

// Left panel: AI context + styling + organize view.

import { useState } from 'react'
import WelcomeMessage from './WelcomeMessage'
import ResumeStyling from './ResumeStyling'
import SimpleResumeSections from './SimpleResumeSections'

function TailorAssistPanel({ tailorIntent, aiTailorResult }) {
	const [isOpen, setIsOpen] = useState(true)
	if (!tailorIntent) return null

	const suggestions = aiTailorResult?.suggestions || []
	const hasOutput = suggestions.length > 0
	const keywords = (aiTailorResult?.ats_keywords || []).slice(0, 3)

	return (
		<section className="landing-hero-mesh relative mb-5 overflow-hidden rounded-xl border border-brand-pink/25 p-4 text-white shadow-[0_14px_36px_-16px_rgba(214,86,86,0.45)]">
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
			<div className="landing-hero-orb pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
			<div className="flex items-start justify-between gap-3">
				<div className="relative min-w-0">
					<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90">
						<span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
							<span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white/80" />
							<span className="relative h-1.5 w-1.5 rounded-full bg-white" />
						</span>
						Taylor.io Assist
					</div>
					<p className="mt-2 text-sm font-semibold text-white truncate">
						{tailorIntent.jobTitle || 'Role not set'}
						{tailorIntent.company ? ` · ${tailorIntent.company}` : ''}
					</p>
					<p className="mt-1 text-xs text-white/90">
						{hasOutput ? 'Suggestions ready to review' : 'Taylor.io working on tailored guidance...'}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsOpen((v) => !v)}
					className="relative rounded-md border border-white/25 bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
				>
					{isOpen ? 'Hide' : 'Show'}
				</button>
			</div>

			{isOpen && (
				<div className="relative mt-3 space-y-3">
					<div className="flex flex-wrap items-center gap-1.5 text-xs text-white/90">
						<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25 capitalize">
							Focus: {tailorIntent.focus || 'balanced'}
						</span>
						<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25 capitalize">
							Tone: {tailorIntent.tone || 'balanced'}
						</span>
						{tailorIntent.strictTruth ? (
							<span className="rounded bg-white/15 px-2 py-0.5 ring-1 ring-white/25">Strict truth</span>
						) : null}
					</div>

					{hasOutput ? (
						<div className="rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
							<div className="mb-2 flex items-center gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/30">
									<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5m6 5H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z" />
									</svg>
								</div>
								<p className="text-xs font-semibold text-gray-900">Assist output</p>
							</div>
							<div className="space-y-2 rounded-md bg-white p-2.5 ring-1 ring-gray-200">
								<p className="text-xs leading-relaxed">
									From the description for <span className="font-semibold">{tailorIntent.jobTitle || 'this role'}</span>, we noticed they are looking for{' '}
									<span className="font-semibold">{keywords.length ? keywords.join(', ') : 'role-relevant outcomes'}</span>.
								</p>
								<p className="text-xs leading-relaxed">
									Here is how we updated your data: we prioritized your most relevant projects, experience, and education entries and adjusted language for better ATS alignment.
								</p>
								{aiTailorResult?.summary ? (
									<p className="text-xs leading-relaxed text-gray-700">{aiTailorResult.summary}</p>
								) : null}
							</div>
						</div>
					) : (
						<div className="rounded-lg border border-white/25 bg-white/90 p-3 text-gray-800">
							<div className="mb-2 flex items-center gap-2">
								<div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/30">
									<svg className="h-3.5 w-3.5 animate-wave" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a3.75 3.75 0 00-3.75 3.75v.24a6.75 6.75 0 105.7 0v-.24A3.75 3.75 0 009.75 3zM14.25 3a3.75 3.75 0 013.75 3.75v.24a6.75 6.75 0 11-5.7 0v-.24A3.75 3.75 0 0114.25 3z" />
									</svg>
								</div>
								<p className="text-xs font-semibold text-gray-900">Thinking...</p>
							</div>
							<p className="text-xs leading-relaxed">
								We are reviewing your profile and identifying the entries most applicable to this role. Next, we will recommend how to prioritize and phrase your content for stronger ATS fit.
							</p>
						</div>
					)}
				</div>
			)}
		</section>
	)
}

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
}) {
	return (
		<aside 
			style={{ width: `${width}px` }} 
			className="flex-shrink-0 bg-white border-r border-gray-200 pl-8 pt-8 pb-8 pr-4 overflow-y-auto [scrollbar-gutter:stable]"
		>
			<TailorAssistPanel tailorIntent={tailorIntent} aiTailorResult={aiTailorResult} />

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
