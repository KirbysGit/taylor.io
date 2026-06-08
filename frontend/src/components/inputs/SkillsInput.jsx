import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faEyeSlash, faEye, faChevronDown, faChevronUp, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { XIcon, Pencil } from '@/components/icons';
import {
	SKILL_CATEGORY_ADD_CHIP_CLASS,
	SKILL_CATEGORY_CHIP_CLASS,
	SKILL_CATEGORY_PRESETS,
	iconForSkillCategory,
} from './skillsUtils';

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

// Skills Input Component - form fields and logic; section chrome lives in parent cards.
const SkillsInput = forwardRef(function SkillsInput(
	{
		skills,
		hiddenSkills = [],
		onAdd,
		onRemove,
		onUpdate,
		onReorder,
		onCategoryOrderChange,
		onHide,
		onShowSkill,
	},
	ref,
) {
	const [skillInput, setSkillInput] = useState('');
	// Where new skills go from the input: 'all' (uncategorized) or a category name
	const [newSkillTarget, setNewSkillTarget] = useState('all');
	const [categories, setCategories] = useState([]);
	const [draggedSkill, setDraggedSkill] = useState(null);
	const [dragOverCategory, setDragOverCategory] = useState(null);
	const [dragOverAllSkills, setDragOverAllSkills] = useState(false);
	const [dragOverPillId, setDragOverPillId] = useState(null);
	const [editingCategory, setEditingCategory] = useState(null);
	const [editingCategoryValue, setEditingCategoryValue] = useState('');
	const [pendingCategoryRemoval, setPendingCategoryRemoval] = useState(null);
	const [draggedCategory, setDraggedCategory] = useState(null);
	const [dragOverCategoryForReorder, setDragOverCategoryForReorder] = useState(null);
	const [hiddenSectionOpen, setHiddenSectionOpen] = useState(true);
	const inputRef = useRef(null);
	// HTML5 drop can fire before React state from onDragStart flushes; keep ref in sync.
	const draggedSkillRef = useRef(null);

	const skillIsHidden = (skill) =>
		skill && hiddenSkills.some((h) => String(h.id) === String(skill.id));

	const activeDraggedSkill = () => draggedSkillRef.current ?? draggedSkill;

	const endSkillDrag = () => {
		draggedSkillRef.current = null;
		setDraggedSkill(null);
		setDragOverCategory(null);
		setDragOverAllSkills(false);
		setDragOverPillId(null);
	};

	// Sync category list from saved skills; preserve user order and append any new category names from data.
	useEffect(() => {
		const fromSkills = new Set();
		skills.forEach((skill) => {
			if (skill.category && skill.category.trim()) {
				fromSkills.add(skill.category.trim());
			}
		});
		if (fromSkills.size > 0) {
			setCategories((prev) => {
				const kept = prev.filter((c) => fromSkills.has(c));
				const added = [...fromSkills].filter((c) => !prev.includes(c));
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
		draggedSkillRef.current = skill;
		setDraggedSkill(skill);
		e.dataTransfer.effectAllowed = 'move';
		try {
			e.dataTransfer.setData('text/plain', `skill:${skill.id}`);
		} catch (_) {
			/* ignore */
		}
		const el = e.currentTarget;
		if (el?.outerHTML) {
			e.dataTransfer.setData('text/html', el.outerHTML);
		}
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
		const d = activeDraggedSkill();
		if (!d) return;
		if (skillIsHidden(d)) {
			endSkillDrag();
			return;
		}
		if (!onReorder) return;
		if (d.id === dropTargetSkill.id) {
			endSkillDrag();
			return;
		}
		const draggedCategory = (d.category || '').trim();
		const targetCategory = categoryKey === '_uncategorized' ? '' : categoryKey;
		if (draggedCategory !== targetCategory) {
			endSkillDrag();
			return;
		}
		const fromIndex = skills.findIndex((s) => String(s.id) === String(d.id));
		const toIndex = skills.findIndex((s) => s.id === dropTargetSkill.id);
		if (fromIndex !== -1 && toIndex !== -1) {
			onReorder(fromIndex, toIndex);
		}
		endSkillDrag();
	};

	// handle drag over pill (for reorder)
	const handleDragOverPill = (e, skill) => {
		const d = activeDraggedSkill();
		if (!d) return;
		if (skillIsHidden(d)) return;
		const draggedCategory = (d.category || '').trim();
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
		const d = activeDraggedSkill();
		if (d) {
			if (skillIsHidden(d)) {
				onShowSkill?.(d.id, { category: categoryName });
			} else {
				const skillIndex = skills.findIndex((s) => String(s.id) === String(d.id));
				if (skillIndex !== -1 && onUpdate) {
					onUpdate(skillIndex, {
						...d,
						category: categoryName,
					});
				}
			}
		}
		endSkillDrag();
	};

	// handle drop on all skills
	const handleDropOnAllSkills = (e) => {
		e.preventDefault();
		const d = activeDraggedSkill();
		if (d) {
			if (skillIsHidden(d)) {
				onShowSkill?.(d.id, { category: '' });
			} else {
				const skillIndex = skills.findIndex((s) => String(s.id) === String(d.id));
				if (skillIndex !== -1 && onUpdate) {
					onUpdate(skillIndex, {
						...d,
						category: '',
					});
				}
			}
		}
		endSkillDrag();
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

	const removeCategoryFromList = (categoryName) => {
		// remove category from list
		setCategories(prev => prev.filter(cat => cat !== categoryName));
		if (newSkillTarget === categoryName) {
			setNewSkillTarget('all');
		}
	};

	// handle remove category but keep the skills in All Skills
	const handleKeepSkillsAndRemoveCategory = (categoryName) => {
		removeCategoryFromList(categoryName);

		// remove category from all skills (set to empty string)
		skills.forEach((skill, index) => {
			if (skill.category === categoryName && onUpdate) {
				onUpdate(index, { ...skill, category: '' });
			}
		});
		setPendingCategoryRemoval(null);
	};

	// handle remove category and delete its skills
	const handleRemoveCategoryAndSkills = (categoryName) => {
		removeCategoryFromList(categoryName);

		const indexesToRemove = skills
			.map((skill, index) => ({ skill, index }))
			.filter(({ skill }) => skill.category === categoryName)
			.map(({ index }) => index)
			.sort((a, b) => b - a);

		indexesToRemove.forEach((index) => {
			onRemove(index);
		});
		setPendingCategoryRemoval(null);
	};

	// handle remove category
	const handleRemoveCategory = (categoryName) => {
		setPendingCategoryRemoval(categoryName);
	};

	// handle add new category
	const handleAddCategory = () => {
		const newCategory = 'New Category';
		setCategories((prev) => [...prev, newCategory]);
		setEditingCategory(newCategory);
		setEditingCategoryValue(newCategory);
	};

	useImperativeHandle(ref, () => ({
		addCategory: handleAddCategory,
	}));

	const handleAddPresetCategory = (presetId) => {
		setCategories((prev) => (prev.includes(presetId) ? prev : [...prev, presetId]));
		setNewSkillTarget(presetId);
		inputRef.current?.focus();
	};

	const chipBase =
		'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition';

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

	const pendingCategorySkills = pendingCategoryRemoval
		? skills.filter((skill) => skill.category === pendingCategoryRemoval)
		: [];

	return (
		<>
			{/* Add Skill Input */}
			<div className="mb-4 rounded-2xl border border-brand-pink/12 bg-[#fff8ef]/45 p-4">
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
					Pick a category below (or{' '}
					<span className="font-medium text-gray-700">All Skills</span>), type a skill, and press Enter. Drag pills to
					reorder or move between sections.
				</p>
			</div>

			<div className="mb-5">
				<p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Suggested categories</p>
				<div className="flex flex-wrap gap-2">
					{SKILL_CATEGORY_PRESETS.map((preset) => {
						const icon = iconForSkillCategory(preset.id)
						const active = categories.includes(preset.id)
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleAddPresetCategory(preset.id)}
								className={`${chipBase} ${SKILL_CATEGORY_CHIP_CLASS} ${active ? 'ring-2 ring-brand-pink/40 ring-offset-1' : ''}`}
								title={active ? `Add skills to ${preset.label}` : `Add ${preset.label} section`}
							>
								{icon ? <FontAwesomeIcon icon={icon} className="size-3 opacity-80" aria-hidden /> : null}
								{preset.label}
							</button>
						)
					})}
					<button
						type="button"
						onClick={handleAddCategory}
						className={`${chipBase} ${SKILL_CATEGORY_ADD_CHIP_CLASS}`}
						title="Create a custom category"
					>
						<FontAwesomeIcon icon={faPlus} className="size-3" aria-hidden />
						<span className="sr-only sm:not-sr-only">Custom</span>
					</button>
				</div>
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
											onDragEnd={endSkillDrag}
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

				{/* Hidden skills — directly under All Skills so “Fresh start” / pool is obvious; drag out to show */}
				{hiddenSkills.length > 0 ? (
					<div className="collapsibleCard border-dashed border-gray-300 bg-gray-50/50">
						<div className="collapsibleCardHeader py-2">
							<button
								type="button"
								onClick={() => setHiddenSectionOpen(!hiddenSectionOpen)}
								className="w-full flex items-center justify-between gap-2 text-left rounded-lg -m-1 p-1 pr-2 hover:bg-gray-100/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								<div className="flex items-center gap-2 min-w-0">
									<FontAwesomeIcon icon={faEyeSlash} className="w-3.5 h-3.5 text-gray-500 shrink-0" />
									<span className="font-semibold text-gray-800 truncate">
										Hidden for this resume
									</span>
									<span className="text-xs bg-gray-200/80 text-gray-700 px-2 py-0.5 rounded-full shrink-0">
										{hiddenSkills.length}
									</span>
								</div>
								<FontAwesomeIcon
									icon={hiddenSectionOpen ? faChevronUp : faChevronDown}
									className="w-4 h-4 text-gray-500 shrink-0"
								/>
							</button>
						</div>
						{hiddenSectionOpen ? (
							<div className="expandableContent expanded border-t border-gray-200/80">
								<div className="expandableContentInner">
									{onShowSkill ? (
										<p className="text-xs text-gray-500 mb-3">
											Drag a pill to <span className="font-medium text-gray-700">All Skills</span> or a
											category above to show it there, or use the eye to restore with the same category.
										</p>
									) : (
										<p className="text-xs text-gray-500 mb-3">
											These skills are not on the resume. Open the resume editor to move them into a
											section.
										</p>
									)}
									<div className="flex flex-wrap gap-2">
										{hiddenSkills.map((skill) => (
											<div
												key={skill.id}
												draggable={Boolean(onShowSkill)}
												onDragStart={(e) => {
													if (onShowSkill) handleDragStart(e, skill);
												}}
												onDragEnd={endSkillDrag}
												className={`skillPill cursor-grab active:cursor-grabbing ${
													skill.fromParsed ? 'skillPillParsed' : ''
												}`}
											>
												<span>{skill.name}</span>
												{skill.category ? (
													<span className="text-xs font-normal text-gray-600">
														({skill.category})
													</span>
												) : null}
												{skill.fromParsed ? (
													<span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
														Parsed
													</span>
												) : null}
												{onShowSkill ? (
													<button
														type="button"
														draggable={false}
														onDragStart={(ev) => ev.stopPropagation()}
														onClick={(e) => {
															e.stopPropagation();
															onShowSkill(skill.id);
														}}
														className="skillPillRemove p-1 rounded hover:bg-brand-pink/20 text-brand-pink"
														title="Show on resume"
													>
														<FontAwesomeIcon icon={faEye} className="w-3 h-3" />
													</button>
												) : null}
											</div>
										))}
									</div>
								</div>
							</div>
						) : null}
					</div>
				) : null}

				{/* Categorized Skills */}
				{categories.map(category => {
					const categorySkills = groupedSkills[category] || [];
					const isDragOver = dragOverCategory === category;
					const isDragOverForReorder = dragOverCategoryForReorder === category;
					const isEditing = editingCategory === category;
					
					const isNewSkillTargetHere = newSkillTarget === category;
					const categoryIcon = iconForSkillCategory(category);

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
												{categoryIcon ? (
													<span
														className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-pink/10 text-brand-pink-dark"
														aria-hidden
													>
														<FontAwesomeIcon icon={categoryIcon} className="size-3.5" />
													</span>
												) : null}
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
													onDragEnd={endSkillDrag}
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

			{pendingCategoryRemoval ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 cursor-default bg-gray-950/35 backdrop-blur-[2px]"
						onClick={() => setPendingCategoryRemoval(null)}
						aria-label="Close remove skill category dialog"
					/>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="remove-skill-category-title"
						className="relative w-full max-w-lg rounded-[1.35rem] border border-brand-pink/18 bg-white p-6 shadow-[0_28px_80px_-28px_rgba(80,25,30,0.62)]"
					>
						<div className="flex items-start gap-4">
							<span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-pink/[0.1] text-brand-pink-dark">
								<FontAwesomeIcon icon={faTrash} className="size-4" />
							</span>
							<div className="min-w-0">
								<h2 id="remove-skill-category-title" className="text-xl font-black tracking-tight text-gray-950">
									Remove {pendingCategoryRemoval}?
								</h2>
								<p className="mt-2 text-sm leading-relaxed text-gray-600">
									This section currently has{' '}
									<span className="font-black text-gray-900">{pendingCategorySkills.length}</span>{' '}
									{pendingCategorySkills.length === 1 ? 'skill' : 'skills'}. Choose whether those skills should stay available in All Skills or be removed with the section.
								</p>
							</div>
						</div>

						{pendingCategorySkills.length > 0 ? (
							<div className="mt-5 rounded-2xl border border-gray-200 bg-[#fff8ef]/55 p-4">
								<p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.14em] text-gray-500">
									Skills in this section
								</p>
								<div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
									{pendingCategorySkills.map((skill) => (
										<span key={skill.id} className="rounded-full border border-brand-pink/14 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm">
											{skill.name}
										</span>
									))}
								</div>
							</div>
						) : null}

						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							<button
								type="button"
								onClick={() => handleKeepSkillsAndRemoveCategory(pendingCategoryRemoval)}
								className="rounded-xl border border-brand-pink/20 bg-white px-4 py-3 text-sm font-black text-brand-pink-dark transition hover:-translate-y-0.5 hover:border-brand-pink/38 hover:bg-brand-pink/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Keep skills in All Skills
							</button>
							<button
								type="button"
								onClick={() => handleRemoveCategoryAndSkills(pendingCategoryRemoval)}
								className="rounded-xl bg-brand-pink px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_-16px_rgba(214,86,86,0.82)] transition hover:-translate-y-0.5 hover:bg-brand-pink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
							>
								Remove section and skills
							</button>
						</div>

						<button
							type="button"
							onClick={() => setPendingCategoryRemoval(null)}
							className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2"
						>
							Cancel
						</button>
					</div>
				</div>
			) : null}
		</>
	);
});

export default SkillsInput
