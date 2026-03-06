// components / left / SectionOrdering.jsx

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

// Default visibility (summary hidden by default)
const DEFAULT_VISIBILITY = {
	summary: false,
	education: true,
	experience: true,
	projects: true,
	skills: true,
}

// Section metadata
const SECTION_METADATA = {
	header: { label: 'Header', locked: true },
	summary: { label: 'Professional Summary', locked: false },
	education: { label: 'Education', locked: false },
	experience: { label: 'Experience', locked: false },
	projects: { label: 'Projects', locked: false },
	skills: { label: 'Skills', locked: false },
}

// Section Ordering Component - Mini resume preview with draggable sections
const SectionOrdering = ({ sectionOrder, onOrderChange, sectionVisibility, onVisibilityChange, onScrollToSection }) => {
	const [draggedSection, setDraggedSection] = useState(null)
	const [dragOverIndex, setDragOverIndex] = useState(null)

	// Header is always first; only these sections are draggable
	const draggableOrder = sectionOrder.filter((key) => key !== 'header')

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

	// Handle drop - only reorder draggable sections, keep header first
	const handleDrop = (e, dropIndex) => {
		e.preventDefault()
		if (!draggedSection) return

		const draggedIndex = draggableOrder.indexOf(draggedSection)
		if (draggedIndex === -1 || draggedIndex === dropIndex) {
			setDraggedSection(null)
			setDragOverIndex(null)
			return
		}

		const newDraggableOrder = [...draggableOrder]
		const [removed] = newDraggableOrder.splice(draggedIndex, 1)
		newDraggableOrder.splice(dropIndex, 0, removed)
		const newOrder = ['header', ...newDraggableOrder]

		onOrderChange(newOrder)
		setDraggedSection(null)
		setDragOverIndex(null)
	}

	// Handle drag end
	const handleDragEnd = () => {
		setDraggedSection(null)
		setDragOverIndex(null)
	}

	const renderSectionRow = (sectionKey, index, isInDraggableList) => {
		const section = SECTION_METADATA[sectionKey]
		if (!section) return null

		const isLocked = section.locked
		const isVisible = sectionKey === 'header' ? true : (sectionVisibility?.[sectionKey] ?? DEFAULT_VISIBILITY[sectionKey])
		const isDraggable = isInDraggableList && !isLocked && isVisible
		const isDragging = draggedSection === sectionKey
		const isDragOver = isInDraggableList && dragOverIndex === index
		const showVisibilityToggle = !isLocked && onVisibilityChange

		return (
			<div
				key={sectionKey}
				draggable={isDraggable}
				onDragStart={isDraggable ? (e) => handleDragStart(e, sectionKey) : undefined}
				onDragOver={isInDraggableList ? (e) => handleDragOver(e, index) : undefined}
				onDragLeave={isInDraggableList ? handleDragLeave : undefined}
				onDrop={isInDraggableList ? (e) => handleDrop(e, index) : undefined}
				onDragEnd={isDraggable ? handleDragEnd : undefined}
				className={`
					flex items-center gap-2 px-2 py-1.5 rounded text-xs
					transition-all duration-200
					${isLocked 
						? 'bg-gray-50 text-gray-500 cursor-default' 
						: !isVisible 
							? 'bg-gray-100/60 text-gray-400 cursor-default'
							: isDraggable ? 'bg-gray-100 hover:bg-gray-200 cursor-move' : 'bg-gray-100 cursor-default'
					}
					${isDragging ? 'opacity-50' : ''}
					${isDragOver ? 'bg-brand-pink/20 border-2 border-brand-pink border-dashed' : ''}
				`}
			>
				{/* Drag Handle / Lock Icon */}
				<div className="flex-shrink-0 text-gray-400 w-4">
					{isLocked ? (
						<span className="text-xs">🔒</span>
					) : isVisible && isInDraggableList ? (
						<span className="text-xs">⋮⋮</span>
					) : (
						<span className="text-xs inline-block w-4" aria-hidden />
					)}
				</div>
				
				{/* Section Label */}
				<span className={`flex-1 text-xs font-medium ${!isVisible ? 'text-gray-400' : isLocked ? 'text-gray-500' : 'text-gray-700'}`}>
					{section.label}
				</span>

				{/* Visibility toggle - eye icon */}
				{showVisibilityToggle && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onVisibilityChange(sectionKey, !isVisible)
						}}
						className={`flex-shrink-0 p-1 rounded transition-colors ${
							isVisible ? 'text-brand-pink hover:text-brand-pink-dark' : 'text-gray-400 hover:text-gray-600'
						}`}
						title={isVisible ? `Hide ${section.label} from resume` : `Show ${section.label} on resume`}
					>
						<FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-3.5 h-3.5" />
					</button>
				)}
				
				{/* Scroll Arrow - Only show for visible, non-locked sections */}
				{!isLocked && isVisible && onScrollToSection && (
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
	}

	return (
		<div className="space-y-3">
			<label className="block text-sm font-medium text-gray-700 mb-2">
				Section Order
			</label>
			
			{/* Mini Resume Preview Box - Grid layout: Header fixed, content sections draggable */}
			<div className="border-2 border-gray-300 rounded-lg bg-white p-4 shadow-sm">
				<div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
					Resume Preview
				</div>
				
				<div className="space-y-1.5">
					{/* Header - fixed at top, not draggable */}
					{renderSectionRow('header', 0, false)}
					
					{/* Draggable content sections */}
					{draggableOrder.map((sectionKey, index) => renderSectionRow(sectionKey, index, true))}
				</div>
			</div>
			
			{/* Helper Text */}
			<p className="text-xs text-gray-500 italic">
				Header is fixed at top. Drag visible sections to reorder. Use the eye icon to show or hide sections.
			</p>
		</div>
	)
}

export default SectionOrdering
