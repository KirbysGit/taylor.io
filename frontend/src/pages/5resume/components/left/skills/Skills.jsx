// components / left / skills / Skills.jsx

// imports.
import React from 'react';
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { ChevronDown, ChevronUp } from '@/components/icons'
import SectionTitleEditor from '../SectionTitleEditor'

// parse bulk text (comma or newline separated)
const parseBulkSkills = (text) => {
    return text
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
}

// normalize from backend
const normalizeFromBackend = (skillsData) => {
    if (!skillsData || skillsData.length === 0) return { mode: 'list', categories: [], skills: [] }
    
    const hasCategories = skillsData.some(skill => skill.category && skill.category.trim())
    
    if (hasCategories) {
        const categoriesMap = {}
        skillsData.forEach(skill => {
            if (skill.name) {
                const cat = skill.category || 'Uncategorized'
                if (!categoriesMap[cat]) categoriesMap[cat] = []
                categoriesMap[cat].push(skill.name)
            }
        })
        
        const categories = Object.entries(categoriesMap).map(([category, skills]) => ({
            category,
            skills
        }))
        
        return { mode: 'categorical', categories, skills: [] }
    } else {
        const skills = skillsData.filter(skill => skill.name).map(skill => skill.name)
        return { mode: 'list', categories: [], skills }
    }
}

// normalize skills: convert null category to empty string for consistent comparison.
const normalizeSkills = (skills) => {
    if (!skills || !Array.isArray(skills)) return []
    return skills.map(skill => ({
        name: skill.name || '',
        category: skill.category === null ? '' : (skill.category || '')
    }))
}

// convert to backend format
const convertToBackendFormat = (mode, categories, skills) => {
    let result = []
    if (mode === 'categorical') {
        categories.forEach(cat => {
            cat.skills.forEach(skillName => {
                if (skillName.trim()) {
                    result.push({
                        name: skillName.trim(),
                        category: cat.category.trim() || ''
                    })
                }
            })
        })
    } else {
        result = skills.filter(skill => skill.trim()).map(skill => ({
            name: skill.trim(),
            category: ''
        }))
    }
    // normalize to ensure consistent format (null -> empty string)
    return normalizeSkills(result)
}

// Pill component
const SkillPill = ({ skill, onRemove }) => (
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-brand-pink-light text-white rounded-full text-sm">
        <span>{skill}</span>
        <button
            type="button"
            onClick={onRemove}
            className="hover:bg-brand-pink rounded-full p-0.5 transition-colors"
        >
            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
        </button>
    </div>
)

