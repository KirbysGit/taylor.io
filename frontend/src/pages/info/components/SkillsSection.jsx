import React from 'react'
import SkillsInput from '@/components/inputs/SkillsInput'

const SkillsSection = ({ skills, onAdd, onRemove, onUpdate, onSave, isSaving }) => {
	return (
		<section 
			className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
			style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
		>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-xl font-bold text-gray-900">Skills</h2>
					<p className="text-sm text-gray-600 mt-1">Organize your skills into categories</p>
				</div>
				<button
					onClick={onSave}
					disabled={isSaving}
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
				>
					{isSaving ? 'Saving...' : 'Save Skills'}
				</button>
			</div>
			<div className="smallDivider mb-4"></div>
			<SkillsInput 
				skills={skills} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
			/>
		</section>
	)
}

export default SkillsSection
