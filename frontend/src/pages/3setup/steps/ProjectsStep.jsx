// pages / 3setup / steps / ProjectsStep.jsx

// imports.
import React from 'react';
import ProjectsInput from '@/components/inputs/ProjectsInput';

// Projects Step Component - Uses ProjectsInput with setup flow header
const ProjectsStep = ({ projects, onAdd, onRemove, onUpdate }) => {
	return (
		<div className="w-full">
			{/* Header */}
			<div className="mb-3">
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Showcase your projects
				</h2>
				<p className="text-gray-600">
					Add projects you've worked on. Share what you've built and the technologies you used.
				</p>
			</div>

			<div className="smallDivider mb-3" />

			<ProjectsInput 
				projects={projects}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
			/>
		</div>
	)
}

export default ProjectsStep
