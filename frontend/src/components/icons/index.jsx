// src / components / icons / index.jsx

export const XIcon = ({ className = "w-5 h-5" }) => {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
}

export const RequiredAsterisk = ({ className = "w-3 h-3" }) => {
    return (
        <span className={className} style={{ color: 'red' }}>*</span>
    )
}

export const ChevronDown = ({ className = "w-5 h-5" }) => {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    )
}

export const ChevronUp = ({ className = "w-5 h-5" }) => {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
    )
}
