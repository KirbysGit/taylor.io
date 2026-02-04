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
        <div className="w-full">
            {/* Header */}
            <div className="mb-3">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Professional Summary
                </h2>
                <p className="text-gray-600">
                    {summary 
                        ? "We found a summary from your resume! Feel free to review and edit it, or write something new."
                        : "Share a brief overview of who you are professionally. This helps employers get to know you better."
                    }
                </p>
            </div>

            <div className="smallDivider mb-3" />
            
            {summary && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-semibold mb-1">✓ Summary found from your resume</p>
                    <p className="text-xs text-blue-700">You can edit it below or write a new one.</p>
                </div>
            )}
            
            <div>
                <label htmlFor="summary" className="label">
                    Professional Summary {!summary && <span className="text-gray-400 font-normal">(Optional)</span>}
                </label>
                <textarea
                    id="summary"
                    value={summaryText}
                    onChange={handleChange}
                    rows={8}
                    className="input resize-y"
                    placeholder="e.g., Experienced software engineer with 5+ years of expertise in full-stack development. Passionate about building scalable web applications and leading cross-functional teams..."
                />
                <p className="mt-2 text-xs text-gray-500">
                    {summaryText.length} characters
                </p>
            </div>
        </div>
    );
};

export default SummaryStep;
