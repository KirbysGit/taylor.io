import React from 'react';
import { useState } from 'react';

// Education Step Component.
const EducationStep = ({ education, onAdd, onRemove, onUpdate }) => {
	const [form, setForm] = useState({
		school: '',
		degree: '',
		discipline: '',
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
		if (form.school && form.degree) {
			onAdd({ ...form, id: Date.now() })
			setForm({ school: '', degree: '', discipline: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your education</h2>
			<p className="text-gray-600 mb-6">Add your educational background. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">School/University *</label>
						<input
							type="text"
							value={form.school}
							onChange={(e) => setForm({ ...form, school: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
						<input
							type="text"
							value={form.degree}
							onChange={(e) => setForm({ ...form, degree: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., Bachelor of Science"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
						<input
							type="text"
							value={form.discipline}
							onChange={(e) => setForm({ ...form, discipline: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., Computer Science"
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
					<div className="flex items-center pt-6">
						<label className="flex items-center">
							<input
								type="checkbox"
								checked={form.current}
								onChange={(e) => setForm({ ...form, current: e.target.checked, endDate: '' })}
								className="mr-2"
							/>
							<span className="text-sm text-gray-700">Currently attending</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Education
				</button>
			</form>

			{education.length > 0 && (
				<div className="space-y-3 mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Added Education ({education.length}):</h3>
					{education.map((edu, index) => (
						<div key={edu.id || index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
							<div className="flex justify-between items-start">
								<div className="flex-1">
									{/* School Name */}
									<div className="flex items-center gap-2 mb-2">
										<h4 className="text-lg font-semibold text-gray-900">{edu.school || 'Unnamed School'}</h4>
										{edu.fromParsed && (
											<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
												Parsed
											</span>
										)}
									</div>
									
									{/* Degree and Field */}
									<div className="mb-2">
										<p className="text-base text-gray-700 font-medium">
											{edu.degree || 'Degree not specified'}
										</p>
										{edu.discipline && (
											<p className="text-sm text-gray-600 mt-0.5">
												Discipline: <span className="font-medium">{edu.discipline}</span>
											</p>
										)}
									</div>
									
									{/* Dates */}
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<span className="font-medium">Dates:</span>
										<span>
											{formatDate(edu.startDate)}
											{' - '}
											{edu.current ? (
												<span className="text-brand-pink font-semibold">Present</span>
											) : (
												formatDate(edu.endDate)
											)}
										</span>
									</div>
								</div>
								
								{/* Remove Button */}
								<button
									onClick={() => onRemove(index)}
									className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
									title="Remove this education entry"
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

export default EducationStep