import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faPencil, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons';
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

// Education Input Component - Just the form fields and logic, no headers
const EducationInput = ({ education, onAdd, onRemove, onUpdate, onReorder, showSubsections = false, onSubsectionUpdate, compact = false }) => {
	// ensure at least one empty entry exists
	const entries = education.length > 0 ? education : [{ 
		id: Date.now(), 
		school: '', 
		degree: '', 
		discipline: '', 
		location: '',
		minor: '',
		gpa: '',
		startDate: '', 
		endDate: '', 
		current: false 
	}]

	const getEntryId = (entry, index) => entry?.id ?? index
	const [expandedIds, setExpandedIds] = useState(() => new Set()) // closed by default
	const [localEntries, setLocalEntries] = useState(entries)
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const [draggedSubsection, setDraggedSubsection] = useState(null) // { eduIndex, subIndex }
	const [dragOverSubsection, setDragOverSubsection] = useState(null) // { eduIndex, subIndex }
	const [editingSubsection, setEditingSubsection] = useState(null) // { eduIndex, subIndex, oldTitle }
	const [editingSubsectionValue, setEditingSubsectionValue] = useState('')
	const prevLengthRef = useRef(education.length)
	const prevIdsRef = useRef(education.map(e => e.id || e).join(','))
	// store previous end dates when toggling "current" to preserve them
	const savedEndDatesRef = useRef(new Map())
	// ignore pencil click that fires right after drag-end (browser can synthesize click on drop)
	const lastDragEndRef = useRef(0)

	// sync with prop changes only when structure changes (add/remove), not field updates
	useEffect(() => {
		const currentLength = education.length
		const currentIds = education.map(e => e.id || e).join(',')
		
		// only sync if the length changed or IDs changed (structure change, not field update)
		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const newEntries = education.length > 0 ? education : [{ 
				id: Date.now(), 
				school: '', 
				degree: '', 
				discipline: '', 
				location: '',
				minor: '',
				gpa: '',
				startDate: '', 
				endDate: '', 
				current: false 
			}]
			setLocalEntries(newEntries)

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
				// data loaded - keep all collapsed
				setExpandedIds(new Set())
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
	}, [education])

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
		const entryId = localEntries[index]?.id || index
		const updatedEntry = { ...localEntries[index], [field]: value }
		
		if (field === 'current' && value) {
			// saving current end date before clearing it
			const currentEndDate = updatedEntry.endDate || updatedEntry.end_date || ''
			if (currentEndDate) {
				savedEndDatesRef.current.set(entryId, currentEndDate)
			}
			updatedEntry.endDate = ''
			updatedEntry.end_date = ''
		} else if (field === 'current' && !value) {
			// restoring saved end date when toggling current off
			const savedEndDate = savedEndDatesRef.current.get(entryId)
			if (savedEndDate) {
				updatedEntry.endDate = savedEndDate
				updatedEntry.end_date = savedEndDate
				savedEndDatesRef.current.delete(entryId) // clear after restoring
			}
		}
		
		if (field === 'endDate' && value) {
			updatedEntry.current = false
			// clear saved end date if user manually sets a new one
			savedEndDatesRef.current.delete(entryId)
		}
		
		// update local state immediately for responsive UI
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		
		// update parent
		onUpdate(index, updatedEntry)
	}

	const handleAddNew = () => {
		const newEntry = { 
			id: Date.now(), 
			school: '', 
			degree: '', 
			discipline: '', 
			location: '',
			minor: '',
			gpa: '',
			startDate: '', 
			endDate: '', 
			current: false 
		}
		onAdd(newEntry)
		setExpandedIds(prev => new Set([...prev, newEntry.id]))
	}

	const handleReorder = (fromIndex, toIndex) => {
		if (fromIndex === toIndex || !onReorder) return
		const reordered = [...localEntries]
		const [removed] = reordered.splice(fromIndex, 1)
		reordered.splice(toIndex, 0, removed)
		onReorder(reordered)
	}

	const reorderSubsection = (eduIndex, fromIndex, toIndex) => {
		if (fromIndex === toIndex) return
		const updatedEdu = { ...localEntries[eduIndex] }
		const subs = updatedEdu.subsections || {}
		const entries = Object.entries(subs)
		const [removed] = entries.splice(fromIndex, 1)
		entries.splice(toIndex, 0, removed)
		updatedEdu.subsections = Object.fromEntries(entries)
		setLocalEntries(prev => {
			const newEdu = [...prev]
			newEdu[eduIndex] = updatedEdu
			return newEdu
		})
		onUpdate(eduIndex, updatedEdu)
	}

	const handleStartEditSubsection = (eduIndex, subIndex, currentTitle) => {
		setEditingSubsection({ eduIndex, subIndex, oldTitle: currentTitle })
		setEditingSubsectionValue(currentTitle)
	}

	const handleSaveSubsectionEdit = () => {
		if (!editingSubsection) return
		const { eduIndex, subIndex, oldTitle } = editingSubsection
		const newTitle = editingSubsectionValue.trim()
		if (newTitle && newTitle !== oldTitle) {
			const updatedEdu = { ...localEntries[eduIndex] }
			const subs = { ...updatedEdu.subsections }
			const cont = subs[oldTitle] ?? ''
			delete subs[oldTitle]
			subs[newTitle] = cont
			updatedEdu.subsections = subs
			setLocalEntries(prev => {
				const newEdu = [...prev]
				newEdu[eduIndex] = updatedEdu
				return newEdu
			})
			onUpdate(eduIndex, updatedEdu)
		}
		setEditingSubsection(null)
		setEditingSubsectionValue('')
	}

	const handleCancelSubsectionEdit = () => {
		setEditingSubsection(null)
		setEditingSubsectionValue('')
	}

	const headerSection = (
		<div className="flex items-start justify-between gap-4 mb-4">
			<div>
				<h3 className="text-sm font-semibold text-gray-900">Your Education Entries</h3>
				<p className="text-xs text-gray-500 mt-0.5">Add, edit, or reorder your academic history. Click a row to expand.</p>
			</div>
			<button
				onClick={handleAddNew}
				className="px-3 py-1.5 text-sm font-medium border border-brand-pink text-brand-pink rounded-lg hover:bg-brand-pink hover:text-white transition-all flex-shrink-0"
			>
				+ Add Education
			</button>
		</div>
	)

	return (
		<>
			{education.length > 0 ? (
				<div>
					{headerSection}
					<div className={compact ? 'space-y-3' : 'space-y-3'}>
					{localEntries.map((edu, index) => {
					const isExpanded = expandedIds.has(getEntryId(edu, index))
					const major = edu.discipline || edu.degree
					const university = edu.school
					const hasContent = edu.school || edu.degree || edu.discipline
					const displayName = major
						? (university ? `${major} @ ${university}` : major)
						: (university ? university : (hasContent ? 'Incomplete' : 'New Education'))
					const isDraggable = !!onReorder
					const isDragging = draggedEntryIndex === index
					const isDragOver = dragOverEntryIndex === index

					return (
							<div
								key={edu.id || index}
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
										// ignore spurious click that can fire after drag-drop
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
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>School/University</label>
											<input
												type="text"
												value={localEntries[index]?.school || ''}
												onChange={(e) => handleFieldChange(index, 'school', e.target.value)}
												className="input"
												placeholder="University Name"
											/>
										</div>
										<div>
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>Degree</label>
											<input
												type="text"
												value={localEntries[index]?.degree || ''}
												onChange={(e) => handleFieldChange(index, 'degree', e.target.value)}
												className="input"
												placeholder="e.g., Bachelor of Science"
											/>
										</div>
										<div>
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>Field of Study</label>
											<input
												type="text"
												value={localEntries[index]?.discipline || localEntries[index]?.field || ''}
												onChange={(e) => handleFieldChange(index, 'discipline', e.target.value)}
												className="input"
												placeholder="e.g., Computer Science"
											/>
										</div>
										<div>
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>Minor</label>
											<input
												type="text"
												value={localEntries[index]?.minor || ''}
												onChange={(e) => handleFieldChange(index, 'minor', e.target.value)}
												className="input"
												placeholder="Optional"
											/>
										</div>
										<div>
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>Location</label>
											<input
												type="text"
												value={localEntries[index]?.location || ''}
												onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
												className="input"
												placeholder="City, State"
											/>
										</div>
										<div>
											<label className={compact ? 'block text-sm font-medium text-gray-500 mb-1' : 'label'}>GPA</label>
											<input
												type="text"
												value={localEntries[index]?.gpa || ''}
												onChange={(e) => handleFieldChange(index, 'gpa', e.target.value)}
												className="input"
												placeholder="e.g., 3.7"
											/>
										</div>
										<div>
											<div className="flex items-center min-h-8 mb-1">
												<label className={compact ? 'text-sm font-medium text-gray-500' : 'label mb-0'}>Start Date</label>
											</div>
											<MonthYearPicker
												value={localEntries[index]?.startDate || localEntries[index]?.start_date || ''}
												onChange={(v) => handleFieldChange(index, 'startDate', v)}
											/>
										</div>
										<div>
											{/* Label Row with Switch */}
											<div className="grid grid-cols-3 items-center min-h-8 mb-1">
												<label className={compact ? 'block text-sm font-medium text-gray-500 mb-0' : 'label mb-0'}>End Date</label>
												
												{/* Switch - div with role="switch" to avoid sr-only checkbox focus scroll bug */}
												<div className="flex justify-center">
													<div
														role="switch"
														aria-checked={localEntries[index]?.current || false}
														aria-label="Currently enrolled"
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
									</div>

									{/* Subsections - Only show if enabled */}
									{showSubsections && (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<div className="flex items-center justify-between mb-2">
												<h4 className="text-base font-semibold text-gray-900">Highlights</h4>
												<button
													type="button"
													onClick={() => {
														const updatedEdu = { ...localEntries[index] }
														const subs = { ...(updatedEdu.subsections || {}) }
														const newTitle = `New Section ${Object.keys(subs).length + 1}`
														subs[newTitle] = ''
														updatedEdu.subsections = subs
														setLocalEntries(prev => {
															const newEdu = [...prev]
															newEdu[index] = updatedEdu
															return newEdu
														})
														onUpdate(index, updatedEdu)
													}}
													className="px-3 py-1.5 text-sm font-medium border border-brand-pink text-brand-pink rounded hover:bg-brand-pink hover:text-white transition-all"
												>
													+ Add Section
												</button>
											</div>
											<div className="space-y-3">
												{Object.keys(localEntries[index]?.subsections || {}).length === 0 ? (
													<p className="text-sm text-gray-500 py-2">No highlights yet. Click &quot;Add Section&quot; to get started.</p>
												) : (
													Object.entries(localEntries[index]?.subsections || {}).map(([title, content], subIndex) => {
														const subsections = localEntries[index]?.subsections || {}
														const isDraggable = Object.keys(subsections).length > 1
														const isDragging = draggedSubsection?.eduIndex === index && draggedSubsection?.subIndex === subIndex
														const isDragOver = dragOverSubsection?.eduIndex === index && dragOverSubsection?.subIndex === subIndex
														const isEditing = editingSubsection?.eduIndex === index && editingSubsection?.subIndex === subIndex

														const handleDragStart = (e) => {
															setDraggedSubsection({ eduIndex: index, subIndex })
															e.dataTransfer.effectAllowed = 'move'
															e.dataTransfer.setData('text/plain', `subsection-${index}-${subIndex}`)
														}

														const handleDragOver = (e) => {
															e.preventDefault()
															e.dataTransfer.dropEffect = 'move'
															setDragOverSubsection({ eduIndex: index, subIndex })
														}

														const handleDragLeave = () => setDragOverSubsection(null)

														const handleDrop = (e) => {
															e.preventDefault()
															if (!draggedSubsection) return
															if (draggedSubsection.eduIndex !== index || draggedSubsection.subIndex === subIndex) {
																setDraggedSubsection(null)
																setDragOverSubsection(null)
																return
															}
															reorderSubsection(index, draggedSubsection.subIndex, subIndex)
															setDraggedSubsection(null)
															setDragOverSubsection(null)
														}

														const handleDragEnd = () => {
															setDraggedSubsection(null)
															setDragOverSubsection(null)
														}

														const handleRemoveSubsection = () => {
															const updatedEdu = { ...localEntries[index] }
															const subs = { ...updatedEdu.subsections }
															delete subs[title]
															updatedEdu.subsections = subs
															setLocalEntries(prev => {
																const newEdu = [...prev]
																newEdu[index] = updatedEdu
																return newEdu
															})
															onUpdate(index, updatedEdu)
															if (isEditing) {
																setEditingSubsection(null)
																setEditingSubsectionValue('')
															}
														}

														return (
															<div
																key={`subsection-${index}-${subIndex}-${title}`}
																onDragOver={isDraggable ? handleDragOver : undefined}
																onDragLeave={isDraggable ? handleDragLeave : undefined}
																onDrop={isDraggable ? handleDrop : undefined}
																className={`rounded-lg px-2.5 py-1.5 transition-all duration-200 ease-out ${
																	isDragging
																		? 'opacity-60 scale-[0.98] bg-gray-50'
																		: isDragOver
																		? 'ring-2 ring-brand-pink/60 ring-offset-2 ring-offset-white bg-brand-pink/5'
																		: ''
																}`}
															>
																<div className="flex items-center gap-2 mb-1">
																	{isEditing ? (
																		<input
																			type="text"
																			value={editingSubsectionValue}
																			onChange={(e) => setEditingSubsectionValue(e.target.value)}
																			onKeyDown={(e) => {
																				if (e.key === 'Enter') handleSaveSubsectionEdit()
																				else if (e.key === 'Escape') handleCancelSubsectionEdit()
																			}}
																			onBlur={handleSaveSubsectionEdit}
																			className="input text-sm font-medium flex-1 min-w-0 py-1 px-2"
																			autoFocus
																		/>
																	) : (
																		<>
																			{isDraggable && (
																				<div
																					draggable
																					onDragStart={handleDragStart}
																					onDragEnd={handleDragEnd}
																					className="shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1 touch-none"
																					title="Drag to reorder"
																				>
																					<FontAwesomeIcon icon={faGripVertical} className="w-3.5 h-3.5 text-gray-400" />
																				</div>
																			)}
																			<span className="text-sm font-medium text-gray-900 truncate min-w-0 flex-1">{title}</span>
																			<div className="flex items-center gap-0.5 shrink-0">
																				<button
																					type="button"
																					onClick={() => handleStartEditSubsection(index, subIndex, title)}
																					className="p-1.5 rounded text-gray-500 hover:text-brand-pink hover:bg-gray-100"
																					title="Edit name"
																				>
																					<FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
																				</button>
																				<button
																					type="button"
																					onClick={handleRemoveSubsection}
																					className="p-1.5 rounded text-gray-500 hover:text-red-500 hover:bg-red-50"
																					aria-label="Remove"
																					title="Remove"
																				>
																					<FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
																				</button>
																			</div>
																		</>
																	)}
																</div>
																<input
																	type="text"
																	value={content}
																	onChange={(e) => {
																		const updatedEdu = {
																			...localEntries[index],
																			subsections: { ...localEntries[index].subsections, [title]: e.target.value }
																		}
																		setLocalEntries(prev => {
																			const newEdu = [...prev]
																			newEdu[index] = updatedEdu
																			return newEdu
																		})
																		onUpdate(index, updatedEdu)
																	}}
																	className="input text-sm py-1.5 px-3"
																	placeholder="One sentence or short phrase..."
																/>
															</div>
														)
													})
												)}
											</div>
										</div>
									)}
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
						<p className="text-gray-500 text-base">No entries yet. Click &quot;+ Add Education&quot; above to get started.</p>
					</div>
				</div>
			)}
		</>
	)
}

export default EducationInput
