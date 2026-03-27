import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faPencil, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons';
import { XIcon } from '@/components/icons';
import { shouldDefaultToBullets, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';
import MonthYearPicker from './MonthYearPicker';

function AnimatedExpand({ expanded, children }) {
	return (
		<div
			className="grid transition-[grid-template-rows] duration-150 ease-out"
			style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
		>
			<div className="min-h-0 overflow-hidden">{children}</div>
		</div>
	)
}

// Experience Input Component - Just the form fields and logic, no headers
const ExperienceInput = ({ experiences, onAdd, onRemove, onUpdate, onReorder }) => {
	// ensure at least one empty entry exists
	const entries = experiences.length > 0 ? experiences : [{ 
		id: Date.now(), 
		title: '', 
		company: '', 
		description: '', 
		skills: '', 
		location: '', 
		startDate: '', 
		endDate: '', 
		current: false 
	}]

	const getEntryId = (entry, index) => String(entry?.id ?? index)
	const [expandedIds, setExpandedIds] = useState(() => new Set()) // collapsed by default
	const [localEntries, setLocalEntries] = useState(entries)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const prevLengthRef = useRef(experiences.length)
	const prevIdsRef = useRef(experiences.map(e => e.id || e).join(','))
	const lastDragEndRef = useRef(0)
	// store previous end dates when toggling "current" to preserve them
	const savedEndDatesRef = useRef(new Map())
	const pendingTitleFocusEntryIdRef = useRef(null)
	/** True only when user clicked "+ Add" — avoids auto-expanding on async 0→1 data load */
	const addFromButtonRef = useRef(false)

	// After "+ Add Experience": scroll card + focus job title when expanded (AnimatedExpand ~150ms)
	useEffect(() => {
		const targetId = pendingTitleFocusEntryIdRef.current
		if (targetId == null) return
		const isOpen = [...expandedIds].some((id) => String(id) === targetId)
		if (!isOpen) return

		let cancelled = false
		const t = window.setTimeout(() => {
			if (cancelled) return
			let card = document.getElementById(`experience-card-${targetId}`)
			let input = document.getElementById(`experience-title-${targetId}`)
			if ((!card || !input) && localEntries.length > 0) {
				const lastIdx = localEntries.length - 1
				const fallbackId = getEntryId(localEntries[lastIdx], lastIdx)
				card = card || document.getElementById(`experience-card-${fallbackId}`)
				input = input || document.getElementById(`experience-title-${fallbackId}`)
			}
			if (card) {
				card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
			}
			if (input) {
				input.focus()
				input.select()
			}
			pendingTitleFocusEntryIdRef.current = null
		}, 200)

		return () => {
			cancelled = true
			window.clearTimeout(t)
		}
	}, [localEntries, expandedIds])

	// sync with prop changes only when structure changes (add/remove), not field updates
	useEffect(() => {
		const currentLength = experiences.length
		const currentIds = experiences.map(e => e.id || e).join(',')
		
		// only sync if the length changed or IDs changed (structure change, not field update)
		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const newEntries = experiences.length > 0 ? experiences : [{ 
				id: Date.now(), 
				title: '', 
				company: '', 
				description: '', 
				skills: '', 
				location: '', 
				startDate: '', 
				endDate: '', 
				current: false 
			}]
			setLocalEntries(newEntries)
			// reset description modes so they re-initialize from the new entries (preserves bullet vs paragraph)
			setDescriptionModes({})
			setDescriptionBullets({})

			// preserve expanded/collapsed state by ID (survives add/remove)
			// only expand newly added when user added one (not when data loads from empty)
			if (currentLength > prevLengthRef.current && prevLengthRef.current > 0 && currentLength === prevLengthRef.current + 1) {
				setExpandedIds(prev => {
					const newSet = new Set(prev)
					const newEntry = newEntries[currentLength - 1]
					newSet.add(getEntryId(newEntry, currentLength - 1)) // expand only the newly added
					return newSet
				})
			} else if (currentLength > prevLengthRef.current) {
				const delta = currentLength - prevLengthRef.current
				if (delta > 1) {
					addFromButtonRef.current = false
					setExpandedIds(new Set())
				} else if (delta === 1 && prevLengthRef.current === 0 && addFromButtonRef.current) {
					addFromButtonRef.current = false
					const newEntry = newEntries[currentLength - 1]
					setExpandedIds(new Set([getEntryId(newEntry, currentLength - 1)]))
				} else if (delta === 1 && prevLengthRef.current === 0) {
					setExpandedIds(new Set())
				}
			} else {
				// removing - keep only IDs that still exist; default to collapsed
				const currentIds = new Set(newEntries.map((e, i) => getEntryId(e, i)))
				setExpandedIds(prev => {
					const filtered = new Set([...prev].filter(id => currentIds.has(id)))
					return filtered
				})
			}

			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [experiences])

	// initialize description modes based on existing descriptions (default to bullets when newline-separated)
	useEffect(() => {
		localEntries.forEach((entry, index) => {
			if (descriptionModes[index] === undefined) {
				const desc = entry.description || ''
				const useBullets = shouldDefaultToBullets(desc)
				setDescriptionModes(prev => ({ ...prev, [index]: useBullets ? 'bullets' : 'paragraph' }))
				if (useBullets) {
					setDescriptionBullets(prev => ({ ...prev, [index]: paragraphToBullets(desc) }))
				} else {
					setDescriptionBullets(prev => ({ ...prev, [index]: [''] }))
				}
			}
		})
	}, [localEntries])

	const toggleExpanded = (index) => {
		const entryId = getEntryId(localEntries[index], index)
		setExpandedIds(prev => {
			const newSet = new Set(prev)
			if (newSet.has(entryId)) {
				newSet.delete(entryId)
			} else {
				newSet.add(entryId)
			}
			return newSet
		})
	}

	const handleFieldChange = (index, field, value) => {
		const entryId = localEntries[index]?.id ?? index
		const updatedEntry = { ...localEntries[index], [field]: value }
		if (field === 'current' && value) {
			// save current end date before clearing it
			const currentEndDate = updatedEntry.endDate || updatedEntry.end_date || ''
			if (currentEndDate) {
				savedEndDatesRef.current.set(entryId, currentEndDate)
			}
			updatedEntry.endDate = ''
			updatedEntry.end_date = ''
		} else if (field === 'current' && !value) {
			// restore saved end date when toggling current off
			const savedEndDate = savedEndDatesRef.current.get(entryId)
			if (savedEndDate) {
				updatedEntry.endDate = savedEndDate
				updatedEntry.end_date = savedEndDate
				savedEndDatesRef.current.delete(entryId)
			}
		}
		if (field === 'endDate' && value) {
			updatedEntry.current = false
			savedEndDatesRef.current.delete(entryId)
		}
		
		// update local state immediately for responsive UI
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		
		// update parent
		onUpdate(index, updatedEntry)
	}

	const handleDescriptionModeToggle = (index) => {
		const currentMode = descriptionModes[index] || 'paragraph'
		const newMode = currentMode === 'paragraph' ? 'bullets' : 'paragraph'
		const currentDescription = localEntries[index]?.description || ''
		
		if (newMode === 'bullets') {
			// Convert paragraph to bullets
			const bullets = paragraphToBullets(currentDescription)
			setDescriptionBullets(prev => ({ ...prev, [index]: bullets.length > 0 ? bullets : [''] }))
			const bulletString = bulletsToParagraph(bullets)
			handleFieldChange(index, 'description', bulletString)
		} else {
			// Convert bullets to paragraph (remove bullet prefix)
			const bullets = descriptionBullets[index] || ['']
			const paragraph = bullets.filter(b => b.trim()).join('\n')
			handleFieldChange(index, 'description', paragraph)
		}
		
		setDescriptionModes(prev => ({ ...prev, [index]: newMode }))
	}

	const handleBulletChange = (index, bulletIndex, value) => {
		const currentBullets = descriptionBullets[index] || ['']
		const newBullets = [...currentBullets]
		newBullets[bulletIndex] = value
		setDescriptionBullets(prev => ({ ...prev, [index]: newBullets }))
		
		// Update description field with bullet format
		const bulletString = bulletsToParagraph(newBullets)
		handleFieldChange(index, 'description', bulletString)
	}

	const handleAddBullet = (index) => {
		const currentBullets = descriptionBullets[index] || ['']
		setDescriptionBullets(prev => ({ ...prev, [index]: [...currentBullets, ''] }))
	}

	const handleRemoveBullet = (index, bulletIndex) => {
		const currentBullets = descriptionBullets[index] || ['']
		if (currentBullets.length <= 1) return // Keep at least one
		const newBullets = currentBullets.filter((_, i) => i !== bulletIndex)
		setDescriptionBullets(prev => ({ ...prev, [index]: newBullets }))
		
		// Update description field
		const bulletString = bulletsToParagraph(newBullets)
		handleFieldChange(index, 'description', bulletString)
	}

	const handleAddNew = () => {
		const newEntry = { 
			id: Date.now(), 
			title: '', 
			company: '', 
			description: '', 
			skills: '', 
			location: '', 
			startDate: '', 
			endDate: '', 
			current: false 
		}
		const idKey = getEntryId(newEntry, 0)
		addFromButtonRef.current = true
		pendingTitleFocusEntryIdRef.current = idKey
		setLocalEntries((prev) => {
			if (experiences.length === 0) return [newEntry]
			return [...prev, newEntry]
		})
		setExpandedIds((prev) => new Set([...prev, idKey]))
		onAdd(newEntry)
	}

	const handleReorder = (fromIndex, toIndex) => {
		if (fromIndex === toIndex || !onReorder) return
		const reordered = [...localEntries]
		const [removed] = reordered.splice(fromIndex, 1)
		reordered.splice(toIndex, 0, removed)
		setLocalEntries(reordered)
		onReorder(reordered)
	}

	const headerSection = (
		<div className="flex items-start justify-between gap-4 mb-4">
			<div>
				<h3 className="text-sm font-semibold text-gray-900">Your Experience Entries</h3>
				<p className="text-xs text-gray-500 mt-0.5">Add, edit, or reorder your work history. Click the pencil to expand.</p>
			</div>
			<button
				onClick={handleAddNew}
				className="px-3 py-1.5 text-sm font-medium border border-brand-pink text-brand-pink rounded-lg hover:bg-brand-pink hover:text-white transition-all flex-shrink-0"
			>
				+ Add Experience
			</button>
		</div>
	)

	return (
		<>
			{experiences.length > 0 ? (
				<div>
					{headerSection}
					<div className="space-y-3">
						{localEntries.map((exp, index) => {
							const isExpanded = expandedIds.has(getEntryId(exp, index))
							const hasContent = exp.title || exp.company
							const displayName = exp.title 
								? (exp.company ? `${exp.title} @ ${exp.company}` : exp.title)
								: (exp.company ? exp.company : (hasContent ? 'Incomplete' : 'New Experience'))
							const isDraggable = !!onReorder
							const isDragging = draggedEntryIndex === index
							const isDragOver = dragOverEntryIndex === index

							return (
								<div 
									key={exp.id || index}
									id={`experience-card-${getEntryId(exp, index)}`}
									onDragOver={isDraggable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverEntryIndex(index) } : undefined}
									onDragLeave={isDraggable ? () => setDragOverEntryIndex(null) : undefined}
									onDrop={isDraggable ? (e) => { e.preventDefault(); if (draggedEntryIndex != null) { handleReorder(draggedEntryIndex, index); setDraggedEntryIndex(null); setDragOverEntryIndex(null) } } : undefined}
									className={`min-w-0 rounded-xl border-l-4 border-brand-pink bg-white shadow transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isExpanded ? 'rounded-t-xl' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-brand-pink ring-dashed ring-offset-1 bg-brand-pink/5' : ''}`}
								>
									{/* Card bar - grip, label, pencil, trash */}
									<div className={`flex items-center gap-2 py-2.5 rounded-xl transition-colors ${isDraggable ? 'pl-3 pr-2' : 'pl-5 pr-2'} hover:bg-gray-50/50`}>
										{isDraggable ? (
											<div
												draggable
												onDragStart={(e) => {
													setDraggedEntryIndex(index)
													e.dataTransfer.effectAllowed = 'move'
													e.dataTransfer.setData('text/plain', String(index))
												}}
												onDragEnd={() => {
													lastDragEndRef.current = Date.now()
													setDraggedEntryIndex(null)
													setDragOverEntryIndex(null)
												}}
												className="flex-shrink-0 w-6 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing p-1 -m-1 touch-none"
												title="Drag to reorder"
											>
												<FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5" />
											</div>
										) : null}
										<span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">
											{displayName}
											{!hasContent && <span className="text-gray-500 font-normal ml-1">(click pencil to edit)</span>}
										</span>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation()
												if (Date.now() - lastDragEndRef.current < 150) return
												toggleExpanded(index)
											}}
											className={`flex-shrink-0 p-2 rounded-md transition-colors ${
												isExpanded ? 'bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20' : 'text-gray-500 hover:text-brand-pink hover:bg-gray-100'
											}`}
											aria-expanded={isExpanded}
											title={isExpanded ? 'Collapse' : 'Expand to edit'}
										>
											<FontAwesomeIcon icon={isExpanded ? faChevronUp : faPencil} className="w-3.5 h-3.5" />
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation()
												onRemove(index)
											}}
											className="flex-shrink-0 p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
											aria-label="Remove"
											title="Remove"
										>
											<FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
										</button>
									</div>

									{/* Expandable Content */}
									<AnimatedExpand expanded={isExpanded}>
										<div className="pt-4 pb-4 px-4 border-t border-gray-200 space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
										<div>
											<label className="label">Job Title</label>
											<input
												type="text"
												id={`experience-title-${getEntryId(exp, index)}`}
												value={localEntries[index]?.title || ''}
												onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
												className="input"
												placeholder="e.g., Software Engineer"
											/>
										</div>
										<div>
											<label className="label">Company</label>
											<input
												type="text"
												value={localEntries[index]?.company || ''}
												onChange={(e) => handleFieldChange(index, 'company', e.target.value)}
												className="input"
												placeholder="Company Name"
											/>
										</div>
										<div className="md:col-span-2">
											<label className="label">Tech Stack / Skills</label>
											<input
												type="text"
												value={localEntries[index]?.skills || ''}
												onChange={(e) => handleFieldChange(index, 'skills', e.target.value)}
												className="input"
												placeholder="e.g., Python, Django, React (comma-separated)"
											/>
										</div>
										<div className="md:col-span-2">
											{/* Description Label with Toggle */}
											<div className="grid grid-cols-3 items-center mb-1">
												<label className="label mb-0">Description</label>
												
												{/* Toggle Switch - div with role="switch" to avoid checkbox focus scroll bug */}
												<div className="flex justify-center items-center gap-2">
													<span className={`text-xs font-medium ${(descriptionModes[index] || 'paragraph') === 'paragraph' ? 'text-brand-pink' : 'text-gray-400'}`}>
														Paragraph
													</span>
													<div
														role="switch"
														aria-checked={(descriptionModes[index] || 'paragraph') === 'bullets'}
														aria-label="Toggle between paragraph and bullet list format"
														tabIndex={0}
														onClick={() => handleDescriptionModeToggle(index)}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault()
																handleDescriptionModeToggle(index)
															}
														}}
														onMouseDown={(e) => e.preventDefault()}
														className="flex items-center cursor-pointer select-none"
													>
														<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
															(descriptionModes[index] || 'paragraph') === 'bullets' ? 'bg-brand-pink' : 'bg-gray-300'
														}`}>
															<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
																(descriptionModes[index] || 'paragraph') === 'bullets' ? 'translate-x-6' : 'translate-x-0'
															}`}></div>
														</div>
													</div>
													<span className={`text-xs font-medium ${(descriptionModes[index] || 'paragraph') === 'bullets' ? 'text-brand-pink' : 'text-gray-400'}`}>
														Bullets
													</span>
												</div>
												
												{/* Spacer */}
												<div></div>
											</div>

											{/* Description Input - Conditional Rendering */}
											{(descriptionModes[index] || 'paragraph') === 'paragraph' ? (
												<textarea
													value={localEntries[index]?.description || ''}
													onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
													className="input min-h-[100px] resize-y"
													placeholder="Describe your responsibilities and achievements..."
												/>
											) : (
												<div className="space-y-2">
													{(descriptionBullets[index] || ['']).length === 0 ? (
														<div className="text-center py-6 text-gray-400 border border-gray-200 rounded-md">
															<p className="text-sm">No bullets yet. Click "Add Another Bullet" to get started.</p>
														</div>
													) : (
														(descriptionBullets[index] || ['']).map((bullet, bulletIndex) => (
															<div key={bulletIndex} className="flex items-center gap-2">
																<span className="text-gray-600 font-medium">•</span>
																<input
																	type="text"
																	value={bullet}
																	onChange={(e) => handleBulletChange(index, bulletIndex, e.target.value)}
																	className="flex-1 input"
																	placeholder="Enter a bullet point..."
																/>
																{(descriptionBullets[index] || ['']).length > 1 && (
																	<button
																		type="button"
																		onClick={() => handleRemoveBullet(index, bulletIndex)}
																		className="text-red-500 hover:text-red-700 transition-colors p-1"
																	>
																		<XIcon className="w-4 h-4" />
																	</button>
																)}
															</div>
														))
													)}
													<button
														type="button"
														onClick={() => handleAddBullet(index)}
														className="w-full px-3 py-2 bg-brand-pink text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
													>
														+ Add Another Bullet
													</button>
												</div>
											)}
										</div>
										<div>
											<div className="flex items-center min-h-8 mb-1">
												<label className="label mb-0">Start Date</label>
											</div>
											<MonthYearPicker
												value={localEntries[index]?.startDate || localEntries[index]?.start_date || ''}
												onChange={(v) => handleFieldChange(index, 'startDate', v)}
											/>
										</div>
										<div>
											{/* Label Row with Switch */}
											<div className="grid grid-cols-3 items-center min-h-8 mb-1">
												<label className="label mb-0">End Date</label>
												
												{/* Switch - div with role="switch" to avoid sr-only checkbox focus scroll bug */}
												<div className="flex justify-center">
													<div
														role="switch"
														aria-checked={localEntries[index]?.current || false}
														aria-label="Currently working here"
														tabIndex={0}
														onClick={() => handleFieldChange(index, 'current', !(localEntries[index]?.current))}
														onKeyDown={(e) => {
															if (e.key === 'Enter' || e.key === ' ') {
																e.preventDefault()
																handleFieldChange(index, 'current', !(localEntries[index]?.current))
															}
														}}
														onMouseDown={(e) => e.preventDefault()}
														className="flex items-center cursor-pointer select-none"
													>
														<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
															localEntries[index]?.current ? 'bg-brand-pink' : 'bg-gray-300'
														}`}>
															<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
																localEntries[index]?.current ? 'translate-x-6' : 'translate-x-0'
															}`}></div>
														</div>
													</div>
												</div>
												
												{/* Current Label - Right */}
												<div className="flex justify-end">
													<span className={`currentLabel ${
														localEntries[index]?.current ? 'active' : 'inactive'
													}`}>
														Current
													</span>
												</div>
											</div>
											
											{/* End Date Input */}
											<div className={localEntries[index]?.current ? 'opacity-50' : ''}>
												<MonthYearPicker
													value={localEntries[index]?.endDate || localEntries[index]?.end_date || ''}
													onChange={(v) => handleFieldChange(index, 'endDate', v)}
													disabled={localEntries[index]?.current}
												/>
											</div>
										</div>
										<div className="md:col-span-2">
											<label className="label">Location</label>
											<input
												type="text"
												value={localEntries[index]?.location || ''}
												onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
												className="input"
												placeholder="e.g., Remote, San Francisco, CA"
											/>
										</div>
									</div>
								</div>
								</AnimatedExpand>
							</div>
						)
					})}
					</div>
				</div>
			) : (
				<div>
					{headerSection}
					<div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
						<p className="text-gray-500 text-base">No experience yet. Click &quot;+ Add Experience&quot; above to get started.</p>
					</div>
				</div>
			)}
		</>
	)
}

export default ExperienceInput
