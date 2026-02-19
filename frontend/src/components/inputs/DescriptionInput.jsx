// components / inputs / DescriptionInput.jsx

import React, { useState, useEffect, useRef } from 'react';
import { XIcon, RequiredAsterisk } from '@/components/icons';
import { isBulletFormat, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';

// Reusable Description Input Component - Handles paragraph and bullet modes
const DescriptionInput = ({ value, onChange, placeholder = "Enter description...", required = false }) => {
	const [mode, setMode] = useState('paragraph')
	const [bullets, setBullets] = useState([''])
	const isTogglingRef = useRef(false) // Prevent useEffect from interfering during toggle

	// Initialize mode and bullets based on existing value
	/*
	useEffect(() => {
		// Skip if we're in the middle of a toggle to prevent render loops
		if (isTogglingRef.current) return
		
		if (value !== undefined) {
			try {
				const safeValue = value || ''
				const isBullet = isBulletFormat(safeValue)
				const newMode = isBullet ? 'bullets' : 'paragraph'
				
				// Only update if mode actually changed to prevent unnecessary re-renders
				setMode(prevMode => {
					if (prevMode !== newMode) {
						return newMode
					}
					return prevMode
				})
				
				if (isBullet) {
					const newBullets = paragraphToBullets(safeValue)
					setBullets(Array.isArray(newBullets) && newBullets.length > 0 ? newBullets : [''])
				} else {
					// Only reset bullets if we're actually in paragraph mode
					setBullets(prev => {
						if (prev.length === 0 || (prev.length === 1 && !prev[0])) {
							return ['']
						}
						return prev
					})
				}
			} catch (error) {
				console.error('Error in DescriptionInput useEffect:', error)
			}
		}
	}, [value])
	*/
	
	// Handle mode toggle
	const handleModeToggle = () => {
		try {
			console.log('handleModeToggle called')
			isTogglingRef.current = true // Flag that we're toggling
			
			const newMode = mode === 'paragraph' ? 'bullets' : 'paragraph'
			const currentDescription = value || ''
			console.log('currentDescription', currentDescription)
			if (newMode === 'bullets') {
				// Convert paragraph to bullets
				const newBullets = paragraphToBullets(currentDescription)
				const safeBullets = Array.isArray(newBullets) && newBullets.length > 0 ? newBullets : ['']
				
				setBullets(safeBullets)
				console.log('HERE WE ARE')
				const bulletString = bulletsToParagraph(safeBullets)
				console.log('bulletString', bulletString)
				// Only call onChange if we have a valid string
				if (typeof bulletString === 'string') {
					onChange(bulletString)
				}
			} else {
				// Convert bullets to paragraph (without bullet prefix)
				const paragraph = bullets
					.filter(b => b && typeof b === 'string' && b.trim())
					.join('\n')
				
				onChange(paragraph)
			}
			
			console.log('newMode', newMode)
			setMode(newMode)
			
			// Reset flag after a short delay to allow state updates to complete
			setTimeout(() => {
				isTogglingRef.current = false
			}, 0)

			console.log('mode', mode)
		} catch (error) {
			console.error('Error in handleModeToggle:', error)
			isTogglingRef.current = false
		}
	}

	// Handle bullet change
	const handleBulletChange = (bulletIndex, bulletValue) => {
		try {
			const newBullets = [...bullets]
			if (bulletIndex >= 0 && bulletIndex < newBullets.length) {
				newBullets[bulletIndex] = bulletValue || ''
				setBullets(newBullets)
				
				// Update description field with bullet format
				const bulletString = bulletsToParagraph(newBullets)
				if (typeof bulletString === 'string') {
					onChange(bulletString)
				}
			}
		} catch (error) {
			console.error('Error in handleBulletChange:', error)
		}
	}

	// Handle add bullet
	const handleAddBullet = () => {
		setBullets([...bullets, ''])
	}

	// Handle remove bullet
	const handleRemoveBullet = (bulletIndex) => {
		try {
			if (bullets.length <= 1) return // Keep at least one
			const newBullets = bullets.filter((_, i) => i !== bulletIndex)
			setBullets(newBullets)
			
			// Update description field
			const bulletString = bulletsToParagraph(newBullets)
			if (typeof bulletString === 'string') {
				onChange(bulletString)
			}
		} catch (error) {
			console.error('Error in handleRemoveBullet:', error)
		}
	}

	return (
		<div className="space-y-2">
			{/* Label with Toggle */}
			<div className="grid grid-cols-3 items-center mb-1">
				<label className="label mb-0">
					Description {required && <RequiredAsterisk />}
				</label>
				
				{/* Toggle Switch - Centered */}
				<div className="flex justify-center items-center gap-2">
					<span className={`text-xs font-medium ${mode === 'paragraph' ? 'text-brand-pink' : 'text-gray-400'}`}>
						Paragraph
					</span>
					<label className="flex items-center cursor-pointer">
						<input
							type="checkbox"
							checked={mode === 'bullets'}
							onChange={(e) => {
								e.preventDefault()
								handleModeToggle()
							}}
							className="sr-only"
						/>
						<div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
							mode === 'bullets' ? 'bg-brand-pink' : 'bg-gray-300'
						}`}>
							<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
								mode === 'bullets' ? 'translate-x-6' : 'translate-x-0'
							}`}></div>
						</div>
					</label>
					<span className={`text-xs font-medium ${mode === 'bullets' ? 'text-brand-pink' : 'text-gray-400'}`}>
						Bullets
					</span>
				</div>
				
				{/* Spacer */}
				<div></div>
			</div>

			{/* Input - Conditional Rendering */}
			{mode === 'paragraph' ? (
				<textarea
					value={value || ''}
					onChange={(e) => onChange(e.target.value)}
					className="input min-h-[100px] resize-y"
					placeholder={placeholder}
				/>
			) : (
				<div className="space-y-2">
					{bullets.length === 0 ? (
						<div className="text-center py-6 text-gray-400 border border-gray-200 rounded-md">
							<p className="text-sm">No bullets yet. Click "Add Another Bullet" to get started.</p>
						</div>
					) : (
						bullets.map((bullet, bulletIndex) => (
							<div key={bulletIndex} className="flex items-center gap-2">
								<span className="text-gray-600 font-medium">•</span>
								<input
									type="text"
									value={bullet}
									onChange={(e) => handleBulletChange(bulletIndex, e.target.value)}
									className="flex-1 input"
									placeholder="Enter a bullet point..."
								/>
								{bullets.length > 1 && (
									<button
										type="button"
										onClick={() => handleRemoveBullet(bulletIndex)}
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
						onClick={handleAddBullet}
						className="w-full px-3 py-2 bg-brand-pink text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
					>
						+ Add Another Bullet
					</button>
				</div>
			)}
		</div>
	)
}

export default DescriptionInput
