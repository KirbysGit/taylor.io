import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from '@/components/icons';

// Education Input Component - Just the form fields and logic, no headers
const EducationInput = ({ education, onAdd, onRemove, onUpdate, showSubsections = false, onSubsectionUpdate }) => {
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

	const [expandedEntries, setExpandedEntries] = useState(new Set(entries.map((_, i) => i)))
	const [localEntries, setLocalEntries] = useState(entries)
	const prevLengthRef = useRef(education.length)
	const prevIdsRef = useRef(education.map(e => e.id || e).join(','))

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
			setExpandedEntries(new Set(newEntries.map((_, i) => i)))
			prevLengthRef.current = currentLength
			prevIdsRef.current = currentIds
		}
	}, [education])

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
		const newIndex = localEntries.length
		onAdd(newEntry)
		setExpandedEntries(prev => new Set([...prev, newIndex]))
	}

	return (
		<>
			{education.length > 0 ? (
				<div className="space-y-3">
					{localEntries.map((edu, index) => {
					const isExpanded = expandedEntries.has(index)
					const hasContent = edu.school || edu.degree || edu.discipline
					const displayName = edu.school || edu.degree || (hasContent ? 'Incomplete' : 'New Education')
					
					return (
						<div 
							key={edu.id || index} 
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
											<label className="label">School/University</label>
											<input
												type="text"
												value={localEntries[index]?.school || ''}
												onChange={(e) => handleFieldChange(index, 'school', e.target.value)}
												className="input"
												placeholder="University Name"
											/>
										</div>
										<div>
											<label className="label">Degree</label>
											<input
												type="text"
												value={localEntries[index]?.degree || ''}
												onChange={(e) => handleFieldChange(index, 'degree', e.target.value)}
												className="input"
												placeholder="e.g., Bachelor of Science"
											/>
										</div>
										<div>
											<label className="label">Field of Study</label>
											<input
												type="text"
												value={localEntries[index]?.discipline || localEntries[index]?.field || ''}
												onChange={(e) => handleFieldChange(index, 'discipline', e.target.value)}
												className="input"
												placeholder="e.g., Computer Science"
											/>
										</div>
										<div>
											<label className="label">Minor</label>
											<input
												type="text"
												value={localEntries[index]?.minor || ''}
												onChange={(e) => handleFieldChange(index, 'minor', e.target.value)}
												className="input"
												placeholder="Optional"
											/>
										</div>
										<div>
											<label className="label">Location</label>
											<input
												type="text"
												value={localEntries[index]?.location || ''}
												onChange={(e) => handleFieldChange(index, 'location', e.target.value)}
												className="input"
												placeholder="City, State"
											/>
										</div>
										<div>
											<label className="label">GPA</label>
											<input
												type="text"
												value={localEntries[index]?.gpa || ''}
												onChange={(e) => handleFieldChange(index, 'gpa', e.target.value)}
												className="input"
												placeholder="e.g., 3.7"
											/>
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

									{/* Subsections - Only show if enabled */}
									{showSubsections && (
										<div className="mt-6 pt-6 border-t border-gray-200">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-base font-semibold text-gray-800">Highlights</h4>
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
														onSubsectionUpdate?.('add', index)
													}}
													className="px-3 py-1.5 bg-brand-pink text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
												>
													+ Add Section
												</button>
											</div>
											<div className="space-y-3">
												{Object.keys(localEntries[index]?.subsections || {}).length === 0 ? (
													<div className="text-center py-6 text-gray-400">
														<p className="text-sm">No highlights yet. Click "Add Section" to get started.</p>
													</div>
												) : (
													Object.entries(localEntries[index]?.subsections || {}).map(([title, content]) => (
														<div key={title} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-md bg-gray-50">
															<div className="flex items-center gap-2">
																<input
																	type="text"
																	value={title}
																	onChange={(e) => {
																		const newTitle = e.target.value
																		setLocalEntries(prev => {
																			const newEdu = [...prev]
																			const subs = { ...newEdu[index].subsections }
																			const cont = subs[title] || ''
																			delete subs[title]
																			subs[newTitle] = cont
																			newEdu[index] = { ...newEdu[index], subsections: subs }
																			return newEdu
																		})
																	}}
																	onBlur={(e) => {
																		const newTitle = e.target.value.trim()
																		if (newTitle && newTitle !== title) {
																			const updatedEdu = { ...localEntries[index] }
																			const subs = { ...updatedEdu.subsections }
																			const cont = subs[title] || ''
																			delete subs[title]
																			subs[newTitle] = cont
																			updatedEdu.subsections = subs
																			onUpdate(index, updatedEdu)
																			onSubsectionUpdate?.('rename', index, title, newTitle)
																		} else if (!newTitle) {
																			setLocalEntries(prev => {
																				const newEdu = [...prev]
																				const subs = { ...newEdu[index].subsections }
																				if (!subs[title]) subs[title] = ''
																				newEdu[index] = { ...newEdu[index], subsections: subs }
																				return newEdu
																			})
																		}
																	}}
																	className="flex-1 input text-sm font-medium"
																	placeholder="Subsection title"
																/>
																<button
																	type="button"
																	onClick={() => {
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
																		onSubsectionUpdate?.('remove', index, title)
																	}}
																	className="text-red-500 hover:text-red-700 transition-colors p-1"
																>
																	<XIcon className="w-4 h-4" />
																</button>
															</div>
															<textarea
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
																	onSubsectionUpdate?.('content', index, title, e.target.value)
																}}
																className="input min-h-[60px] resize-y"
																placeholder="Enter content for this subsection..."
															/>
														</div>
													))
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)
				})}

					<button
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Another Education
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
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v7m0 0l-3-3m3 3l3-3" />
						</svg>
					</div>
					<p className="text-gray-400 mb-6">No education entries yet</p>
					<button
						onClick={handleAddNew}
						className="w-full px-6 py-3 border-2 border-brand-pink text-brand-pink font-semibold rounded-lg hover:bg-brand-pink hover:text-white transition-all"
					>
						+ Add Your First Education
					</button>
				</div>
			)}
		</>
	)
}

export default EducationInput
