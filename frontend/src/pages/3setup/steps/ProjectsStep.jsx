// pages / 3setup / steps / ProjectsStep.jsx

import { forwardRef, useImperativeHandle, useRef } from 'react'
import ProjectsInput from '@/components/inputs/ProjectsInput'

const ProjectsStep = forwardRef(function ProjectsStep({ projects, onAdd, onRemove, onUpdate }, ref) {
	const projectsRef = useRef(null)

	useImperativeHandle(ref, () => ({
		revealMissingRequired: () => projectsRef.current?.revealMissingRequired?.(),
	}))

	return (
		<div className="w-full">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-serif text-3xl font-bold tracking-tight text-gray-950">Showcase your projects</h2>
					<p className="mt-1 text-gray-600">Add projects you&apos;ve worked on and the technologies you used.</p>
				</div>
				<button
					type="button"
					onClick={() => projectsRef.current?.addNew()}
					className="profileAddButtonPrimary shrink-0"
				>
					+ Add project
				</button>
			</div>
			<div className="smallDivider mb-6" />
			<ProjectsInput
				ref={projectsRef}
				projects={projects}
				onAdd={onAdd}
				onRemove={onRemove}
				onUpdate={onUpdate}
				hideHeader
			/>
		</div>
	)
})

export default ProjectsStep
