import React from 'react';
import { useState } from 'react';

// Experience Step Component.
const ExperienceStep = ({ experiences, onAdd, onRemove, onUpdate }) => {
	const [form, setForm] = useState({
		title: '',
		company: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
	})

	// helper function to format date strings (YYYY-MM format)
	const formatDate = (dateStr) => {
		if (!dateStr) return 'Not specified'
		try {
			// handle YYYY-MM format
			if (dateStr.match(/^\d{4}-\d{2}$/)) {
				const [year, month] = dateStr.split('-')
				const date = new Date(parseInt(year), parseInt(month) - 1, 1)
				return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
			}
			// handle other formats
			const date = new Date(dateStr)
			if (isNaN(date.getTime())) return dateStr
			return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
		} catch {
			return dateStr
		}
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.title && form.company) {
			onAdd({ ...form, id: Date.now() })
			setForm({ title: '', company: '', description: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Share your work experience</h2>
			<p className="text-gray-600 mb-6">Add your professional experiences. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
						<input
							type="text"
							value={form.title}
							onChange={(e) => setForm({ ...form, title: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
						<input
							type="text"
							value={form.company}
							onChange={(e) => setForm({ ...form, company: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							rows="3"
							placeholder="Describe your responsibilities and achievements..."
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input
							type="month"
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input
							type="month"
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value, current: false })}
							disabled={form.current}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent disabled:bg-gray-100"
						/>
					</div>
					<div className="flex items-center pt-2">
						<label className="flex items-center">
							<input
								type="checkbox"
								checked={form.current}
								onChange={(e) => setForm({ ...form, current: e.target.checked, endDate: '' })}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">I currently work here</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Experience
				</button>
			</form>

			{experiences.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Experiences ({experiences.length}):</h3>
					{experiences.map((exp, index) => (
						<div key={exp.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* Job Title */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{exp.title || 'Untitled Position'}</h4>
										{exp.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Company */}
									<div className="mb-2">
										<p className="text-base text-gray-700 font-medium">
											{exp.company || 'Company not specified'}
										</p>
									</div>
									
									{/* Description */}
									{exp.description && (
										<div className="mb-2">
											<div className="text-sm text-gray-600 leading-relaxed">
												{Array.isArray(exp.description) ? (
													// description is an array of bullet points
													exp.description.map((item, idx) => (
														<div key={idx} className="ml-4 mb-1">
															• {item}
														</div>
													))
												) : (
													// description is a string
													exp.description.split('\n').map((line, idx) => {
														// format bullet points
														if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
															return (
																<div key={idx} className="ml-4 mb-1">
																	{line.trim()}
																</div>
															)
														}
														return (
															<div key={idx} className="mb-1">
																{line}
															</div>
														)
													})
												)}
											</div>
										</div>
									)}
									
									{/* Dates */}
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<span className="font-medium">Dates:</span>
										<span>
											{formatDate(exp.startDate)}
											{' - '}
											{exp.current ? (
												<span className="text-brand-pink font-semibold">Present</span>
											) : (
												formatDate(exp.endDate)
											)}
										</span>
									</div>
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this experience entry"
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

export default ExperienceStep;