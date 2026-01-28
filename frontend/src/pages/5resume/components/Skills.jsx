import React from 'react';
import { useState, useEffect } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus} from '@fortawesome/free-solid-svg-icons'
import { RequiredAsterisk, ChevronDown, ChevronUp} from '@/components/icons'


// normalize skills data from backend (flat list with category)
const normalizeFromBackend = (skillsData) => {
    if (!skillsData || skillsData.length === 0) return { mode: 'list', categories: [], skills: [] }
    
    // check if any skills have categories
    const hasCategories = skillsData.some(skill => skill.category && skill.category.trim())
    
    if (hasCategories) {
        // group by category
        const categoriesMap = {}
        skillsData.forEach(skill => {
            if (skill.name) {
                const cat = skill.category || 'Uncategorized'
                if (!categoriesMap[cat]) {
                    categoriesMap[cat] = []
                }
                categoriesMap[cat].push(skill.name)
            }
        })
        
        const categories = Object.entries(categoriesMap).map(([category, skills]) => ({
            category,
            skills
        }))
        
        return { mode: 'categorical', categories, skills: [] }
    } else {
        // list mode - just skill names
        const skills = skillsData.filter(skill => skill.name).map(skill => skill.name)
        return { mode: 'list', categories: [], skills }
    }
}

// convert to flat format for backend
const convertToBackendFormat = (mode, categories, skills) => {
    if (mode === 'categorical') {
        const result = []
        categories.forEach(cat => {
            cat.skills.forEach(skillName => {
                if (skillName.trim()) {
                    result.push({
                        name: skillName.trim(),
                        category: cat.category.trim() || null
                    })
                }
            })
        })
        return result
    } else {
        // list mode
        return skills.filter(skill => skill.trim()).map(skill => ({
            name: skill.trim(),
            category: null
        }))
    }
}

