// components/modals/AddProjectModal.jsx

// modal for adding a new project.

// imports.
import { useState } from 'react'
import { createProject } from '@/api/services/profile'

// ----------- main component -----------

function AddProjectModal({ isOpen, onClose, onSuccess }) {
	const [form, setForm] = useState({
		title: '',
		description: '',
		techStack: '',
	})
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	// function to handle form submission.
	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		
		if (!form.title) {
			setError('Project title is required')
			return
		}

		setIsLoading(true)

		try {
			const techStackArray = form.techStack
				.split(',')
				.map(tech => tech.trim())
				.filter(tech => tech.length > 0)

			const projectData = {
				title: form.title,
				description: form.description || null,
				tech_stack: techStackArray.length > 0 ? techStackArray : null,
			}

			await createProject(projectData)
			
			// Reset form
			setForm({
				title: '',
				description: '',
				techStack: '',
			})

			// Call success callback to refresh data
			if (onSuccess) {
				onSuccess()
			}

			// Close modal
			onClose()
		} catch (err) {
			console.error('Error creating project:', err)
			setError(err.response?.data?.detail || 'Failed to create project. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	// function to handle input change.
	const handleChange = (e) => {
		const { name, value } = e.target
		setForm(prev => ({
			...prev,
			[name]: value
		}))
	}

	// if modal is not open, return null.
	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white-bright rounded-lg shadow-xl w-full max-w-2xl p-8 relative max-h-[90vh] overflow-y-auto">
				{/* Close Button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				{/* Header */}
				<div className="mb-6">
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Add Project</h2>
					<p className="text-gray-600">Add a new project to showcase your work</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Project Title *
						</label>
						<input
							type="text"
							name="title"
							value={form.title}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Description
						</label>
						<textarea
							name="description"
							value={form.description}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							rows="4"
							placeholder="Describe your project, what you built, and key features..."
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Tech Stack
						</label>
						<input
							type="text"
							name="techStack"
							value={form.techStack}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., React, Node.js, PostgreSQL (comma-separated)"
						/>
						<p className="text-xs text-gray-500 mt-1">Separate technologies with commas</p>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					)}

					{/* Buttons */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 px-4 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Adding...' : 'Add Project'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// export.
export default AddProjectModal

