import React, { useState, useEffect, useRef } from 'react';
import { XIcon, Pencil } from '@/components/icons';

// Skills Input Component - Just the form fields and logic, no headers
const SkillsInput = ({ skills, onAdd, onRemove, onUpdate }) => {
	const [skillInput, setSkillInput] = useState('');
	const [categories, setCategories] = useState(['Tools']);
	const [draggedSkill, setDraggedSkill] = useState(null);
	const [dragOverCategory, setDragOverCategory] = useState(null);
	const [dragOverAllSkills, setDragOverAllSkills] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);
	const [editingCategoryValue, setEditingCategoryValue] = useState('');
	const inputRef = useRef(null);

	// initialize categories from existing skills
	useEffect(() => {
		const existingCategories = new Set(['Tools']);
		skills.forEach(skill => {
			if (skill.category && skill.category.trim()) {
				existingCategories.add(skill.category.trim());
			}
		});
		if (existingCategories.size > 0) {
			setCategories(Array.from(existingCategories));
		}
	}, []);

	// handle adding a new skill
	const handleAddSkill = (e) => {
		e.preventDefault();
		if (skillInput.trim()) {
			const skillName = skillInput.trim();
			// check if skill already exists
			if (!skills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
				onAdd({ 
					name: skillName, 
					category: '',
					id: Date.now() 
				});
				setSkillInput('');
			}
		}
	};

	// handle removing a skill
	const handleRemoveSkill = (skillId) => {
		const index = skills.findIndex(s => s.id === skillId);
		if (index !== -1) {
			onRemove(index);
		}
	};

	// handle drag start
	const handleDragStart = (e, skill) => {
		setDraggedSkill(skill);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/html', e.target.outerHTML);
	};

	// handle drag over category
	const handleDragOverCategory = (e, categoryName) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverCategory(categoryName);
	};

	// handle drag over all skills
	const handleDragOverAllSkills = (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverAllSkills(true);
	};

	// handle drag leave
	const handleDragLeave = () => {
		setDragOverCategory(null);
		setDragOverAllSkills(false);
	};

	// handle drop on category
	const handleDropOnCategory = (e, categoryName) => {
		e.preventDefault();
		if (draggedSkill) {
			const skillIndex = skills.findIndex(s => s.id === draggedSkill.id);
			if (skillIndex !== -1 && onUpdate) {
				const updatedSkill = {
					...draggedSkill,
					category: categoryName
				};
				onUpdate(skillIndex, updatedSkill);
			}
		}
		setDraggedSkill(null);
		setDragOverCategory(null);
	};

	// handle drop on all skills
	const handleDropOnAllSkills = (e) => {
		e.preventDefault();
		if (draggedSkill) {
			const skillIndex = skills.findIndex(s => s.id === draggedSkill.id);
			if (skillIndex !== -1 && onUpdate) {
				const updatedSkill = {
					...draggedSkill,
					category: ''
				};
				onUpdate(skillIndex, updatedSkill);
			}
		}
		setDraggedSkill(null);
		setDragOverAllSkills(false);
	};

	// handle start editing category
	const handleStartEditCategory = (categoryName) => {
		setEditingCategory(categoryName);
		setEditingCategoryValue(categoryName);
	};

	// handle save category edit
	const handleSaveCategoryEdit = () => {
		if (editingCategoryValue.trim() && editingCategoryValue.trim() !== editingCategory) {
			const oldCategory = editingCategory;
			const newCategory = editingCategoryValue.trim();
			
			// update category in list
			setCategories(prev => prev.map(cat => cat === oldCategory ? newCategory : cat));
			
			// update all skills with this category
			skills.forEach((skill, index) => {
				if (skill.category === oldCategory && onUpdate) {
					onUpdate(index, { ...skill, category: newCategory });
				}
			});
		}
		setEditingCategory(null);
		setEditingCategoryValue('');
	};

	// handle cancel category edit
	const handleCancelCategoryEdit = () => {
		setEditingCategory(null);
		setEditingCategoryValue('');
	};

	// handle remove category
	const handleRemoveCategory = (categoryName) => {
		// remove category from list
		setCategories(prev => prev.filter(cat => cat !== categoryName));
		
		// remove category from all skills (set to empty string)
		skills.forEach((skill, index) => {
			if (skill.category === categoryName && onUpdate) {
				onUpdate(index, { ...skill, category: '' });
			}
		});
	};

	// handle add new category
	const handleAddCategory = () => {
		const newCategory = 'New Category';
		setCategories(prev => [...prev, newCategory]);
		setEditingCategory(newCategory);
		setEditingCategoryValue(newCategory);
	};

	// group skills by category
	const groupedSkills = {};
	const uncategorizedSkills = [];

	skills.forEach(skill => {
		if (skill.category && skill.category.trim()) {
			const cat = skill.category.trim();
			if (!groupedSkills[cat]) {
				groupedSkills[cat] = [];
			}
			groupedSkills[cat].push(skill);
		} else {
			uncategorizedSkills.push(skill);
		}
	});

	return (
		<>
			{/* Add Skill Input */}
			<div className="mb-3">
				<label className="label">Add a skill</label>
				<form onSubmit={handleAddSkill} className="flex gap-2">
					<input
						ref={inputRef}
						type="text"
						value={skillInput}
						onChange={(e) => setSkillInput(e.target.value)}
						className="input flex-1"
						placeholder="e.g., JavaScript, Python, React..."
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								handleAddSkill(e);
							}
						}}
					/>
				</form>
				<p className="text-xs text-gray-500 mt-1">Press Enter to add</p>
			</div>

			{/* Skills Display */}
			<div className="space-y-6">
				{/* All Skills Section (Uncategorized) */}
				<div
					className={`collapsibleCard ${dragOverAllSkills ? 'border-brand-pink border-2 bg-brand-pink/5' : ''}`}
					onDragOver={handleDragOverAllSkills}
					onDragLeave={handleDragLeave}
					onDrop={handleDropOnAllSkills}
				>
					<div className="collapsibleCardHeader">
						<div className="flex items-center justify-between w-full">
							<div className="flex items-center gap-3">
								<span className="font-semibold text-gray-900">All Skills</span>
								<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
									{uncategorizedSkills.length}
								</span>
							</div>
						</div>
					</div>
					<div className="expandableContent expanded">
						<div className="expandableContentInner">
							{uncategorizedSkills.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{uncategorizedSkills.map(skill => (
										<div
											key={skill.id}
											draggable
											onDragStart={(e) => handleDragStart(e, skill)}
											onDragEnd={() => {
												setDraggedSkill(null);
												setDragOverCategory(null);
												setDragOverAllSkills(false);
											}}
											className={`skillPill ${skill.fromParsed ? 'skillPillParsed' : ''}`}
										>
											<span>{skill.name}</span>
											{skill.fromParsed && (
												<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
													Parsed
												</span>
											)}
											<button
												type="button"
												onClick={() => handleRemoveSkill(skill.id)}
												className="skillPillRemove"
											>
												<XIcon className="w-3 h-3" />
											</button>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-gray-400 italic">Skills without a category will appear here</p>
							)}
						</div>
					</div>
				</div>

				{/* Categorized Skills */}
				{categories.map(category => {
					const categorySkills = groupedSkills[category] || [];
					const isDragOver = dragOverCategory === category;
					const isEditing = editingCategory === category;
					
					return (
						<div
							key={category}
							className={`collapsibleCard ${isDragOver ? 'border-brand-pink border-2 bg-brand-pink/5' : ''}`}
							onDragOver={(e) => handleDragOverCategory(e, category)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDropOnCategory(e, category)}
						>
							<div className="collapsibleCardHeader">
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-3 flex-1">
										{isEditing ? (
											<input
												type="text"
												value={editingCategoryValue}
												onChange={(e) => setEditingCategoryValue(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === 'Enter') {
														handleSaveCategoryEdit();
													} else if (e.key === 'Escape') {
														handleCancelCategoryEdit();
													}
												}}
												onBlur={handleSaveCategoryEdit}
												className="input text-sm font-semibold flex-1 max-w-xs"
												autoFocus
											/>
										) : (
											<>
												<span className="font-semibold text-gray-900">{category}</span>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
													{categorySkills.length}
												</span>
												<button
													type="button"
													onClick={() => handleStartEditCategory(category)}
													className="p-1 hover:bg-gray-100 rounded transition-colors"
													title="Edit category name"
												>
													<Pencil className="w-3.5 h-3.5 text-gray-500" />
												</button>
											</>
										)}
									</div>
									<button
										type="button"
										onClick={() => handleRemoveCategory(category)}
										className="removeButton"
										title="Remove category"
									>
										Remove
										<span className="removeButtonUnderline"></span>
									</button>
								</div>
							</div>
							<div className="expandableContent expanded">
								<div className="expandableContentInner">
									{categorySkills.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{categorySkills.map(skill => (
												<div
													key={skill.id}
													draggable
													onDragStart={(e) => handleDragStart(e, skill)}
													onDragEnd={() => {
														setDraggedSkill(null);
														setDragOverCategory(null);
														setDragOverAllSkills(false);
													}}
													className={`skillPill ${skill.fromParsed ? 'skillPillParsed' : ''}`}
												>
													<span>{skill.name}</span>
													{skill.fromParsed && (
														<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
															Parsed
														</span>
													)}
													<button
														type="button"
														onClick={() => handleRemoveSkill(skill.id)}
														className="skillPillRemove"
													>
														<XIcon className="w-3 h-3" />
													</button>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-gray-400 italic">Drop skills here or add them to this category</p>
									)}
								</div>
							</div>
						</div>
					);
				})}

				{/* Add Category Button */}
				<button
					type="button"
					onClick={handleAddCategory}
					className="text-sm text-brand-pink hover:text-brand-pink-dark font-medium transition-colors"
				>
					+ Add Category
				</button>
			</div>
		</>
	);
};

export default SkillsInput
