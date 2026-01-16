import React from 'react';

// Extracurriculars Step Component.
const ExtracurricularsStep = ({ extracurriculars, onAdd, onRemove, onUpdate }) => {
	const [form, setForm] = useState({
		name: '',
		role: '',
		description: '',
		startDate: '',
		endDate: '',
		current: false,
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		if (form.name) {
			onAdd({ ...form, id: Date.now() })
			setForm({ name: '', role: '', description: '', startDate: '', endDate: '', current: false })
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Tell us about your extracurriculars</h2>
			<p className="text-gray-600 mb-6">Add clubs, organizations, volunteer work, or other activities. You can add multiple entries.</p>

			<form onSubmit={handleSubmit} className="space-y-4 mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Activity/Organization Name *</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
						<input
							type="text"
							value={form.role}
							onChange={(e) => setForm({ ...form, role: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							placeholder="e.g., President, Volunteer, Member"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
						<textarea
							value={form.description}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
							rows="3"
							placeholder="Describe your involvement and achievements..."
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
							<span className="text-sm text-gray-700">Currently active</span>
						</label>
					</div>
				</div>
				<button
					type="submit"
					className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
				>
					Add Extracurricular
				</button>
			</form>

			{extracurriculars.length > 0 && (
				<div className="space-y-2">
					<h3 className="font-semibold text-gray-900">Added Extracurriculars:</h3>
					{extracurriculars.map((extra, index) => (
						<div key={extra.id || index} className="bg-gray-50 p-4 rounded-lg flex justify-between items-start">
							<div>
								<p className="font-medium text-gray-900">{extra.name}</p>
								{extra.role && <p className="text-sm text-gray-600">{extra.role}</p>}
								{extra.description && <p className="text-sm text-gray-500 mt-1">{extra.description}</p>}
								<p className="text-xs text-gray-500 mt-1">
									{extra.startDate} - {extra.current ? 'Present' : extra.endDate || 'N/A'}
								</p>
							</div>
							<button
								onClick={() => onRemove(index)}
								className="text-red-500 hover:text-red-700 text-sm"
							>
								Remove
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default ExtracurricularsStep;