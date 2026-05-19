// pages/5resume/ResumePreview.jsx — main resume editor + preview; helpers in utils/resumePreviewHelpers.js

import toast from 'react-hot-toast'
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// --- api imports.
import { generateResumePDF, generateResumeWord } from '@/api/services/resume'

// --- main ui component imports.
import LeftPanel from './components/left/LeftPanel'
import RightPanel from './components/right/RightPanel'

// --- utility imports.
import { validateResumeData } from './utils/resumeValidation'
import { applyVisibilityFilters, downloadBlob, normalizeSectionOrder } from './utils/resumeDataTransform'
import { snapshotResumeBaseline, defaultSectionVisibility, createEmptyResumeData } from './utils/resumePreviewHelpers'
import { normalizeTemplateSlug, DEFAULT_STYLE_PREFERENCES, defaultSectionLabels } from './utils/resumePreviewConstants'

// --- hooks.
import { useDebouncedPreviews } from './hooks/useDebouncedPreviews'
import { usePanelResize } from './hooks/usePanelResize'
import { useUnsavedBaseline } from './hooks/useUnsavedBaseline'
import { useResumePreviewBootstrap } from './hooks/useResumePreviewBootstrap'
import { useTemplatesFlow } from './hooks/useTemplatesFlow'
import { useTailorJob } from './hooks/useTailorJob'
import { useSavedResumesSidecar } from './hooks/useSavedResumesSidecar'

function isAbortError(error) {
	return error?.name === 'AbortError'
}