const Skills = ({ skillsData, onSkillsChange, isVisible = true, onVisibilityChange, sectionLabel, onSectionLabelChange }) => {
    const [isSkillsExpanded, setIsSkillsExpanded] = useState(true)
    const [mode, setMode] = useState('categorical')
    const [categories, setCategories] = useState([{ category: '', skills: [] }])
    const [skills, setSkills] = useState([])
    const [categoryInputs, setCategoryInputs] = useState({ 0: '' })
    const [currentInput, setCurrentInput] = useState('')
    const [showBulkPaste, setShowBulkPaste] = useState(false)
    const [bulkText, setBulkText] = useState('')

    // initialize from props
    useEffect(() => {
        if (skillsData && skillsData.length > 0) {
            const normalized = normalizeFromBackend(skillsData)
            setMode(normalized.mode)
            setCategories(normalized.categories.length > 0 ? normalized.categories : [{ category: '', skills: [] }])
            setSkills(normalized.skills.length > 0 ? normalized.skills : [])
            // initialize category inputs
            if (normalized.mode === 'categorical' && normalized.categories.length > 0) {
                const inputs = {}
                normalized.categories.forEach((_, idx) => {
                    inputs[idx] = ''
                })
                setCategoryInputs(inputs)
            }
        }
    }, [skillsData])

    // export to parent
    useEffect(() => {
        const backendFormat = convertToBackendFormat(mode, categories, skills)
        onSkillsChange(backendFormat)
    }, [mode, categories, skills, onSkillsChange])

    // add skill to array (removes duplicates)
    const addSkillToArray = (skillsArray, skillName) => {
        const trimmed = skillName.trim()
        if (!trimmed || skillsArray.includes(trimmed)) return skillsArray
        return [...skillsArray, trimmed]
    }

    // handle input keydown (Enter or comma)
    const handleInputKeyDown = (e, addFn, inputValue, setInputValue) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            if (inputValue.trim()) {
                addFn(inputValue)
                setInputValue('')
            }
        }
    }

    // categorical mode functions
    const addSkillToCategory = (catIndex, skillName) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[catIndex].skills = addSkillToArray(updated[catIndex].skills, skillName)
            return updated
        })
    }

    const removeSkillFromCategory = (catIndex, skillIndex) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[catIndex].skills = updated[catIndex].skills.filter((_, i) => i !== skillIndex)
            return updated
        })
    }

    const addCategory = () => {
        setCategories(prev => [...prev, { category: '', skills: [] }])
        setCategoryInputs(prev => ({ ...prev, [categories.length]: '' }))
    }

    const removeCategory = (index) => {
        setCategories(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
        setCategoryInputs(prev => {
            const updated = { ...prev }
            delete updated[index]
            // reindex
            const newInputs = {}
            Object.keys(updated).forEach(key => {
                const keyNum = parseInt(key)
                if (keyNum < index) newInputs[keyNum] = updated[key]
                else if (keyNum > index) newInputs[keyNum - 1] = updated[key]
            })
            return newInputs
        })
    }

    const updateCategoryName = (index, value) => {
        setCategories(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], category: value }
            return updated
        })
    }

    // list mode functions
    const addSkillToList = (skillName) => {
        setSkills(prev => addSkillToArray(prev, skillName))
    }

    const removeSkillFromList = (index) => {
        setSkills(prev => prev.filter((_, i) => i !== index))
    }

    // bulk paste handlers
    const handleBulkPaste = () => {
        const parsed = parseBulkSkills(bulkText)
        if (mode === 'categorical') {
            // add to first category or create one
            setCategories(prev => {
                const updated = [...prev]
                if (updated.length === 0 || !updated[0].category) {
                    updated[0] = { category: updated[0]?.category || '', skills: [...(updated[0]?.skills || []), ...parsed] }
                } else {
                    updated[0].skills = [...updated[0].skills, ...parsed]
                }
                return updated
            })
        } else {
            parsed.forEach(skill => addSkillToList(skill))
        }
        setBulkText('')
        setShowBulkPaste(false)
    }

    const handleModeChange = (newMode) => {
        setMode(newMode)
        if (newMode === 'categorical' && categories.length === 0) {
            setCategories([{ category: '', skills: [] }])
            setCategoryInputs({ 0: '' })
        } else if (newMode === 'list' && skills.length === 0) {
            setSkills([])
        }
        setCurrentInput('')
    }

    return (
        <div>
            <div className="flex flex-col mb-4 border-[2px] border-brand-pink-light rounded-md p-4">
                <div
                    onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                    className="flex items-center gap-3 w-full transition-colors"
                >
                    {/* Visibility Toggle Button - Left side in circle */}
                    {onVisibilityChange && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onVisibilityChange(!isVisible);
                            }}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            aria-label={isVisible ? 'Hide skills in preview' : 'Show skills in preview'}
                            title={isVisible ? 'Hide from preview' : 'Show in preview'}
                        >
                            <FontAwesomeIcon icon={isVisible ? faEye : faEyeSlash} className="w-4 h-4 text-gray-600" />
                        </button>
                    )}
                    
                    <SectionTitleEditor
						sectionKey="skills"
						currentLabel={sectionLabel}
						onLabelChange={onSectionLabelChange}
						defaultLabel="Skills"
					/>
                    <div className="flex-1 h-[3px] rounded bg-gray-300"></div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        {isSkillsExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                    </div>
                </div>
                
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
                            <div className="space-y-4">
                                {categories.map((cat, catIndex) => (
                                    <div key={catIndex} className="p-4 border border-gray-300 rounded-md">
                                        <div className="flex items-center justify-between mb-3 border-b-2 border-brand-pink-light pb-2">
                                            <div className="flex-1 mr-2">
                                                <label className="label">Category Name</label>
                                                <input
                                                    type="text"
                                                    value={cat.category}
                                                    onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                                                    className="input"
                                                    placeholder="e.g., Languages, Frameworks"
                                                />
                                            </div>
                                            {categories.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCategory(catIndex)}
                                                    className="text-red-500 hover:text-red-700 text-sm mt-6"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* pills */}
                                        {cat.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {cat.skills.map((skill, skillIndex) => (
                                                    <SkillPill
                                                        key={skillIndex}
                                                        skill={skill}
                                                        onRemove={() => removeSkillFromCategory(catIndex, skillIndex)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* input */}
                                        <input
                                            type="text"
                                            value={categoryInputs[catIndex] || ''}
                                            onChange={(e) => setCategoryInputs(prev => ({ ...prev, [catIndex]: e.target.value }))}
                                            onKeyDown={(e) => handleInputKeyDown(
                                                e,
                                                (skill) => addSkillToCategory(catIndex, skill),
                                                categoryInputs[catIndex] || '',
                                                (val) => setCategoryInputs(prev => ({ ...prev, [catIndex]: val }))
                                            )}
                                            className="input"
                                            placeholder="Type skill and press Enter or comma"
                                        />
                                    </div>
                                ))}
                                
                                <button
                                    type="button"
                                    onClick={addCategory}
                                    className="w-full px-4 py-2 bg-brand-pink-light text-white rounded-full hover:bg-brand-pink transition-colors"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" /> Add Category
                                </button>
                            </div>
                        ) : (
                            <div>
                                {/* pills */}
                                {skills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {skills.map((skill, index) => (
                                            <SkillPill
                                                key={index}
                                                skill={skill}
                                                onRemove={() => removeSkillFromList(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                                
                                {/* input */}
                                <input
                                    type="text"
                                    value={currentInput}
                                    onChange={(e) => setCurrentInput(e.target.value)}
                                    onKeyDown={(e) => handleInputKeyDown(e, addSkillToList, currentInput, setCurrentInput)}
                                    className="input mb-3"
                                    placeholder="Type skill and press Enter or comma"
                                />
                            </div>
                        )}

                        {/* bulk paste */}
                        {!showBulkPaste ? (
                            <button
                                type="button"
                                onClick={() => setShowBulkPaste(true)}
                                className="text-sm text-brand-pink hover:text-brand-pink-dark mt-2"
                            >
                                + Paste multiple skills
                            </button>
                        ) : (
                            <div className="mt-3 p-3 border border-gray-300 rounded-md">
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    className="input mb-2"
                                    rows="3"
                                    placeholder="Paste skills separated by commas or new lines"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleBulkPaste}
                                        className="px-3 py-1 bg-brand-pink-light text-white rounded hover:bg-brand-pink text-sm"
                                    >
                                        Add Skills
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBulkPaste(false)
                                            setBulkText('')
                                        }}
                                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Skills;
