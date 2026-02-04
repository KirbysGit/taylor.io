import React from 'react';

const CompleteScreen = ({ formData, handleComplete }) => {
    return (
        <div className="py-8">
            <div className="text-center mb-8">
                {/* Celebration section with multiple emojis */}
                <div className="flex justify-center items-center gap-3 mb-6">
                    <span className="text-6xl animate-bounce" style={{ animationDelay: '0s' }}>🎉</span>
                    <span className="text-6xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                    <span className="text-6xl animate-bounce" style={{ animationDelay: '0.4s' }}>🚀</span>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    You're All Set!
                </h2>
                <p className="text-lg text-gray-600 mb-2 max-w-2xl mx-auto">
                    Amazing work! You've built a solid foundation for your professional profile.
                </p>
                <p className="text-base text-gray-500 mb-8 max-w-2xl mx-auto">
                    Don't worry if you feel like something's missing—you can always add more information later from your dashboard. We're here to help you shine! 💫
                </p>
            </div>

            {/* Optional: Extracurriculars */}
            {(formData.extracurriculars.length > 0 || formData.coursework.length > 0) && (
                <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border-2 border-brand-pink/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🌟</span>
                        <h3 className="text-xl font-semibold text-gray-900">Bonus Information</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Great job including these extra details! They'll help make your profile stand out.
                    </p>
                    
                    {formData.extracurriculars.length > 0 && (
                        <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <span>🎯</span>
                                Extracurriculars
                            </h4>
                            <div className="space-y-2">
                                {formData.extracurriculars.map((extra, index) => (
                                    <div key={extra.id || index} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                        <p className="font-medium text-gray-900">{extra.name}</p>
                                        {extra.role && <p className="text-sm text-gray-600 mt-1">{extra.role}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.coursework.length > 0 && (
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <span>📚</span>
                                Coursework
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {formData.coursework.map((course, index) => (
                                    <span key={course.id || index} className="bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm shadow-sm hover:shadow-md transition-shadow">
                                        {course.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Next steps section */}
            <div className="mb-8 p-6 bg-brand-pink/5 rounded-xl border border-brand-pink/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>💡</span>
                    What's Next?
                </h3>
                <ul className="text-left space-y-2 text-sm text-gray-700 max-w-md mx-auto">
                    <li className="flex items-start gap-2">
                        <span className="text-brand-pink mt-0.5">→</span>
                        <span>Explore your dashboard and customize your profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-pink mt-0.5">→</span>
                        <span>Generate your first resume with our templates</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-brand-pink mt-0.5">→</span>
                        <span>Add more experiences, projects, or skills anytime</span>
                    </li>
                </ul>
            </div>

            <div className="text-center">
                <button
                    onClick={handleComplete}
                    className="px-8 py-3 bg-brand-pink text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
                >
                    <span>Let's Go!</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
                <p className="text-sm text-gray-500 mt-4">
                    Ready to create something amazing? 🎨
                </p>
            </div>
        </div>
    )
}

export default CompleteScreen;