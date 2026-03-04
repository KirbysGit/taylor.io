import React from 'react'
import EducationInput from '@/components/inputs/EducationInput'

const EducationSection = ({ education, onAdd, onRemove, onUpdate, onSubsectionUpdate }) => {
	return (
		<section 
			className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
			style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
		>
			<div className="mb-4">
				<h2 className="text-xl font-bold text-gray-900">Education</h2>
				<p className="text-sm text-gray-600 mt-1">Your academic background</p>
			</div>
			<div className="smallDivider mb-4"></div>
			<EducationInput 
				education={education} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate}
				showSubsections={true}
				onSubsectionUpdate={onSubsectionUpdate}
			/>
		</section>
	)
}

export default EducationSection