const Skills = ({ skillsData, onSkillsChange }) => {
    
    const [isSkillsExpanded, setIsSkillsExpanded] = useState(true)
    const [mode, setMode] = useState('categorical') // 'categorical' or 'list'
    const [categories, setCategories] = useState([{ category: '', skills: [''] }])
    const [skills, setSkills] = useState([''])

    // initialize from props
    useEffect(() => {
        if (skillsData && skillsData.length > 0) {
            const normalized = normalizeFromBackend(skillsData)
            setMode(normalized.mode)
            setCategories(normalized.categories.length > 0 ? normalized.categories : [{ category: '', skills: [''] }])
            setSkills(normalized.skills.length > 0 ? normalized.skills : [''])
        }
    }, [skillsData])

    // export to parent whenever data changes
    useEffect(() => {
        const backendFormat = convertToBackendFormat(mode, categories, skills)
        onSkillsChange(backendFormat)
    }, [mode, categories, skills, onSkillsChange])

    // ----- categorical mode functions -----
    const addCategory = () => {
        setCategories(prev => [...prev, { category: '', skills: [''] }])
    }

    const removeCategory = (index) => {
        setCategories(prev => {
            if (prev.length <= 1) return prev
            return prev.filter((_, i) => i !== index)
        })
    }

    const updateCategoryName = (index, value) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], category: value }
            return updated
        })
    }

    const addSkillToCategory = (categoryIndex) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[categoryIndex].skills.push('')
            return updated
        })
    }

    const removeSkillFromCategory = (categoryIndex, skillIndex) => {
        setCategories(prev => {
            const updated = [...prev]
            if (updated[categoryIndex].skills.length <= 1) {
                updated[categoryIndex].skills = ['']
            } else {
                updated[categoryIndex].skills = updated[categoryIndex].skills.filter((_, i) => i !== skillIndex)
            }
            return updated
        })
    }

    const updateSkillInCategory = (categoryIndex, skillIndex, value) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[categoryIndex].skills[skillIndex] = value
            return updated
        })
    }

    // ----- list mode functions -----
    const addSkill = () => {
        setSkills(prev => [...prev, ''])
    }

    const removeSkill = (index) => {
        setSkills(prev => {
            if (prev.length <= 1) return prev
            return prev.filter((_, i) => i !== index)
        })
    }

    const updateSkill = (index, value) => {
        setSkills(prev => {
            const updated = [...prev]
            updated[index] = value
            return updated
        })
    }

    // handle mode switch
    const handleModeChange = (newMode) => {
        setMode(newMode)
        if (newMode === 'categorical' && categories.length === 0) {
            setCategories([{ category: '', skills: [''] }])
        } else if (newMode === 'list' && skills.length === 0) {
            setSkills([''])
        }
    }

    return (
        <div>
            <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
			{/* header with chevron */}
			<button
				type="button"
				onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
				className="flex items-center gap-3 w-full transition-colors"
			>
				{/* title */}
				<h1 className="text-[1.375rem] font-semibold text-gray-900">Skills</h1>
				
				{/* divider */}
				<div className="flex-1 h-[3px] rounded bg-gray-300"></div>
				
				{/* chevron in circle */}
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
					{isSkillsExpanded ? (
						<ChevronUp className="w-4 h-4 text-gray-600" />
					) : (
						<ChevronDown className="w-4 h-4 text-gray-600" />
					)}
				</div>
			</button>
			
			{isSkillsExpanded && (
				<div>
					<p className="text-[0.875rem] text-gray-500 mb-4">Choose how you want to organize your skills.</p>
					
					{/* mode selector */}
					<div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="skillMode"
								value="categorical"
								checked={mode === 'categorical'}
								onChange={(e) => handleModeChange('categorical')}
								className="w-4 h-4"
							/>
							<span className="text-sm font-medium">By Category</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="skillMode"
								value="list"
								checked={mode === 'list'}
								onChange={(e) => handleModeChange('list')}
								className="w-4 h-4"
							/>
							<span className="text-sm font-medium">Simple List</span>
						</label>
					</div>

					{mode === 'categorical' ? (
						<div>
							{/* categorical mode */}
							{categories.map((cat, catIndex) => (
								<div key={catIndex} className="mb-4 p-4 border border-gray-300 rounded-md">
									<div className="flex items-center justify-between mb-3 border-b-2 border-brand-pink-light pb-2">
										<div className="flex-1 mr-2">
											<label className="label">Category Name</label>
											<input
												type="text"
												value={cat.category}
												onChange={(e) => updateCategoryName(catIndex, e.target.value)}
												className="input"
												placeholder="e.g., Languages, Frameworks, Data Tools"
											/>
										</div>
										{categories.length > 1 && (
											<button
												type="button"
												onClick={() => removeCategory(catIndex)}
												className="text-red-500 hover:text-red-700 text-sm mt-6"
											>
												Remove Category
											</button>
										)}
									</div>
									
									<div className="space-y-2">
										{cat.skills.map((skill, skillIndex) => (
											<div key={skillIndex} className="flex items-center gap-2">
												<div className="flex-1">
													<input
														type="text"
														value={skill}
														onChange={(e) => updateSkillInCategory(catIndex, skillIndex, e.target.value)}
														className="input"
														placeholder="Skill name"
													/>
												</div>
												{cat.skills.length > 1 && (
													<button
														type="button"
														onClick={() => removeSkillFromCategory(catIndex, skillIndex)}
														className="text-red-500 hover:text-red-700 text-sm px-2"
													>
														Remove
													</button>
												)}
											</div>
										))}
										<button
											type="button"
											onClick={() => addSkillToCategory(catIndex)}
											className="text-sm text-brand-pink hover:text-brand-pink-dark"
										>
											+ Add Skill
										</button>
									</div>
								</div>
							))}
							
							<button
								type="button"
								onClick={addCategory}
								className="w-full px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors mt-2"
							>
								<FontAwesomeIcon icon={faPlus} className="w-4 h-4 color-white mr-2" /> Add Another Category
							</button>
						</div>
					) : (
						<div>
							{/* list mode */}
							{skills.map((skill, index) => (
								<div key={index} className="mb-2 flex items-center gap-2">
									<div className="flex-1">
										<input
											type="text"
											value={skill}
											onChange={(e) => updateSkill(index, e.target.value)}
											className="input"
											placeholder="Skill name"
										/>
									</div>
									{skills.length > 1 && (
										<button
											type="button"
											onClick={() => removeSkill(index)}
											className="text-red-500 hover:text-red-700 text-sm px-2"
										>
											Remove
										</button>
									)}
								</div>
							))}
							
							<button
								type="button"
								onClick={addSkill}
								className="w-full px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors mt-2"
							>
								<FontAwesomeIcon icon={faPlus} className="w-4 h-4 color-white mr-2" /> Add Another Skill
							</button>
						</div>
					)}
				</div>
			)}
		</div>
        </div>
    )
}

export default Skills;
