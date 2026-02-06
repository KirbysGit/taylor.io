import React, { useState, useEffect, useRef } from 'react';
import { XIcon, ChevronDown } from '@/components/icons';
import { isBulletFormat, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';

// Projects Input Component - Just the form fields and logic, no headers
const ProjectsInput = ({ projects, onAdd, onRemove, onUpdate }) => {
	const [expandedEntries, setExpandedEntries] = useState(new Set(projects.map((_, i) => i)))
	const [localEntries, setLocalEntries] = useState(projects)
	const [descriptionModes, setDescriptionModes] = useState({})
	const [descriptionBullets, setDescriptionBullets] = useState({})
	const prevLengthRef = useRef(projects.length)
	const prevIdsRef = useRef(projects.map(p => p.id || p).join(','))

	// sync with prop changes only when structure changes (add/remove), not field updates
	useEffect(() => {
		const currentLength = projects.length
		const currentIds = projects.map(p => p.id || p).join(',')
		
		// only sync if the length changed or IDs changed (structure change, not field update)
		if (currentLength !== prevLengthRef.current || currentIds !== prevIdsRef.current) {
			setLocalEntries(projects)
			setExpandedEntries(new Set(projects.map((_, i) => i)))
			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [projects])

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
		
		// handle techStack - convert comma-separated string to array
		if (field === 'techStack' && typeof value === 'string') {
			updatedEntry.techStack = value
				.split(',')
				.map(tech => tech.trim())
				.filter(tech => tech.length > 0)
		}
		
		// update local state immediately for responsive UI
		const newEntries = [...localEntries]
		newEntries[index] = updatedEntry
		setLocalEntries(newEntries)
		
		// update parent - convert techStack string to array for backend
		const backendEntry = { ...updatedEntry }
		if (field === 'techStack' && typeof backendEntry.techStack === 'string') {
			backendEntry.techStack = backendEntry.techStack
				.split(',')
				.map(tech => tech.trim())
				.filter(tech => tech.length > 0)
		}
		onUpdate(index, backendEntry)
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
			description: '', 
			techStack: [],
			url: ''
		}
		onAdd(newEntry)
		// expandedEntries will be updated by useEffect when projects prop changes
	}

	const handleRemove = (index) => {
		onRemove(index)
	}

	// get display name for project
	const getDisplayName = (proj) => {
		if (proj.title) return proj.title
		const hasContent = proj.description || (proj.techStack && proj.techStack.length > 0) || proj.url
		return hasContent ? 'Incomplete' : 'New Project'
	}

	// get techStack as string for input
	const getTechStackString = (proj) => {
		if (!proj.techStack) return ''
		if (Array.isArray(proj.techStack)) {
			return proj.techStack.join(', ')
		}
		return proj.techStack
	}

	return (
		<>
			{localEntries.length > 0 ? (
				<div className="space-y-4">
					{localEntries.map((proj, index) => {
						const isExpanded = expandedEntries.has(index)
						const displayName = getDisplayName(proj)
						
						return (
							<div key={proj.id || index} className="collapsibleCard">
								<button
									type="button"
									onClick={() => toggleExpanded(index)}
									className="collapsibleCardHeader w-full"
								>
									<div className="flex items-center justify-between w-full">
										<div className="flex items-center gap-3 flex-1 text-left">
											<ChevronDown 
												className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
											/>
											<div className="flex items-center gap-2">
												<span className="text-base font-semibold text-gray-900">{displayName}</span>
												{proj.fromParsed && (
													<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
														Parsed
													</span>
												)}
											</div>
										</div>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation()
												handleRemove(index)
											}}
											className="removeButton"
										>
											Remove
											<span className="removeButtonUnderline"></span>
										</button>
									</div>
								</button>
								
								<div className={`expandableContent ${isExpanded ? 'expanded' : 'collapsed'}`}>
									<div className="expandableContentInner">
										{/* Title */}
										<div>
											<label className="label">Project Title</label>
											<input
												type="text"
												value={proj.title || ''}
												onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
												className="input"
												placeholder="e.g., Personal Finance App"
											/>
										</div>

										{/* Description */}
										<div>
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
													value={proj.description || ''}
													onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
													className="input"
													rows="4"
													placeholder="Describe what the project does, key features, your role..."
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

										{/* Tech Stack */}
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

										{/* URL */}
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
								</div>
							</div>
						)
					})}

					{/* Add New Project Button */}
					<button
						type="button"
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Another Project
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
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<p className="text-gray-400 mb-6">No projects yet</p>
					<button
						type="button"
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Your First Project
					</button>
				</div>
			)}
		</>
	)
}

export default ProjectsInput
