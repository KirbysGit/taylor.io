// components/modals/AddExperienceModal.jsx

// modal for adding a new experience.

// imports.
import { useState } from 'react'
import { createExperience } from '@/api/services/profile'

// ----------- main component -----------

function AddExperienceModal({ isOpen, onClose, onSuccess }) {
	const [form, setForm] = useState({
		title: '',
		company: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
	})
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	// function to handle form submission.
	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		
		if (!form.title || !form.company) {
			setError('Title and Company are required')
			return
		}

		setIsLoading(true)

		try {
			// Convert month string to ISO date string
			const monthToDate = (monthStr) => {
				if (!monthStr) return null
				return `${monthStr}-01T00:00:00`
			}

			const experienceData = {
				title: form.title,
				company: form.company,
				description: form.description || null,
				start_date: monthToDate(form.startDate),
				end_date: form.current ? null : monthToDate(form.endDate),
			}

			await createExperience(experienceData)
			
			// Reset form
			setForm({
				title: '',
				company: '',
				description: '',
				startDate: '',
				endDate: '',
				current: false,
			})

			// Call success callback to refresh data
			if (onSuccess) {
				onSuccess()
			}

			// Close modal
			onClose()
		} catch (err) {
			console.error('Error creating experience:', err)
			setError(err.response?.data?.detail || 'Failed to create experience. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	// function to handle input change.
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setForm(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value
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
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Add Experience</h2>
					<p className="text-gray-600">Add a new work experience to your profile</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Job Title *
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
								Company *
							</label>
							<input
								type="text"
								name="company"
								value={form.company}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
								required
							/>
						</div>
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
							placeholder="Describe your responsibilities and achievements..."
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Start Date
							</label>
							<input
								type="month"
								name="startDate"
								value={form.startDate}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								End Date
							</label>
							<input
								type="month"
								name="endDate"
								value={form.endDate}
								onChange={handleChange}
								disabled={form.current}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent disabled:bg-gray-100"
							/>
						</div>
					</div>

					<div className="flex items-center">
						<label className="flex items-center">
							<input
								type="checkbox"
								name="current"
								checked={form.current}
								onChange={handleChange}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">I currently work here</span>
						</label>
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
							{isLoading ? 'Adding...' : 'Add Experience'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// export.
export default AddExperienceModal

