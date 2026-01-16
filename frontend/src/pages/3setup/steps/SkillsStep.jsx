// pages / 3setup / steps / SkillsStep.jsx

// imports.
import React from 'react';
import { useState } from 'react';

// Skills Step Component.
const SkillsStep = ({ skills, onAdd, onRemove }) => {
	const [skillInput, setSkillInput] = useState('')

	const handleAddSkill = (e) => {
		e.preventDefault()
		if (skillInput.trim()) {
			onAdd({ name: skillInput.trim(), id: Date.now() })
			setSkillInput('')
		}
	}

	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">What are your skills?</h2>
			<p className="text-gray-600 mb-6">Add your technical and professional skills. Press Enter or click Add after each skill.</p>

			<form onSubmit={handleAddSkill} className="mb-6">
				<div className="flex gap-2">
					<input
						type="text"
						value={skillInput}
						onChange={(e) => setSkillInput(e.target.value)}
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="e.g., JavaScript, Python, Project Management"
					/>
					<button
						type="submit"
						className="px-6 py-2 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all"
					>
						Add
					</button>
				</div>
			</form>

			{skills.length > 0 && (
				<div className="mt-6">
					<h3 className="font-semibold text-gray-900 mb-4">Your Skills ({skills.length}):</h3>
					
					{/* Group skills by category if they have categories */}
					{(() => {
						// Check if any skills have categories
						const skillsWithCategories = skills.filter(s => s.category)
						const skillsWithoutCategories = skills.filter(s => !s.category)
						
						if (skillsWithCategories.length > 0) {
							// Group by category
							const groupedByCategory = {}
							skillsWithCategories.forEach(skill => {
								const category = skill.category || 'Other'
								if (!groupedByCategory[category]) {
									groupedByCategory[category] = []
								}
								groupedByCategory[category].push(skill)
							})
							
							return (
								<div className="space-y-4">
									{/* Skills grouped by category */}
									{Object.entries(groupedByCategory).map(([category, categorySkills]) => (
										<div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-base font-semibold text-gray-900">
													{category}:
												</h4>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
													{categorySkills.length} {categorySkills.length === 1 ? 'skill' : 'skills'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2">
												{categorySkills.map((skill, idx) => {
													const originalIndex = skills.findIndex(s => s.id === skill.id)
													return (
														<div
															key={skill.id || idx}
															className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
														>
															<span>{skill.name}</span>
															{skill.fromParsed && (
																<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																	Parsed
																</span>
															)}
															<button
																onClick={() => onRemove(originalIndex)}
																className="text-brand-pink hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																title="Remove this skill"
															>
																×
															</button>
														</div>
													)
												})}
											</div>
										</div>
									))}
									
									{/* Skills without categories */}
									{skillsWithoutCategories.length > 0 && (
										<div className="bg-white border border-gray-200 rounded-lg p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="text-base font-semibold text-gray-900">
													Other Skills:
												</h4>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
													{skillsWithoutCategories.length} {skillsWithoutCategories.length === 1 ? 'skill' : 'skills'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2">
												{skillsWithoutCategories.map((skill, idx) => {
													const originalIndex = skills.findIndex(s => s.id === skill.id)
													return (
														<div
															key={skill.id || idx}
															className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
																skill.fromParsed
																	? 'bg-blue-50 border border-blue-200 text-blue-800'
																	: 'bg-brand-pink/10 border border-brand-pink/20 text-brand-pink'
															}`}
														>
															<span>{skill.name}</span>
															{skill.fromParsed && (
																<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																	Parsed
																</span>
															)}
															<button
																onClick={() => onRemove(originalIndex)}
																className={`rounded px-1 transition-colors ${
																	skill.fromParsed
																		? 'text-blue-600 hover:text-red-600 hover:bg-red-50'
																		: 'text-brand-pink hover:text-red-600 hover:bg-red-50'
																}`}
																title="Remove this skill"
															>
																×
															</button>
														</div>
													)
												})}
											</div>
										</div>
									)}
								</div>
							)
						} else {
							// No categories, show simple list grouped by parsed/manual
							return (
								<div className="space-y-4">
									{skills.some(s => s.fromParsed) && skills.some(s => !s.fromParsed) ? (
										<>
											{/* Parsed Skills */}
											{skills.some(s => s.fromParsed) && (
												<div className="bg-white border border-gray-200 rounded-lg p-4">
													<div className="flex items-center justify-between mb-3">
														<h4 className="text-base font-semibold text-gray-700">From Resume:</h4>
														<span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
															{skills.filter(s => s.fromParsed).length} skills
														</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{skills.filter(s => s.fromParsed).map((skill, idx) => {
															const originalIndex = skills.findIndex(s => s.id === skill.id)
															return (
																<div
																	key={skill.id || idx}
																	className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
																>
																	<span>{skill.name}</span>
																	<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
																		Parsed
																	</span>
																	<button
																		onClick={() => onRemove(originalIndex)}
																		className="text-blue-600 hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																		title="Remove this skill"
																	>
																		×
																	</button>
																</div>
															)
														})}
													</div>
												</div>
											)}
											
											{/* Manually Added Skills */}
											{skills.some(s => !s.fromParsed) && (
												<div className="bg-white border border-gray-200 rounded-lg p-4">
													<div className="flex items-center justify-between mb-3">
														<h4 className="text-base font-semibold text-gray-700">Manually Added:</h4>
														<span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
															{skills.filter(s => !s.fromParsed).length} skills
														</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{skills.filter(s => !s.fromParsed).map((skill, idx) => {
															const originalIndex = skills.findIndex(s => s.id === skill.id)
															return (
																<div
																	key={skill.id || idx}
																	className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium"
																>
																	<span>{skill.name}</span>
																	<button
																		onClick={() => onRemove(originalIndex)}
																		className="text-brand-pink hover:text-red-600 hover:bg-red-50 rounded px-1 transition-colors"
																		title="Remove this skill"
																	>
																		×
																	</button>
																</div>
															)
														})}
													</div>
												</div>
											)}
										</>
									) : (
										<div className="flex flex-wrap gap-2">
											{skills.map((skill, index) => (
												<div
													key={skill.id || index}
													className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
														skill.fromParsed
															? 'bg-blue-50 border border-blue-200 text-blue-800'
															: 'bg-brand-pink/10 border border-brand-pink/20 text-brand-pink'
													}`}
												>
													<span>{skill.name}</span>
													{skill.fromParsed && (
														<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
															Parsed
														</span>
													)}
													<button
														onClick={() => onRemove(index)}
														className={`rounded px-1 transition-colors ${
															skill.fromParsed
																? 'text-blue-600 hover:text-red-600 hover:bg-red-50'
																: 'text-brand-pink hover:text-red-600 hover:bg-red-50'
														}`}
														title="Remove this skill"
													>
														×
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							)
						}
					})()}
				</div>
			)}
		</div>
	)
}

export default SkillsStep;