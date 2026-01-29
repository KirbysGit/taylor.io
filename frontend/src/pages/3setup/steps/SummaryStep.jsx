// pages / 3setup / steps / SummaryStep.jsx

// imports.
import React, { useState, useEffect } from 'react';

const SummaryStep = ({ summary, onUpdate }) => {
    const [summaryText, setSummaryText] = useState(summary || '');
    
    // sync with prop changes (e.g., when parsed from resume).
    useEffect(() => {
        setSummaryText(summary || '');
    }, [summary]);
    
    // handle text change.
    const handleChange = (e) => {
        const value = e.target.value;
        setSummaryText(value);
        onUpdate(value);
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Summary</h2>
            <p className="text-gray-600 mb-6">
                {summary 
                    ? "Review and edit your professional summary below, or write a new one."
                    : "Write a brief professional summary highlighting your experience, skills, and career goals. This is optional but can help employers understand your background."
                }
            </p>
            
            {summary && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-semibold mb-1">✓ Summary found from your resume</p>
                    <p className="text-xs text-blue-700">You can edit it below or write a new one.</p>
                </div>
            )}
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                        Professional Summary {!summary && <span className="text-gray-400">(Optional)</span>}
                    </label>
                    <textarea
                        id="summary"
                        value={summaryText}
                        onChange={handleChange}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent resize-y"
                        placeholder="e.g., Experienced software engineer with 5+ years of expertise in full-stack development. Passionate about building scalable web applications and leading cross-functional teams..."
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        {summaryText.length} characters
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SummaryStep;
