// components / inputs / DescriptionInput.jsx

import React, { useState, useEffect } from 'react';
import { XIcon, RequiredAsterisk } from '@/components/icons';
import { isBulletFormat, paragraphToBullets, bulletsToParagraph } from '@/utils/descriptionHelpers';

// Reusable Description Input Component - Handles paragraph and bullet modes
const DescriptionInput = ({ value, onChange, placeholder = "Enter description...", required = false }) => {
	const [mode, setMode] = useState('paragraph')
	const [bullets, setBullets] = useState([''])

	// Initialize mode and bullets based on existing value
	useEffect(() => {
		if (value !== undefined) {
			const isBullet = isBulletFormat(value || '')
			setMode(isBullet ? 'bullets' : 'paragraph')
			if (isBullet) {
				setBullets(paragraphToBullets(value || ''))
			} else {
				setBullets([''])
			}
		}
	}, [value])

	// Handle mode toggle
	const handleModeToggle = () => {
		const newMode = mode === 'paragraph' ? 'bullets' : 'paragraph'
		const currentDescription = value || ''
		
		if (newMode === 'bullets') {
			// Convert paragraph to bullets
			const newBullets = paragraphToBullets(currentDescription)
			setBullets(newBullets.length > 0 ? newBullets : [''])
			const bulletString = bulletsToParagraph(newBullets)
			onChange(bulletString)
		} else {
			// Convert bullets to paragraph
			const paragraph = bullets.filter(b => b.trim()).join('\n')
			onChange(paragraph)
		}
		
		setMode(newMode)
	}

	// Handle bullet change
	const handleBulletChange = (bulletIndex, bulletValue) => {
		const newBullets = [...bullets]
		newBullets[bulletIndex] = bulletValue
		setBullets(newBullets)
		
		// Update description field with bullet format
		const bulletString = bulletsToParagraph(newBullets)
		onChange(bulletString)
	}

	// Handle add bullet
	const handleAddBullet = () => {
		setBullets([...bullets, ''])
	}

	// Handle remove bullet
	const handleRemoveBullet = (bulletIndex) => {
		if (bullets.length <= 1) return // Keep at least one
		const newBullets = bullets.filter((_, i) => i !== bulletIndex)
		setBullets(newBullets)
		
		// Update description field
		const bulletString = bulletsToParagraph(newBullets)
		onChange(bulletString)
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
							onChange={handleModeToggle}
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
