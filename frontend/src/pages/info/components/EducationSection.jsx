import React from 'react'
import EducationInput from '@/components/inputs/EducationInput'

const EducationSection = ({ education, onAdd, onRemove, onUpdate, onSave, isSaving, onSubsectionUpdate }) => {
	return (
		<section 
			className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
			style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
		>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-xl font-bold text-gray-900">Education</h2>
					<p className="text-sm text-gray-600 mt-1">Your academic background</p>
				</div>
				<button
					onClick={onSave}
					disabled={isSaving}
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
				>
					{isSaving ? 'Saving...' : 'Save Education'}
				</button>
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
