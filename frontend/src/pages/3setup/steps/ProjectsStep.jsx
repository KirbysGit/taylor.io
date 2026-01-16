import React from 'react';
import { useState } from 'react';

// Projects Step Component.
const ProjectsStep = ({ projects, onAdd, onRemove, onUpdate }) => {
	const [form, setForm] = useState({
		title: '',
		description: '',
		techStack: '',
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.title) {
			const techStackArray = form.techStack
				.split(',')
				.map(tech => tech.trim())
				.filter(tech => tech.length > 0)
			onAdd({ ...form, techStack: techStackArray, id: Date.now() })
			setForm({ title: '', description: '', techStack: '' })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Showcase your projects</h2>
			<p className="text-gray-600 mb-6">Add projects you've worked on. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
					<input
						type="text"
						value={form.title}
						onChange={(e) => setForm({ ...form, title: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						value={form.description}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						rows="3"
						placeholder="Describe your project..."
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack</label>
					<input
						type="text"
						value={form.techStack}
						onChange={(e) => setForm({ ...form, techStack: e.target.value })}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., React, Node.js, PostgreSQL (comma-separated)"
					/>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Project
				</button>
			</form>

			{projects.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Projects ({projects.length}):</h3>
					{projects.map((project, index) => (
						<div key={project.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* Project Title */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{project.title || 'Untitled Project'}</h4>
										{project.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Description */}
									{project.description && (
										<div className="mb-3">
											<div className="text-sm text-gray-600 leading-relaxed">
												{Array.isArray(project.description) ? (
													// description is an array of bullet points
													project.description.map((item, idx) => (
														<div key={idx} className="ml-4 mb-1">
															• {item}
														</div>
													))
												) : (
													// description is a string
													<p>{project.description}</p>
												)}
											</div>
										</div>
									)}
									
									{/* Tech Stack */}
									{project.techStack && project.techStack.length > 0 && (
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-medium text-gray-500">Tech Stack:</span>
											<div className="flex flex-wrap gap-2">
												{project.techStack.map((tech, i) => (
													<span key={i} className="text-xs bg-brand-pink/10 text-brand-pink px-3 py-1 rounded-full font-medium">
														{tech}
													</span>
												))}
											</div>
										</div>
									)}
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this project entry"
								>
									Remove
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default ProjectsStep;