import React from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'

const ProjectsSection = ({ projects, onAdd, onRemove, onUpdate, onSave, isSaving }) => {
	return (
		<section 
			className="bg-white-bright rounded-xl p-6 border-2 border-gray-200"
			style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
		>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-xl font-bold text-gray-900">Projects</h2>
					<p className="text-sm text-gray-600 mt-1">Showcase your work</p>
				</div>
				<button
					onClick={onSave}
					disabled={isSaving}
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
				>
					{isSaving ? 'Saving...' : 'Save Projects'}
				</button>
			</div>
			<div className="smallDivider mb-4"></div>
			<ProjectsInput 
				projects={projects} 
				onAdd={onAdd} 
				onRemove={onRemove} 
				onUpdate={onUpdate} 
			/>
		</section>
	)
}

export default ProjectsSection
