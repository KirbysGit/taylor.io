import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from '@/components/icons';
import { isBulletFormat, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';

// Experience Input Component - Just the form fields and logic, no headers
const ExperienceInput = ({ experiences, onAdd, onRemove, onUpdate }) => {
	// ensure at least one empty entry exists
	const entries = experiences.length > 0 ? experiences : [{ 
		id: Date.now(), 
		title: '', 
		company: '', 
		description: '', 
		startDate: '', 
		endDate: '', 
		current: false 
	}]

	const [expandedEntries, setExpandedEntries] = useState(new Set(entries.map((_, i) => i)))
	const [localEntries, setLocalEntries] = useState(entries)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const prevLengthRef = useRef(experiences.length)
	const prevIdsRef = useRef(experiences.map(e => e.id || e).join(','))

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
				startDate: '', 
				endDate: '', 
				current: false 
			}]
			setLocalEntries(newEntries)
			setExpandedEntries(new Set(newEntries.map((_, i) => i)))
			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [experiences])

	// initialize description modes based on existing descriptions
	useEffect(() => {
		localEntries.forEach((entry, index) => {
			if (descriptionModes[index] === undefined) {
				const isBullet = isBulletFormat(entry.description || '')
				setDescriptionModes(prev => ({ ...prev, [index]: isBullet ? 'bullets' : 'paragraph' }))
				if (isBullet) {
					setDescriptionBullets(prev => ({ ...prev, [index]: paragraphToBullets(entry.description || '') }))
				} else {
					setDescriptionBullets(prev => ({ ...prev, [index]: [''] }))
				}
			}
		})
	}, [localEntries])

	const toggleExpanded = (index) => {
		setExpandedEntries(prev => {
			const newSet = new Set(prev)
			if (newSet.has(index)) {
				newSet.delete(index)
			} else {
				newSet.add(index)
			}
			return newSet
		})
	}

	const handleFieldChange = (index, field, value) => {
		const updatedEntry = { ...localEntries[index], [field]: value }
		if (field === 'current' && value) {
			updatedEntry.endDate = ''
			updatedEntry.end_date = ''
		}
		if (field === 'endDate' && value) {
			updatedEntry.current = false
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
			startDate: '', 
			endDate: '', 
			current: false 
		}
		const newIndex = localEntries.length
		onAdd(newEntry)
		setExpandedEntries(prev => new Set([...prev, newIndex]))
	}

	return (
		<>
			{experiences.length > 0 ? (
				<div className="space-y-3">
					{localEntries.map((exp, index) => {
					const isExpanded = expandedEntries.has(index)
					const hasContent = exp.title || exp.company
					const displayName = exp.title 
						? (exp.company ? `${exp.title} @ ${exp.company}` : exp.title)
						: (exp.company ? exp.company : (hasContent ? 'Incomplete' : 'New Experience'))
					
					return (
						<div 
							key={exp.id || index} 
							className="collapsibleCard"
						>
							{/* Header - Always visible */}
							<button
								type="button"
								onClick={() => toggleExpanded(index)}
								className="collapsibleCardHeader"
							>
								<div className="flex items-center gap-3 flex-1 text-left">
									<svg 
										className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
									<div className="flex items-center gap-2">
										<span className="text-base font-semibold text-gray-900">{displayName}</span>
										{!hasContent && (
											<span className="text-xs text-gray-400">(Click to add details)</span>
										)}
									</div>
								</div>
								{localEntries.length > 1 && (
									<button
										onClick={(e) => {
											e.stopPropagation()
											onRemove(index)
										}}
										className="removeButton"
									>
										Remove
										<span className="removeButtonUnderline"></span>
									</button>
								)}
							</button>

							{/* Expandable Content */}
							<div 
								className={`expandableContent ${isExpanded ? 'expanded' : 'collapsed'}`}
							>
								<div className="expandableContentInner">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="label">Job Title</label>
											<input
												type="text"
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
											{/* Description Label with Toggle */}
											<div className="grid grid-cols-3 items-center mb-1">
												<label className="label mb-0">Description</label>
												
												{/* Toggle Switch - Centered */}
												<div className="flex justify-center items-center gap-2">
													<span className={`text-xs font-medium ${(descriptionModes[index] || 'paragraph') === 'paragraph' ? 'text-brand-pink' : 'text-gray-400'}`}>
														Paragraph
													</span>
													<label className="flex items-center cursor-pointer">
														<input
															type="checkbox"
															checked={(descriptionModes[index] || 'paragraph') === 'bullets'}
															onChange={() => handleDescriptionModeToggle(index)}
															className="sr-only"
														/>
														<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
															(descriptionModes[index] || 'paragraph') === 'bullets' ? 'bg-brand-pink' : 'bg-gray-300'
														}`}>
															<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
																(descriptionModes[index] || 'paragraph') === 'bullets' ? 'translate-x-6' : 'translate-x-0'
															}`}></div>
														</div>
													</label>
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
											<label className="label">Start Date</label>
											<input
												type="month"
												value={localEntries[index]?.startDate || localEntries[index]?.start_date || ''}
												onChange={(e) => handleFieldChange(index, 'startDate', e.target.value)}
												className="input"
											/>
										</div>
										<div>
											{/* Label Row with Switch */}
											<div className="grid grid-cols-3 items-center mb-1">
												<label className="label mb-0">End Date</label>
												
												{/* Switch - Centered */}
												<div className="flex justify-center">
													<label className="flex items-center cursor-pointer">
														<input
															type="checkbox"
															checked={localEntries[index]?.current || false}
															onChange={(e) => handleFieldChange(index, 'current', e.target.checked)}
															className="sr-only"
														/>
														<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
															localEntries[index]?.current ? 'bg-brand-pink' : 'bg-gray-300'
														}`}>
															<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
																localEntries[index]?.current ? 'translate-x-6' : 'translate-x-0'
															}`}></div>
														</div>
													</label>
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
												<input
													type="month"
													value={localEntries[index]?.endDate || localEntries[index]?.end_date || ''}
													onChange={(e) => handleFieldChange(index, 'endDate', e.target.value)}
													disabled={localEntries[index]?.current}
													className="input disabled:bg-gray-100 disabled:cursor-not-allowed"
												/>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					)
				})}

					<button
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Another Experience
					</button>
				</div>
			) : (
				<div className="text-center py-12">
					<div className="mb-4">
						<svg 
							className="w-16 h-16 mx-auto text-gray-300" 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<p className="text-gray-400 mb-6">No work experience yet</p>
					<button
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Your First Experience
					</button>
				</div>
			)}
		</>
	)
}

export default ExperienceInput
