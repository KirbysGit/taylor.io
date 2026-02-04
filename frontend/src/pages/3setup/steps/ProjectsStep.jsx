// pages / 3setup / steps / ProjectsStep.jsx

// imports.
import React, { useState, useEffect, useRef } from 'react';
import { XIcon, ChevronDown } from '@/components/icons';

// Projects Step Component.
const ProjectsStep = ({ projects, onAdd, onRemove, onUpdate }) => {
	const [expandedEntries, setExpandedEntries] = useState(new Set(projects.map((_, i) => i)))
	const [localEntries, setLocalEntries] = useState(projects)
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
		<div className="w-full">
			{/* Header */}
			<div className="mb-3">
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Showcase your projects
				</h2>
				<p className="text-gray-600">
					Add projects you've worked on. Share what you've built and the technologies you used.
				</p>
			</div>

			<div className="smallDivider mb-3" />

			{/* Projects List */}
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
											<label className="label">Description</label>
											<textarea
												value={proj.description || ''}
												onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
												className="input"
												rows="4"
												placeholder="Describe what the project does, key features, your role..."
											/>
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
		</div>
	)
}

export default ProjectsStep;
