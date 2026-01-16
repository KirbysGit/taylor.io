import React from 'react';

// Coursework Step Component.
const CourseworkStep = ({ coursework, onAdd, onRemove }) => {
	const [courseInput, setCourseInput] = useState('')

	const handleAddCourse = (e) => {
		e.preventDefault()
		if (courseInput.trim()) {
			onAdd({ name: courseInput.trim(), id: Date.now() })
			setCourseInput('')
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">What relevant coursework have you completed?</h2>
			<p className="text-gray-600 mb-6">Add courses that are relevant to your career. Press Enter or click Add after each course.</p>

			<form onSubmit={handleAddCourse} className="mb-6">
				<div className="flex gap-2">
					<input
						type="text"
						value={courseInput}
						onChange={(e) => setCourseInput(e.target.value)}
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., Data Structures, Machine Learning, Web Development"
					/>
					<button
						type="submit"
						className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						Add
					</button>
				</div>
			</form>

			{coursework.length > 0 && (
				<div>
					<h3 className="font-semibold text-gray-900 mb-3">Your Coursework:</h3>
					<div className="flex flex-wrap gap-2">
						{coursework.map((course, index) => (
							<div
								key={course.id || index}
								className="bg-brand-pink/10 text-brand-pink px-4 py-2 rounded-full flex items-center gap-2"
							>
								<span>{course.name}</span>
								<button
									onClick={() => onRemove(index)}
									className="text-brand-pink hover:text-red-500"
								>
									×
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export default CourseworkStep;