// pages / 5resume / components / Projects.jsx

// projects modal of resume preview section.


// imports.
import React from 'react';
import { useState, useEffect } from 'react'

// icon imports.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus} from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp} from '@/components/icons'

// normalize project data from backend.
const normalizeProject = (proj = null) => {
    return {
        title: proj?.title || '',
        description: proj?.description || '',
        tech_stack: Array.isArray(proj?.tech_stack) ? proj.tech_stack : (proj?.tech_stack ? [proj.tech_stack] : []),
        url: proj?.url || '',
    }
}

const Projects = ({ projectsData, onProjectsChange }) => {
    // ----- states -----
    const [isProjectsExpanded, setIsProjectsExpanded] = useState(true)	// whether the projects modal is expanded.

    // projects entries state.
    const [projects, setProjects] = useState(() => {
        if (projectsData && projectsData.length > 0) {
            return projectsData.map(proj => normalizeProject(proj))
        }
		
        // if no data, start with one empty entry (for adding new projects).
        return [normalizeProject()]
    })

	// ----- helper functions -----

    // update a specific project entry by index..
    const updateProject = (index, field, value) => {
        setProjects(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value }
            return updated
        })
    }

    // add a new empty project entry.
    const addProject = () => {
        setProjects(prev => [...prev, normalizeProject()])
    }

    // remove a project entry by index.
    const removeProject = (index) => {
        setProjects(prev => {
            if (prev.length <= 1) return prev // keep at least one entry.
            return prev.filter((_, i) => i !== index)
        })
    }

    // update tech stack.
    const updateTechStack = (index, value) => {
        // split by comma and clean up each item (split, trim, filter out empty strings).
        const techArray = value.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0)
        updateProject(index, 'tech_stack', techArray)
    }

    // ----- effects -----

	// sync with prop changes.
    useEffect(() => {
        if (projectsData && projectsData.length > 0) {
            setProjects(projectsData.map(proj => normalizeProject(proj)))
        }
    }, [projectsData])

    // export projects array to parent component.
    useEffect(() => {
        onProjectsChange(projects)
    }, [projects])

    return (
        <div>
            <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<button
				type="button"
				onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
				className="flex items-center gap-3 w-full transition-colors"
			>
				{/* title */}
				<h1 className="text-[1.375rem] font-semibold text-gray-900">Projects</h1>
				
				{/* divider */}
				<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
				
				{/* chevron in circle */}
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
					{isProjectsExpanded ? (
						<ChevronUp className="w-4 h-4 text-gray-600" />
					) : (
						<ChevronDown className="w-4 h-4 text-gray-600" />
					)}
				</div>
			</button>
			
			{isProjectsExpanded && (
				<div>
					<p className="text-[0.875rem] text-gray-500 mb-2">This is where you can showcase your projects.</p>
					
					{projects.map((project, index) => (
						<div key={index} className="mb-2 p-4 border border-gray-300 rounded-md">
							{/* entry header */}
							<div className="flex items-center justify-between mb-2 border-b-2 border-brand-pink-light pb-1">
								<h3 className="text-lg font-medium text-gray-700 m-0 p-0">
									Project {index + 1}
								</h3>
								{/* remove button (only show if there are multiple entries) */}
								{projects.length > 1 && (
									<button
										type="button"
										onClick={() => removeProject(index)}
										className="text-red-500 hover:text-red-700 text-sm"
									>
										Remove
									</button>
								)}
							</div>
							{/* title */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Title <RequiredAsterisk /></label>
									<input
										type="text"
										value={project.title}
										onChange={(e) => updateProject(index, 'title', e.target.value)}
										className="input"
										required
									/>
								</div>
							</div>
							{/* description */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Description <RequiredAsterisk /></label>
									<textarea
										value={project.description}
										onChange={(e) => updateProject(index, 'description', e.target.value)}
										className="input"
										required
									/>
								</div>
							</div>
							{/* tech stack */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">Tech Stack</label>
									<input
										type="text"
										value={project.tech_stack.join(', ')}
										onChange={(e) => updateTechStack(index, e.target.value)}
										className="input"
										placeholder="Python, Django, React (comma-separated)"
									/>
								</div>
							</div>
							{/* url */}
							<div className="flex mb-2">
								<div className="labelInputPair">
									<label className="label">URL</label>
									<input
										type="url"
										value={project.url}
										onChange={(e) => updateProject(index, 'url', e.target.value)}
										className="input"
										placeholder="https://example.com"
									/>
								</div>
							</div>
						</div>
					))}

					{/* add another project button */}
					<div className="flex justify-center mt-2">
						<button
							type="button"
							onClick={addProject}
							className="px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors"
						>
							<FontAwesomeIcon icon={faPlus} className="w-4 h-4 color-white mr-2" /> Add Another Project
						</button>
					</div>
				</div>
			)}
		</div>
        </div>
    )
}

export default Projects;