// ----------- main component -----------
function ResumePreview() {

    // --- navigation state.
	const navigate = useNavigate()
	const location = useLocation()

	// come back to this i don't like this state.
	const tailorIntent = location.state?.createMode === 'tailor' ? location.state?.tailorIntent : null

	// user state.
	const [user, setUser] = useState(null)

	// --- template states.
	const [template, setTemplate] = useState('classic')
	const [availableTemplates, setAvailableTemplates] = useState(['classic'])
	const [templateStyling, setTemplateStyling] = useState({})
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
	const [stylePreferences, setStylePreferences] = useState(() => ({ ...DEFAULT_STYLE_PREFERENCES }))

	// --- left panel state.
	const { leftPanelWidth, isResizing, handleMouseDown, handleDoubleClick } = usePanelResize()

	// --- right panel state.
	const [downloadStatus, setDownloadStatus] = useState(null)
	const downloadControllerRef = useRef(null)

	useEffect(() => {
		return () => {
			downloadControllerRef.current?.abort()
		}
	}, [])

	// when a tailor run has finished, optionally preview the pre-tailor resume in the right panel only.
	const [resumePreviewCompareMode, setResumePreviewCompareMode] = useState('tailored')

	// tailor-only: "compare" = HTML original/tailored only; "final" = user asked for print-accurate (exact) PDF in the main preview.
	const [tailorLayoutPreview, setTailorLayoutPreview] = useState(null)
	const tailorSnapshotRef = useRef(null)

	// Full GET /profile/me payload for "choose from profile" — merge on save so bulk writes don’t drop unselected rows.
	const chooseFullProfileRef = useRef(null)

	// section order & labels state (order from profile/saved resume/tailor via bootstrap + handlers; default when absent).
	const [sectionOrder, setSectionOrder] = useState(() => normalizeSectionOrder(null))
	const [sectionLabels, setSectionLabels] = useState(defaultSectionLabels)

	// resume data state.
	const [resumeData, setResumeData] = useState(createEmptyResumeData)

	// --- hook calls -> states ---

	// this tracks the unsaved baseline data.
	const {
		baselineData,
		setBaselineData,
		hasSetBaseline,
		showSaveBanner,
		setShowSaveBanner,
		changeDescriptions,
	} = useUnsavedBaseline(resumeData)

	// this grabs the user's profile data & initializes the state (e.g. choose, start fresh, no mode)
	useResumePreviewBootstrap({
		navigate,
		location,
		sectionOrder,
		setUser,
		setResumeData,
		setSectionOrder,
		setSectionLabels,
		chooseFullProfileRef,
	})

	// this fetches templates data & sets our initial state.
	useTemplatesFlow({
		location,
		navigate,
		isLoadingTemplates,
		availableTemplates,
		setAvailableTemplates,
		setTemplateStyling,
		setIsLoadingTemplates,
		setTemplate,
		setStylePreferences,
	})

	// payload for downloads, save, and the live editor (always the current resume in state).
	const editorVisibleResumePayload = useMemo(
		() => ({
			...applyVisibilityFilters(resumeData),
			sectionLabels,
		}),
		[resumeData, sectionLabels]
	)

	// call the resume tailoring request & get new data if tailor intent is present.
	const { aiTailorResult, aiTailorPhase, preTailorSnapshot } = useTailorJob({
		tailorIntent,
		hasSetBaseline,
		resumeData,
		sectionLabels,
		template,
		setResumeData,
		setSectionOrder,
	})

	// drop back to the tailored preview when there is no snapshot (new run or left tailor flow).
	useEffect(() => {
		if (!preTailorSnapshot) {
			setResumePreviewCompareMode('tailored')
		}
	}, [preTailorSnapshot])

	// reset tailor layout step when leaving tailor; new snapshot in reviewing → start in HTML-compare (no exact PDF until the user opts in).
	useEffect(() => {
		if (!tailorIntent) {
			setTailorLayoutPreview(null)
			tailorSnapshotRef.current = null
			return
		}
		if (!preTailorSnapshot) {
			setTailorLayoutPreview(null)
			tailorSnapshotRef.current = null
			return
		}
		if (aiTailorPhase !== 'reviewing') {
			return
		}
		if (tailorSnapshotRef.current === preTailorSnapshot) {
			return
		}
		tailorSnapshotRef.current = preTailorSnapshot
		setTailorLayoutPreview('compare')
	}, [tailorIntent, preTailorSnapshot, aiTailorPhase])

	// only generate/show exact PDF in the main canvas after the user asks; non-tailor pages behave as before.
	const allowExactPdfForTailor = !tailorIntent || tailorLayoutPreview === 'final'

	// what the right panel renders: live tailored state or the stored pre-merge snapshot.
	const isPreviewingOriginal = Boolean(preTailorSnapshot && resumePreviewCompareMode === 'original')
	const previewVisibleResumePayload = useMemo(
		() =>
			isPreviewingOriginal && preTailorSnapshot
				? {
						...applyVisibilityFilters(preTailorSnapshot.resumeData),
						sectionLabels: preTailorSnapshot.sectionLabels,
					}
				: editorVisibleResumePayload,
		[editorVisibleResumePayload, isPreviewingOriginal, preTailorSnapshot]
	)
	const previewResumeDataForValidation = isPreviewingOriginal && preTailorSnapshot
		? preTailorSnapshot.resumeData
		: resumeData

	// this is the key that is used to store the preview in the cache.
	const previewInputKey = useMemo(
		() =>
			JSON.stringify({
				template,
				previewData: previewVisibleResumePayload,
				stylePreferences,
				compare: resumePreviewCompareMode,
			}),
		[template, previewVisibleResumePayload, stylePreferences, resumePreviewCompareMode]
	)

	// this is the debounced previews hook.
	const {
		previewHtml,
		isGeneratingPreview,
		exactPdfBlobUrl,
		exactPdfBlob,
		isExactPdfFresh,
		exactPdfRefreshing,
		validationIssues,
		refreshDraftNow,
	} = useDebouncedPreviews({
		resumeData: previewResumeDataForValidation,
		visibleResumePayload: previewVisibleResumePayload,
		previewInputKey,
		template,
		stylePreferences,
		tailorIntent,
		aiTailorPhase,
		allowExactPdfPreview: allowExactPdfForTailor,
	})

	// this is the saved resumes sidecar hook.
	const {
		savedResumes,
		savedResumesOpen,
		setSavedResumesOpen,
		isSavingResume,
		saveResumeName,
		setSaveResumeName,
		handleSaveForLater,
		loadSavedResumeIntoState,
		handleDeleteSaved,
	} = useSavedResumesSidecar({
		user,
		location,
		navigate,
		resumeData,
		template,
		sectionOrder,
		sectionLabels,
		stylePreferences,
		tailorIntent,
		setResumeData,
		setBaselineData,
		setSectionOrder,
		setSectionLabels,
		setStylePreferences,
		setTemplate,
	})

	// ----- event handlers -----

	// refreshes our preview.
	const handleRefreshPreview = async () => {
		// try to refresh draft preview (w/ quick html refresh)
		const ok = await refreshDraftNow()

		// if we failed to refresh the draft, show a toast error.
		if (!ok && validateResumeData(resumeData).length === 0) {
			toast.error('Could not refresh preview.')
		}
	}

	// downloads relevant document.
	const handleDownloadDocument = async (type) => {
		// is this a word document?
		const isWord = type === 'word'

		// set the download status to loading.
		setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'loading' })
		downloadControllerRef.current?.abort()
		const controller = new AbortController()
		downloadControllerRef.current = controller

		// try to generate the document.
		try {
			if (!isWord && exactPdfBlob && isExactPdfFresh) {
				downloadBlob(exactPdfBlob, 'resume.pdf')
				setDownloadStatus({ type: 'pdf', phase: 'success' })
				window.setTimeout(() => setDownloadStatus(null), 1800)
				return
			}

			// generate the document.
			const blob = isWord
				? await generateResumeWord(template, editorVisibleResumePayload, stylePreferences, {
						signal: controller.signal,
					})
				: await generateResumePDF(template, editorVisibleResumePayload, stylePreferences, {
						signal: controller.signal,
					})

			// download the document.
			downloadBlob(blob, isWord ? 'resume.docx' : 'resume.pdf')

			// set the download status to success.
			setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'success' })

			// set the download status to null after 2.2 seconds.
			window.setTimeout(() => setDownloadStatus(null), 2200)
		} catch (error) {
			if (isAbortError(error)) return
			// if we run into an error, show a toast error.
			console.error('Download failed:', error)
			toast.error(isWord ? 'Could not generate the Word document. Try again.' : 'Could not generate the PDF. Try again.')
			setDownloadStatus({ type: isWord ? 'word' : 'pdf', phase: 'error' })
			window.setTimeout(() => setDownloadStatus(null), 2400)
		} finally {
			if (downloadControllerRef.current === controller) {
				downloadControllerRef.current = null
			}
		}
	}

	// discards changes.
	const handleDiscardChanges = () => {
		// if we have set the baseline, reset the resume data.
		if (hasSetBaseline) {
			// create the reset data.
			const resetData = {
				...snapshotResumeBaseline(baselineData),
				sectionVisibility: resumeData.sectionVisibility || defaultSectionVisibility,
				sectionOrder: normalizeSectionOrder(resumeData.sectionOrder),
			}

			// set the resume data.
			setResumeData(resetData)
			setSectionOrder(resetData.sectionOrder)
		}

		// set the show save banner to false.
		setShowSaveBanner(false)
	}

	// ----- data changers / savers -----

	const handleHeaderChange = useCallback((exportedHeader) => {
		setResumeData(prev => ({ ...prev, header: exportedHeader }))
	}, [])

	const handleEducationChange = useCallback((exportedEducation) => {
		setResumeData(prev => ({ ...prev, education: exportedEducation }))
	}, [])

	const handleExperienceChange = useCallback((exportedExperience) => {
		setResumeData(prev => ({ ...prev, experience: exportedExperience }))
	}, [])

	const handleProjectsChange = useCallback((exportedProjects) => {
		setResumeData(prev => ({ ...prev, projects: exportedProjects }))
	}, [])

	const handleSkillsChange = useCallback((exportedSkills) => {
		setResumeData(prev => ({ ...prev, skills: exportedSkills }))
	}, [])

	const handleHideSkill = useCallback((skillId) => {
		setResumeData((prev) => {
			const skills = prev.skills || []
			const skill = skills.find((s) => String(s.id ?? s) === String(skillId))
			if (!skill) return prev
			const newSkills = skills.filter((s) => String(s.id ?? s) !== String(skillId))
			const newHidden = [...(prev.hiddenSkills || []), { ...skill, id: skill.id ?? skillId }]
			return { ...prev, skills: newSkills, hiddenSkills: newHidden }
		})
	}, [])

	const handleShowSkill = useCallback((skillId, opts) => {
		setResumeData((prev) => {
			const hidden = prev.hiddenSkills || []
			const skill = hidden.find((s) => String(s.id ?? s) === String(skillId))
			if (!skill) return prev
			const newHidden = hidden.filter((s) => String(s.id ?? s) !== String(skillId))
			const shown = { ...skill, id: skill.id ?? skillId }
			if (opts && 'category' in opts) {
				shown.category = opts.category ?? ''
			}
			const newSkills = [...(prev.skills || []), shown]
			return { ...prev, skills: newSkills, hiddenSkills: newHidden }
		})
	}, [])

	const handleSkillsCategoryOrderChange = useCallback((categoryOrder) => {
		setResumeData(prev => ({ ...prev, skillsCategoryOrder: categoryOrder }))
	}, [])

	const handleSummaryChange = useCallback((exportedSummary) => {
		setResumeData((prev) => ({
			...prev,
			summary: exportedSummary,
			sectionVisibility: prev.sectionVisibility || { ...defaultSectionVisibility },
		}))
	}, [])

	const handleSectionOrderChange = (newOrder) => {
		const normalized = normalizeSectionOrder(newOrder)
		setSectionOrder(normalized)
		setResumeData(prev => ({ ...prev, sectionOrder: normalized }))
	}

	const handleVisibilityChange = (sectionKey, isVisible) => {
		setResumeData(prev => ({
			...prev,
			sectionVisibility: {
				...prev.sectionVisibility,
				[sectionKey]: isVisible,
			}
		}))
	}

	const handleSectionLabelChange = useCallback(
		async (sectionKey, newLabel) => {
			const updatedLabels = { ...sectionLabels, [sectionKey]: newLabel }
			setSectionLabels(updatedLabels)

			// Section labels are local to this resume version in the editor.
			if (previewHtml) {
				const nextPayload = { ...applyVisibilityFilters(resumeData), sectionLabels: updatedLabels }
				const nextKey = JSON.stringify({ template, previewData: nextPayload, stylePreferences })
				const ok = await refreshDraftNow({ visibleResumePayload: nextPayload, previewInputKey: nextKey })
				if (!ok && validateResumeData(resumeData).length === 0) {
					console.error('Failed to refresh preview after label change')
				}
			}
		},
		[sectionLabels, previewHtml, resumeData, template, stylePreferences, refreshDraftNow]
	)

	// saves changes.
	const handleSaveChanges = async () => {
		const ok = await handleSaveForLater({ closePopover: true })
		if (ok) {
			setShowSaveBanner(false)
		}
		return Boolean(ok)
		/*

		// set the saving flag to true.
		setIsSaving(true)

		// try to save the changes.
		try {
			// save contact/header info.
			const header = resumeData.header

			// try to save the contact/header info.
			await upsertContact({
				phone: header.phone || null,
				location: header.location || null,
				github: header.github || null,
				linkedin: header.linkedin || null,
				portfolio: header.portfolio || null,
				tagline: (header.tagline ?? '').trim(),
			})

			const locState = location.state || {}
			const chooseSnapshot = chooseFullProfileRef.current
			const mergeChoose =
				locState.createMode === 'choose' && chooseSnapshot &&
				(locState.selectedEducationIds || locState.selectedExperienceIds || locState.selectedProjectIds)

			// Bulk endpoints replace collections; choose-flow editor only holds selected rows unless we merge in the rest unchanged.
			let educationToSave = resumeData.education.map(normalizeEducationForBackend)
			let experienceToSave = resumeData.experience.map(normalizeExperienceForBackend)
			let projectsToSave = resumeData.projects.map(normalizeProjectForBackend)

			if (mergeChoose) {
				educationToSave = mergeEducationForChooseProfileSave(resumeData.education, chooseSnapshot.education)
				experienceToSave = mergeExperienceForChooseProfileSave(resumeData.experience, chooseSnapshot.experiences)
				projectsToSave = mergeProjectForChooseProfileSave(resumeData.projects, chooseSnapshot.projects)
			}

			await setupEducation(educationToSave)

			await setupExperiences(experienceToSave)

			await setupProjects(projectsToSave)

			// save skills (bulk replace) - include both visible and hidden (full pool to profile)
			const allSkills = [...(resumeData.skills || []), ...(resumeData.hiddenSkills || [])]
			const skillsToSave = allSkills.map(normalizeSkillForBackend)
			await setupSkills(skillsToSave)

			// save summary (update if it exists, create if it doesn't)
			if (resumeData.summary && resumeData.summary.summary) {
				await createSummary({ summary: resumeData.summary.summary })
			}

			// persist header visibility and contactOrder to localStorage so they survive page reload.
			if (resumeData.header?.visibility) {
				localStorage.setItem('resumeHeaderVisibility', JSON.stringify(resumeData.header.visibility))
			}
			if (resumeData.header?.contactOrder) {
				localStorage.setItem('resumeHeaderContactOrder', JSON.stringify(resumeData.header.contactOrder))
			}

			// set the baseline data.
			setBaselineData(snapshotResumeBaseline(resumeData))

			// Refresh choose-flow snapshot so the next save still merges against up-to-date ids and untouched rows.
			if (mergeChoose) {
				try {
					const refreshed = await getMyProfile()
					const data = refreshed.data || refreshed
					if (data) chooseFullProfileRef.current = structuredClone(data)
				} catch {
					// non-fatal — next save still uses previous snapshot for unselected rows
				}
			}

			// set the show save banner to false.
			setShowSaveBanner(false)

			// return true.
			return true
		} catch (error) {
			console.error('Failed to save changes:', error)
			alert('Failed to save changes. Please try again.')
			return false
		} finally {
			setIsSaving(false)
		}
		*/
	}

	return (
		<div className="flex h-screen overflow-hidden bg-[#f5f0f0]">
			<main className="flex min-h-0 w-full flex-1 overflow-hidden">
				<LeftPanel
					width={leftPanelWidth}
					user={user}
					sectionOrder={sectionOrder}
					onSectionOrderChange={handleSectionOrderChange}
					template={template}
					onTemplateChange={(t) => setTemplate(normalizeTemplateSlug(t))}
					availableTemplates={availableTemplates}
					templateStyling={templateStyling}
					isLoadingTemplates={isLoadingTemplates}
					stylePreferences={stylePreferences}
					onStylePreferenceChange={(key, value) => {
						setStylePreferences((prev) => ({ ...prev, [key]: value }))
					}}
					onScrollToSection={(sectionKey) => {
						const element = document.getElementById(`section-${sectionKey}`)
						if (element) {
							element.scrollIntoView({ behavior: 'smooth', block: 'start' })
						}
					}}
					resumeData={resumeData}
					onHeaderChange={handleHeaderChange}
					onEducationChange={handleEducationChange}
					onExperienceChange={handleExperienceChange}
					onProjectsChange={handleProjectsChange}
					onSkillsChange={handleSkillsChange}
					onHideSkill={handleHideSkill}
					onShowSkill={handleShowSkill}
					onSkillsCategoryOrderChange={handleSkillsCategoryOrderChange}
					onSummaryChange={handleSummaryChange}
					onVisibilityChange={handleVisibilityChange}
					sectionLabels={sectionLabels}
					onSectionLabelChange={handleSectionLabelChange}
					tailorIntent={tailorIntent}
					aiTailorResult={aiTailorResult}
					aiTailorPhase={aiTailorPhase}
					tailorLayoutPreview={tailorLayoutPreview}
					onShowTailorFinalLayout={() => setTailorLayoutPreview('final')}
				/>

				{/* resizable divider */}
				<div
					onMouseDown={handleMouseDown}
					onDoubleClick={handleDoubleClick}
					title="Drag to resize • Double-click to reset"
					className={`w-1 cursor-col-resize bg-brand-pink/12 transition-colors hover:bg-brand-pink ${isResizing ? 'bg-brand-pink' : ''}`}
				/>
				
				<RightPanel
					previewHtml={previewHtml}
					isGeneratingPreview={isGeneratingPreview}
					downloadStatus={downloadStatus}
					onDownloadDocument={handleDownloadDocument}
					onRefreshPreview={handleRefreshPreview}
					validationIssues={validationIssues}
					exactPdfUrl={exactPdfBlobUrl}
					isExactPdfFresh={isExactPdfFresh}
					exactPdfRefreshing={exactPdfRefreshing}
					showSaveBanner={showSaveBanner}
					saveChangedSections={changeDescriptions}
					isSavingResume={isSavingResume}
					onDiscardChanges={handleDiscardChanges}
					onSaveChanges={handleSaveChanges}
					savedResumes={savedResumes}
					savedResumesOpen={savedResumesOpen}
					onToggleSavedResumes={() => setSavedResumesOpen((v) => !v)}
					onCloseSavedResumes={() => setSavedResumesOpen(false)}
					saveResumeName={saveResumeName}
					onSaveResumeNameChange={setSaveResumeName}
					isSavingResumeForLater={isSavingResume}
					onSaveForLater={handleSaveForLater}
					onLoadSaved={loadSavedResumeIntoState}
					onDeleteSaved={handleDeleteSaved}
					canCompareTailoredResume={Boolean(preTailorSnapshot) && aiTailorPhase === 'reviewing'}
					resumePreviewCompareMode={resumePreviewCompareMode}
					onResumePreviewCompareModeChange={setResumePreviewCompareMode}
					showExactPdfInCanvas={allowExactPdfForTailor}
					isTailorHtmlCompare={Boolean(
						tailorIntent && tailorLayoutPreview === 'compare' && preTailorSnapshot
					)}
				/>
			</main>
		</div>
	)
}

export default ResumePreview
