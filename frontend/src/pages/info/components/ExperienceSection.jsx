import React from 'react'
import ExperienceInput from '@/components/inputs/ExperienceInput'

const ExperienceSection = ({ experiences, onAdd, onRemove, onUpdate }) => {
	return (
		<section 
			className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
			style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
		>
			<div className="mb-4">
				<h2 className="text-xl font-bold text-gray-900">Work Experience</h2>
				<p className="text-sm text-gray-600 mt-1">Your professional history</p>
			</div>
			<div className="smallDivider mb-4"></div>
			<ExperienceInput 
				experiences={experiences} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
			/>
		</section>
	)
}

export default ExperienceSection
