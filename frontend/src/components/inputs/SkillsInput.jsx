import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { XIcon, Pencil } from '@/components/icons';

function NewSkillTargetRadio({ selected, className = '' }) {
	return (
		<span
			className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors bg-white ${className} ${
				selected ? 'border-brand-pink' : 'border-gray-300'
			}`}
			aria-hidden
		>
			{selected ? <span className="w-2 h-2 rounded-full bg-brand-pink" /> : null}
		</span>
	);
}

// Skills Input Component - Just the form fields and logic, no headers
const SkillsInput = ({ skills, onAdd, onRemove, onUpdate, onReorder, onCategoryOrderChange, onHide }) => {
	const [skillInput, setSkillInput] = useState('');
	// Where new skills go from the input: 'all' (uncategorized) or a category name
	const [newSkillTarget, setNewSkillTarget] = useState('all');
	const [categories, setCategories] = useState(['Tools']);
	const [draggedSkill, setDraggedSkill] = useState(null);
	const [dragOverCategory, setDragOverCategory] = useState(null);
	const [dragOverAllSkills, setDragOverAllSkills] = useState(false);
	const [dragOverPillId, setDragOverPillId] = useState(null);
	const [editingCategory, setEditingCategory] = useState(null);
	const [editingCategoryValue, setEditingCategoryValue] = useState('');
	const [draggedCategory, setDraggedCategory] = useState(null);
	const [dragOverCategoryForReorder, setDragOverCategoryForReorder] = useState(null);
	const inputRef = useRef(null);

	const SKILLS_REMOVED_DEFAULTS_KEY = 'tailor_skillsRemovedDefaults';

	// initialize/sync categories from skills when skills prop changes (e.g. when data loads from backend)
	// preserves user-defined category order; only appends new categories from skills
	useEffect(() => {
		const fromSkills = new Set();
		skills.forEach(skill => {
			if (skill.category && skill.category.trim()) {
				fromSkills.add(skill.category.trim());
			}
		});
		// Add Tools as default only when there are no categories and user hasn't removed it
		if (fromSkills.size === 0) {
			try {
				const removed = JSON.parse(localStorage.getItem(SKILLS_REMOVED_DEFAULTS_KEY) || '[]');
				if (!removed.includes('Tools')) {
					fromSkills.add('Tools');
				}
			} catch (_) {
				fromSkills.add('Tools');
			}
		}
		if (fromSkills.size > 0) {
			setCategories(prev => {
				const kept = prev.filter(c => fromSkills.has(c));
				const added = [...fromSkills].filter(c => !prev.includes(c));
				return prev.length === 0 ? [...fromSkills] : [...kept, ...added];
			});
		}
	}, [skills]);

	// Sync category order to parent (separate effect to avoid setState-during-render)
	useEffect(() => {
		if (categories.length > 0 && onCategoryOrderChange) {
			onCategoryOrderChange(categories);
		}
	}, [categories, onCategoryOrderChange]);

	useEffect(() => {
		if (newSkillTarget !== 'all' && !categories.includes(newSkillTarget)) {
			setNewSkillTarget('all');
		}
	}, [categories, newSkillTarget]);

	// handle adding a new skill
	const handleAddSkill = (e) => {
		e.preventDefault();
		if (skillInput.trim()) {
			const skillName = skillInput.trim();
			// check if skill already exists
			if (!skills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
				const category = newSkillTarget === 'all' ? '' : newSkillTarget;
				onAdd({
					name: skillName,
					category,
					id: Date.now(),
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

	// handle drag over all skills (only for skill drops, not category reorder)
	const handleDragOverAllSkills = (e) => {
		if (draggedCategory) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverAllSkills(true);
	};

	// handle drag leave
	const handleDragLeave = () => {
		setDragOverCategory(null);
		setDragOverAllSkills(false);
		setDragOverPillId(null);
		setDragOverCategoryForReorder(null);
	};

	// handle drop on pill (reorder within same category)
	const handleDropOnPill = (e, dropTargetSkill, categoryKey) => {
		e.preventDefault();
		e.stopPropagation(); // prevent category card from also handling the drop
		if (!draggedSkill || !onReorder) return;
		if (draggedSkill.id === dropTargetSkill.id) {
			setDraggedSkill(null);
			setDragOverPillId(null);
			return;
		}
		const draggedCategory = (draggedSkill.category || '').trim();
		const targetCategory = categoryKey === '_uncategorized' ? '' : categoryKey;
		if (draggedCategory !== targetCategory) {
			setDraggedSkill(null);
			setDragOverPillId(null);
			return;
		}
		const fromIndex = skills.findIndex(s => s.id === draggedSkill.id);
		const toIndex = skills.findIndex(s => s.id === dropTargetSkill.id);
		if (fromIndex !== -1 && toIndex !== -1) {
			onReorder(fromIndex, toIndex);
		}
		setDraggedSkill(null);
		setDragOverPillId(null);
	};

	// handle drag over pill (for reorder)
	const handleDragOverPill = (e, skill) => {
		if (!draggedSkill) return;
		const draggedCategory = (draggedSkill.category || '').trim();
		const skillCategory = (skill.category || '').trim();
		if (draggedCategory === skillCategory) {
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = 'move';
			setDragOverPillId(skill.id);
		}
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
			if (newSkillTarget === oldCategory) {
				setNewSkillTarget(newCategory);
			}
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

		// persist removed default (e.g. Tools) so it doesn't reappear on remount
		if (categoryName === 'Tools') {
			try {
				const removed = JSON.parse(localStorage.getItem(SKILLS_REMOVED_DEFAULTS_KEY) || '[]');
				if (!removed.includes('Tools')) {
					removed.push('Tools');
					localStorage.setItem(SKILLS_REMOVED_DEFAULTS_KEY, JSON.stringify(removed));
				}
			} catch (_) {}
		}
	};

	// handle add new category
	const handleAddCategory = () => {
		const newCategory = 'New Category';
		setCategories(prev => [...prev, newCategory]);
		setEditingCategory(newCategory);
		setEditingCategoryValue(newCategory);
	};

	// category reorder (only via grip handle)
	const handleCategoryDragStart = (e, categoryName) => {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', 'category:' + categoryName);
		setDraggedCategory(categoryName);
	};

	const handleCategoryDragOver = (e, targetCategory) => {
		if (!draggedCategory || draggedCategory === targetCategory) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverCategoryForReorder(targetCategory);
	};

	const handleCategoryDrop = (e, targetCategory) => {
		e.preventDefault();
		if (!draggedCategory || draggedCategory === targetCategory) {
			setDraggedCategory(null);
			setDragOverCategoryForReorder(null);
			return;
		}
		const fromIdx = categories.indexOf(draggedCategory);
		const toIdx = categories.indexOf(targetCategory);
		if (fromIdx !== -1 && toIdx !== -1) {
			setCategories(prev => {
				const next = [...prev];
				const [removed] = next.splice(fromIdx, 1);
				next.splice(toIdx, 0, removed);
				onCategoryOrderChange?.(next);
				return next;
			});
		}
		setDraggedCategory(null);
		setDragOverCategoryForReorder(null);
	};

	const handleCategoryDragEnd = () => {
		setDraggedCategory(null);
		setDragOverCategoryForReorder(null);
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
			{/* Header with Add Category */}
			<div className="flex items-start justify-between gap-4 mb-4">
				<div>
					<h3 className="text-sm font-semibold text-gray-900">Your Skills</h3>
					<p className="text-xs text-gray-500 mt-0.5">
					Add skills and organize by category. Use the circle on each section to choose where new entries go; drag pills to reorder or move.
				</p>
				</div>
				<button
					type="button"
					onClick={handleAddCategory}
					className="px-3 py-1.5 text-sm font-medium border border-brand-pink text-brand-pink rounded-lg hover:bg-brand-pink hover:text-white transition-all flex-shrink-0"
				>
					+ Add Category
				</button>
			</div>

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
						aria-describedby="skills-add-hint"
					/>
				</form>
				<p id="skills-add-hint" className="text-xs text-gray-500 mt-1">
					Select a section below (circle){' '}
					<span className="text-gray-700 font-medium">All Skills</span> or a category — new skills are added there. Default is{' '}
					<span className="text-gray-700 font-medium">All Skills</span>. Press Enter to add; drag pills to reorder or move between sections.
				</p>
			</div>

			{/* Skills Display */}
			<div className="space-y-6" role="radiogroup" aria-label="Where to add new skills">
				{/* All Skills Section (Uncategorized) */}
				<div
					className={`collapsibleCard transition-shadow ${
						dragOverAllSkills
							? 'border-brand-pink border-2 bg-brand-pink/5'
							: newSkillTarget === 'all'
								? 'ring-2 ring-brand-pink ring-offset-2 border-gray-200 shadow-sm'
								: ''
					}`}
					onDragOver={handleDragOverAllSkills}
					onDragLeave={handleDragLeave}
					onDrop={handleDropOnAllSkills}
				>
					<div className="collapsibleCardHeader">
						<div className="flex items-center justify-between w-full">
							<button
								type="button"
								role="radio"
								aria-checked={newSkillTarget === 'all'}
								onClick={() => setNewSkillTarget('all')}
								className="flex items-center gap-3 text-left min-w-0 rounded-lg -m-1 p-1 pr-2 hover:bg-gray-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								<NewSkillTargetRadio selected={newSkillTarget === 'all'} />
								<span className="font-semibold text-gray-900">All Skills</span>
								<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
									{uncategorizedSkills.length}
								</span>
							</button>
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
											onDragOver={(e) => handleDragOverPill(e, skill)}
											onDragLeave={() => setDragOverPillId(null)}
											onDrop={(e) => handleDropOnPill(e, skill, '_uncategorized')}
											onDragEnd={() => {
												setDraggedSkill(null);
												setDragOverCategory(null);
												setDragOverAllSkills(false);
												setDragOverPillId(null);
											}}
											className={`skillPill cursor-grab active:cursor-grabbing ${skill.fromParsed ? 'skillPillParsed' : ''} ${dragOverPillId === skill.id ? 'ring-2 ring-brand-pink ring-offset-2' : ''}`}
										>
											<span>{skill.name}</span>
											{skill.fromParsed && (
												<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
													Parsed
												</span>
											)}
											<div className="flex items-center gap-0.5">
												{onHide && (
													<button
														type="button"
														onClick={(e) => { e.stopPropagation(); onHide(skill.id); }}
														className="skillPillRemove p-1 rounded hover:bg-gray-200"
														title="Hide for this resume"
													>
														<FontAwesomeIcon icon={faEyeSlash} className="w-3 h-3 text-gray-500" />
													</button>
												)}
												<button
													type="button"
													onClick={() => handleRemoveSkill(skill.id)}
													className="skillPillRemove"
												>
													<XIcon className="w-3 h-3" />
												</button>
											</div>
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
					const isDragOverForReorder = dragOverCategoryForReorder === category;
					const isEditing = editingCategory === category;
					
					const isNewSkillTargetHere = newSkillTarget === category;

					return (
						<div
							key={category}
							className={`collapsibleCard transition-shadow ${
								isDragOver || isDragOverForReorder
									? 'border-brand-pink border-2 bg-brand-pink/5'
									: isNewSkillTargetHere
										? 'ring-2 ring-brand-pink ring-offset-2 border-gray-200 shadow-sm'
										: ''
							}`}
							onDragOver={(e) => {
								if (draggedCategory) handleCategoryDragOver(e, category);
								else handleDragOverCategory(e, category);
							}}
							onDragLeave={handleDragLeave}
							onDrop={(e) => {
								if (draggedCategory) handleCategoryDrop(e, category);
								else handleDropOnCategory(e, category);
							}}
						>
							<div className="collapsibleCardHeader">
								<div className="flex items-center justify-between w-full gap-2">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										{/* Grip handle - only this is draggable for category reorder */}
										<div
											draggable
											onDragStart={(e) => handleCategoryDragStart(e, category)}
											onDragEnd={handleCategoryDragEnd}
											className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 p-1 -ml-1 shrink-0"
											title="Drag to reorder category"
										>
											<FontAwesomeIcon icon={faGripVertical} className="w-4 h-4" />
										</div>
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
											<button
												type="button"
												role="radio"
												aria-checked={isNewSkillTargetHere}
												onClick={() => setNewSkillTarget(category)}
												className="flex items-center gap-3 text-left min-w-0 flex-1 rounded-lg -my-1 py-1 px-1 pr-2 hover:bg-gray-50/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
											>
												<NewSkillTargetRadio selected={isNewSkillTargetHere} />
												<span className="font-semibold text-gray-900 truncate">{category}</span>
												<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
													{categorySkills.length}
												</span>
											</button>
										)}
										{!isEditing ? (
											<button
												type="button"
												onClick={() => handleStartEditCategory(category)}
												className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
												title="Edit category name"
											>
												<Pencil className="w-3.5 h-3.5 text-gray-500" />
											</button>
										) : null}
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
													onDragOver={(e) => handleDragOverPill(e, skill)}
													onDragLeave={() => setDragOverPillId(null)}
													onDrop={(e) => handleDropOnPill(e, skill, category)}
													onDragEnd={() => {
														setDraggedSkill(null);
														setDragOverCategory(null);
														setDragOverAllSkills(false);
														setDragOverPillId(null);
													}}
													className={`skillPill cursor-grab active:cursor-grabbing ${skill.fromParsed ? 'skillPillParsed' : ''} ${dragOverPillId === skill.id ? 'ring-2 ring-brand-pink ring-offset-2' : ''}`}
												>
													<span>{skill.name}</span>
													{skill.fromParsed && (
														<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
															Parsed
														</span>
													)}
													<div className="flex items-center gap-0.5">
														{onHide && (
															<button
																type="button"
																onClick={(e) => { e.stopPropagation(); onHide(skill.id); }}
																className="skillPillRemove p-1 rounded hover:bg-gray-200"
																title="Hide for this resume"
															>
																<FontAwesomeIcon icon={faEyeSlash} className="w-3 h-3 text-gray-500" />
															</button>
														)}
														<button
															type="button"
															onClick={() => handleRemoveSkill(skill.id)}
															className="skillPillRemove"
														>
															<XIcon className="w-3 h-3" />
														</button>
													</div>
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
			</div>
		</>
	);
};

export default SkillsInput
