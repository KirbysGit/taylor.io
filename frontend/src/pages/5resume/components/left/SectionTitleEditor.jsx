// components / left / SectionTitleEditor.jsx

// Reusable component for editing section titles inline with pencil icon.

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil } from '@fortawesome/free-solid-svg-icons'

function SectionTitleEditor({ 
	sectionKey, 
	currentLabel, 
	onLabelChange,
	defaultLabel 
}) {
	const [isEditing, setIsEditing] = useState(false)
	const [editValue, setEditValue] = useState(currentLabel || defaultLabel)
	const inputRef = useRef(null)

	// Update local state when currentLabel prop changes
	useEffect(() => {
		setEditValue(currentLabel || defaultLabel)
	}, [currentLabel, defaultLabel])

	// Focus input when editing starts
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	const handlePencilClick = (e) => {
		e.stopPropagation() // Prevent expanding/collapsing section
		setIsEditing(true)
		setEditValue(currentLabel || defaultLabel)
	}

	const handleSave = async () => {
		const trimmedValue = editValue.trim()
		if (trimmedValue && trimmedValue !== currentLabel) {
			await onLabelChange(sectionKey, trimmedValue)
		} else if (!trimmedValue) {
			// If empty, revert to current label
			setEditValue(currentLabel || defaultLabel)
		}
		setIsEditing(false)
	}

	const handleCancel = () => {
		setEditValue(currentLabel || defaultLabel)
		setIsEditing(false)
	}

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSave()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			handleCancel()
		}
	}

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="text"
				value={editValue}
				onChange={(e) => setEditValue(e.target.value)}
				onBlur={handleSave}
				onKeyDown={handleKeyDown}
				className="text-[1.375rem] font-semibold text-gray-900 bg-white border-2 border-brand-pink rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-pink"
				style={{ minWidth: '150px', maxWidth: '300px' }}
				onClick={(e) => e.stopPropagation()}
			/>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<h1 className="text-[1.375rem] font-semibold text-gray-900">
				{currentLabel || defaultLabel}
			</h1>
			<button
				type="button"
				onClick={handlePencilClick}
				className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
				aria-label={`Edit ${currentLabel || defaultLabel} section name`}
				title={`Edit section name`}
			>
				<FontAwesomeIcon icon={faPencil} className="w-3 h-3 text-gray-600" />
			</button>
		</div>
	)
}

export default SectionTitleEditor
