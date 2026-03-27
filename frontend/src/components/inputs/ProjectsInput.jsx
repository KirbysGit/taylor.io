import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faPencil, faChevronUp, faTrash } from '@fortawesome/free-solid-svg-icons';
import { XIcon } from '@/components/icons';
import { shouldDefaultToBullets, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';

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

// Projects Input Component - Just the form fields and logic, no headers
const ProjectsInput = ({ projects, onAdd, onRemove, onUpdate, onReorder }) => {
	const getEntryId = (entry, index) => String(entry?.id ?? index)
	const [expandedIds, setExpandedIds] = useState(() => new Set()) // collapsed by default
	const [localEntries, setLocalEntries] = useState(projects)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const [draggedEntryIndex, setDraggedEntryIndex] = useState(null)
	const [dragOverEntryIndex, setDragOverEntryIndex] = useState(null)
	const prevLengthRef = useRef(projects.length)
	const prevIdsRef = useRef(projects.map(p => p.id || p).join(','))
	const lastDragEndRef = useRef(0)
	const pendingTitleFocusEntryIdRef = useRef(null)
	const addFromButtonRef = useRef(false)

	// After "+ Add Project": scroll card + focus project title when expanded
	useEffect(() => {
		const targetId = pendingTitleFocusEntryIdRef.current
		if (targetId == null) return
		const isOpen = [...expandedIds].some((id) => String(id) === targetId)
		if (!isOpen) return

		let cancelled = false
		const t = window.setTimeout(() => {
			if (cancelled) return
			let card = document.getElementById(`project-card-${targetId}`)
			let input = document.getElementById(`project-title-${targetId}`)
			if ((!card || !input) && localEntries.length > 0) {
				const lastIdx = localEntries.length - 1
				const fallbackId = getEntryId(localEntries[lastIdx], lastIdx)
				card = card || document.getElementById(`project-card-${fallbackId}`)
				input = input || document.getElementById(`project-title-${fallbackId}`)
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
		const currentLength = projects.length
		const currentIds = projects.map(p => p.id || p).join(',')
		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			const merged = projects.map((proj, i) => {
				const local = localEntries[i]
				if (!local) return proj
				const localArr = Array.isArray(local.techStack) ? local.techStack : (local.techStack ? String(local.techStack).split(',').map(t => t.trim()).filter(Boolean) : [])
				const projArr = Array.isArray(proj.techStack) ? proj.techStack : (proj.techStack ? String(proj.techStack).split(',').map(t => t.trim()).filter(Boolean) : [])
				if (localArr.length > 0 && projArr.length === 0) return { ...proj, techStack: localArr }
				return proj
			})
			setLocalEntries(merged)
			setDescriptionModes({})
			setDescriptionBullets({})
			// only expand newly added when user added one (not when data loads from empty)
			if (currentLength > prevLengthRef.current && prevLengthRef.current > 0 && currentLength === prevLengthRef.current + 1) {
				setExpandedIds(prev => {
					const newSet = new Set(prev)
					const newEntry = projects[currentLength - 1]
					newSet.add(getEntryId(newEntry, currentLength - 1))
					return newSet
				})
			} else if (currentLength > prevLengthRef.current) {
				const delta = currentLength - prevLengthRef.current
				if (delta > 1) {
					addFromButtonRef.current = false
					setExpandedIds(new Set())
				} else if (delta === 1 && prevLengthRef.current === 0 && addFromButtonRef.current) {
					addFromButtonRef.current = false
					const newEntry = projects[currentLength - 1]
					setExpandedIds(new Set([getEntryId(newEntry, currentLength - 1)]))
				} else if (delta === 1 && prevLengthRef.current === 0) {
					setExpandedIds(new Set())
				}
			} else {
				const currentIdsSet = new Set(projects.map((e, i) => getEntryId(e, i)))
				setExpandedIds(prev => new Set([...prev].filter(id => currentIdsSet.has(id))))
			}
			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [projects])

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
			if (newSet.has(entryId)) newSet.delete(entryId)
			else newSet.add(entryId)
			return newSet
		})
	}

	const handleFieldChange = (index, field, value) => {
		const updatedEntry = { ...localEntries[index], [field]: value }
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		const backendEntry = { ...updatedEntry }
		if (field === 'techStack' && typeof backendEntry.techStack === 'string') {
			const parsed = backendEntry.techStack.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0)
			if (parsed.length > 0) backendEntry.techStack = parsed
			else if (backendEntry.techStack.length === 0) backendEntry.techStack = []
			else {
				const prev = localEntries[index]?.techStack
				backendEntry.techStack = Array.isArray(prev) ? prev : (prev ? String(prev).split(',').map(t => t.trim()).filter(Boolean) : [])
			}
		}
		onUpdate(index, backendEntry)
	}

	const handleDescriptionModeToggle = (index) => {
		const currentMode = descriptionModes[index] || 'paragraph'
		const newMode = currentMode === 'paragraph' ? 'bullets' : 'paragraph'
		const currentDescription = localEntries[index]?.description || ''
		if (newMode === 'bullets') {
			const bullets = paragraphToBullets(currentDescription)
			setDescriptionBullets(prev => ({ ...prev, [index]: bullets.length > 0 ? bullets : [''] }))
			handleFieldChange(index, 'description', bulletsToParagraph(bullets))
		} else {
			const bullets = descriptionBullets[index] || ['']
			handleFieldChange(index, 'description', bullets.filter(b => b.trim()).join('\n'))
		}
		setDescriptionModes(prev => ({ ...prev, [index]: newMode }))
	}

	const handleBulletChange = (index, bulletIndex, value) => {
		const currentBullets = descriptionBullets[index] || ['']
		const newBullets = [...currentBullets]
		newBullets[bulletIndex] = value
		setDescriptionBullets(prev => ({ ...prev, [index]: newBullets }))
		handleFieldChange(index, 'description', bulletsToParagraph(newBullets))
	}

	const handleAddBullet = (index) => {
		const currentBullets = descriptionBullets[index] || ['']
		setDescriptionBullets(prev => ({ ...prev, [index]: [...currentBullets, ''] }))
	}

	const handleRemoveBullet = (index, bulletIndex) => {
		const currentBullets = descriptionBullets[index] || ['']
		if (currentBullets.length <= 1) return
		const newBullets = currentBullets.filter((_, i) => i !== bulletIndex)
		setDescriptionBullets(prev => ({ ...prev, [index]: newBullets }))
		handleFieldChange(index, 'description', bulletsToParagraph(newBullets))
	}

	const handleAddNew = () => {
		const newEntry = { id: Date.now(), title: '', description: '', techStack: [], url: '' }
		const idKey = getEntryId(newEntry, 0)
		addFromButtonRef.current = true
		pendingTitleFocusEntryIdRef.current = idKey
		setLocalEntries((prev) => {
			if (projects.length === 0) return [newEntry]
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

	const getDisplayName = (proj) => {
		if (proj.title) return proj.title
		const hasContent = proj.description || (proj.techStack && proj.techStack.length > 0) || proj.url
		return hasContent ? 'Incomplete' : 'New Project'
	}

	const getTechStackString = (proj) => {
		if (!proj.techStack) return ''
		return Array.isArray(proj.techStack) ? proj.techStack.join(', ') : proj.techStack
	}

	const headerSection = (
		<div className="flex items-start justify-between gap-4 mb-4">
			<div>
				<h3 className="text-sm font-semibold text-gray-900">Your Project Entries</h3>
				<p className="text-xs text-gray-500 mt-0.5">Add, edit, or reorder your projects. Click the pencil to expand.</p>
			</div>
			<button
				onClick={handleAddNew}
				className="px-3 py-1.5 text-sm font-medium border border-brand-pink text-brand-pink rounded-lg hover:bg-brand-pink hover:text-white transition-all flex-shrink-0"
			>
				+ Add Project
			</button>
		</div>
	)

	return (
		<>
			{localEntries.length > 0 ? (
				<div>
					{headerSection}
					<div className="space-y-3">
						{localEntries.map((proj, index) => {
							const isExpanded = expandedIds.has(getEntryId(proj, index))
							const displayName = getDisplayName(proj)
							const isDraggable = !!onReorder
							const isDragging = draggedEntryIndex === index
							const isDragOver = dragOverEntryIndex === index

							return (
								<div
									key={proj.id || index}
									id={`project-card-${getEntryId(proj, index)}`}
									onDragOver={isDraggable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverEntryIndex(index) } : undefined}
									onDragLeave={isDraggable ? () => setDragOverEntryIndex(null) : undefined}
									onDrop={isDraggable ? (e) => { e.preventDefault(); if (draggedEntryIndex != null) { handleReorder(draggedEntryIndex, index); setDraggedEntryIndex(null); setDragOverEntryIndex(null) } } : undefined}
									className={`min-w-0 rounded-xl border-l-4 border-brand-pink bg-white shadow transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isExpanded ? 'rounded-t-xl' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-brand-pink ring-dashed ring-offset-1 bg-brand-pink/5' : ''}`}
								>
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
											{!proj.title && !(proj.description || (proj.techStack && proj.techStack.length) || proj.url) && (
												<span className="text-gray-500 font-normal ml-1">(click pencil to edit)</span>
											)}
											{proj.fromParsed && (
												<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Parsed</span>
											)}
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
											onClick={(e) => { e.stopPropagation(); onRemove(index) }}
											className="flex-shrink-0 p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
											aria-label="Remove"
											title="Remove"
										>
											<FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
										</button>
									</div>
									<AnimatedExpand expanded={isExpanded}>
										<div className="pt-4 pb-4 px-4 border-t border-gray-200 space-y-4">
											<div>
												<label className="label">Project Title</label>
												<input
													type="text"
													id={`project-title-${getEntryId(proj, index)}`}
													value={proj.title || ''}
													onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
													className="input"
													placeholder="e.g., Personal Finance App"
												/>
											</div>
											<div>
												<div className="grid grid-cols-3 items-center mb-1">
													<label className="label mb-0">Description</label>
													<div className="flex justify-center items-center gap-2">
														<span className={`text-xs font-medium ${(descriptionModes[index] || 'paragraph') === 'paragraph' ? 'text-brand-pink' : 'text-gray-400'}`}>Paragraph</span>
														<div
															role="switch"
															aria-checked={(descriptionModes[index] || 'paragraph') === 'bullets'}
															tabIndex={0}
															onClick={() => handleDescriptionModeToggle(index)}
															onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDescriptionModeToggle(index) } }}
															onMouseDown={(e) => e.preventDefault()}
															className="flex items-center cursor-pointer select-none"
														>
															<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${(descriptionModes[index] || 'paragraph') === 'bullets' ? 'bg-brand-pink' : 'bg-gray-300'}`}>
																<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${(descriptionModes[index] || 'paragraph') === 'bullets' ? 'translate-x-6' : 'translate-x-0'}`}></div>
															</div>
														</div>
														<span className={`text-xs font-medium ${(descriptionModes[index] || 'paragraph') === 'bullets' ? 'text-brand-pink' : 'text-gray-400'}`}>Bullets</span>
													</div>
													<div></div>
												</div>
												{(descriptionModes[index] || 'paragraph') === 'paragraph' ? (
													<textarea
														value={proj.description || ''}
														onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
														className="input min-h-[100px] resize-y"
														rows="4"
														placeholder="Describe what the project does, key features, your role..."
													/>
												) : (
													<div className="space-y-2">
														{(descriptionBullets[index] || ['']).length === 0 ? (
															<div className="text-center py-6 text-gray-400 border border-gray-200 rounded-md">
																<p className="text-sm">No bullets yet. Click &quot;Add Another Bullet&quot; to get started.</p>
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
																		<button type="button" onClick={() => handleRemoveBullet(index, bulletIndex)} className="text-red-500 hover:text-red-700 transition-colors p-1">
																			<XIcon className="w-4 h-4" />
																		</button>
																	)}
																</div>
															))
														)}
														<button type="button" onClick={() => handleAddBullet(index)} className="w-full px-3 py-2 bg-brand-pink text-white text-sm font-medium rounded-lg hover:opacity-90 transition">+ Add Another Bullet</button>
													</div>
												)}
											</div>
											<div>
												<label className="label">Tech Stack</label>
												<input
													type="text"
													value={getTechStackString(proj)}
													onChange={(e) => handleFieldChange(index, 'techStack', e.target.value)}
													className="input"
													placeholder="e.g., React, Node.js, PostgreSQL (comma-separated)"
												/>
											</div>
											<div>
												<label className="label">Project URL</label>
												<input
													type="url"
													value={proj.url || ''}
													onChange={(e) => handleFieldChange(index, 'url', e.target.value)}
													className="input"
													placeholder="https://example.com"
												/>
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
						<p className="text-gray-500 text-base">No projects yet. Click &quot;+ Add Project&quot; above to get started.</p>
					</div>
				</div>
			)}
		</>
	)
}

export default ProjectsInput
