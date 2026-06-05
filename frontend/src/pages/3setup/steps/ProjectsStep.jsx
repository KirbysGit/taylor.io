// pages / 3setup / steps / ProjectsStep.jsx

import React from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'

// Projects Step Component - Uses ProjectsInput with setup flow header
const ProjectsStep = ({ projects, onAdd, onRemove, onUpdate }) => {
	return (
		<div className="w-full">
			<div className="mb-3">
				<h2 className="mb-2 font-serif text-3xl font-bold tracking-tight text-gray-950">Showcase your projects</h2>
				<p className="text-gray-600">
					Add projects you&apos;ve worked on. Share what you&apos;ve built and the technologies you used.
				</p>
			</div>

			<div className="smallDivider mb-3" />

			<ProjectsInput projects={projects} onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate} />
		</div>
	)
}

export default ProjectsStep
