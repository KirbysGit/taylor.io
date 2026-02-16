// components / left / SectionOrdering.jsx

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons';

// Section metadata
const SECTION_METADATA = {
	header: { label: 'Header', locked: true },
	summary: { label: 'Summary', locked: false },
	education: { label: 'Education', locked: false },
	experience: { label: 'Experience', locked: false },
	projects: { label: 'Projects', locked: false },
	skills: { label: 'Skills', locked: false },
}

// Section Ordering Component - Mini resume preview with draggable sections
const SectionOrdering = ({ sectionOrder, onOrderChange, onScrollToSection }) => {
	const [draggedSection, setDraggedSection] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	// Handle drag start
	const handleDragStart = (e, sectionKey) => {
		setDraggedSection(sectionKey)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', sectionKey)
	}

	// Handle drag over
	const handleDragOver = (e, index) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverIndex(index)
	}

	// Handle drag leave
	const handleDragLeave = () => {
		setDragOverIndex(null)
	}

	// Handle drop
	const handleDrop = (e, dropIndex) => {
		e.preventDefault()
		
		if (!draggedSection) return

		const draggedIndex = sectionOrder.indexOf(draggedSection)
		if (draggedIndex === -1 || draggedIndex === dropIndex) {
			setDraggedSection(null)
			setDragOverIndex(null)
			return
		}

		// Reorder sections
		const newOrder = [...sectionOrder]
		const [removed] = newOrder.splice(draggedIndex, 1)
		newOrder.splice(dropIndex, 0, removed)

		onOrderChange(newOrder)
		setDraggedSection(null)
		setDragOverIndex(null)
	}

	// Handle drag end
	const handleDragEnd = () => {
		setDraggedSection(null)
		setDragOverIndex(null)
	}

	return (
		<div className="space-y-3">
			<label className="block text-sm font-medium text-gray-700 mb-2">
				Section Order
			</label>
			
			{/* Mini Resume Preview Box */}
			<div className="border-2 border-gray-300 rounded-lg bg-white p-4 shadow-sm">
				<div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
					Resume Preview
				</div>
				
				{/* Section List */}
				<div className="space-y-1.5">
					{sectionOrder.map((sectionKey, index) => {
						const section = SECTION_METADATA[sectionKey]
						if (!section) return null

						const isLocked = section.locked
						const isDragging = draggedSection === sectionKey
						const isDragOver = dragOverIndex === index

						return (
							<div
								key={sectionKey}
								draggable={!isLocked}
								onDragStart={!isLocked ? (e) => handleDragStart(e, sectionKey) : undefined}
								onDragOver={!isLocked ? (e) => handleDragOver(e, index) : undefined}
								onDragLeave={!isLocked ? handleDragLeave : undefined}
								onDrop={!isLocked ? (e) => handleDrop(e, index) : undefined}
								onDragEnd={!isLocked ? handleDragEnd : undefined}
								className={`
									flex items-center gap-2 px-2 py-1.5 rounded text-xs
									transition-all duration-200
									${isLocked 
										? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
										: 'bg-gray-100 hover:bg-gray-200 cursor-move'
									}
									${isDragging ? 'opacity-50' : ''}
									${isDragOver ? 'bg-brand-pink/20 border-2 border-brand-pink border-dashed' : ''}
								`}
							>
								{/* Drag Handle / Lock Icon */}
								<div className="flex-shrink-0 text-gray-400">
									{isLocked ? (
										<span className="text-xs">🔒</span>
									) : (
										<span className="text-xs">⋮⋮</span>
									)}
								</div>
								
								{/* Section Label */}
								<span className={`flex-1 text-xs font-medium ${isLocked ? 'text-gray-500' : 'text-gray-700'}`}>
									{section.label}
								</span>
								
								{/* Scroll Arrow - Only show for non-locked sections */}
								{!isLocked && onScrollToSection && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation()
											onScrollToSection(sectionKey)
										}}
										className="flex-shrink-0 text-brand-pink hover:text-brand-pink-dark transition-colors p-1"
										title={`Scroll to ${section.label} section`}
									>
										<FontAwesomeIcon icon={faArrowDown} className="w-3 h-3" />
									</button>
								)}
							</div>
						)
					})}
				</div>
			</div>
			
			{/* Helper Text */}
			<p className="text-xs text-gray-500 italic">
				Drag sections to reorder (Header is locked)
			</p>
		</div>
	)
}

export default SectionOrdering
