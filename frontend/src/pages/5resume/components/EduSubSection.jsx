import React from 'react'
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

// Subsection item component with local state for title editing
const EduSubSection = ({ eduIndex, title, content, onTitleChange, onContentChange, onDelete }) => {
    const [editingTitle, setEditingTitle] = useState(title)
    
    // Sync local title with prop when it changes externally
    useEffect(() => {
        setEditingTitle(title)
    }, [title])
    
    const handleTitleBlur = () => {
        if (editingTitle.trim() && editingTitle !== title) {
            onTitleChange(editingTitle.trim())
        } else if (!editingTitle.trim()) {
            // Reset to original if empty
            setEditingTitle(title)
        }
    }
    
    return (
        <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-md bg-gray-50">
            {/* Subsection header with title input and delete button */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="flex-1 input text-sm font-medium"
                    placeholder="Subsection title"
                />
                <button
                    type="button"
                    onClick={onDelete}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Delete subsection"
                >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </button>
            </div>
            
            {/* Subsection content input */}
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="input min-h-[60px] resize-y"
                placeholder="Enter content for this subsection..."
            />
        </div>
    )
}

export default EduSubSection;