import React, { useState, useEffect } from 'react';

// Education Step Component.
const EducationStep = ({ education, onAdd, onRemove, onUpdate }) => {
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
	const prevLengthRef = React.useRef(education.length)
	const prevIdsRef = React.useRef(education.map(e => e.id || e).join(','))

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
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-2">Your Education</h2>
			<p className="text-gray-600 mb-3">Tell us about your educational background.</p>
			<div className="smallDivider mb-6"></div>

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
		</div>
	)
}

export default EducationStep