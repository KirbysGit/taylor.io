import React from 'react';

// helper function to convert ISO datetime string to date-only format (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    // If it's already in YYYY-MM-DD format, return as-is
    if (dateString.length === 10) return dateString
    // If it's an ISO datetime string (YYYY-MM-DDTHH:mm:ss), extract just the date part
    if (dateString.includes('T')) {
        return dateString.split('T')[0]
    }
    return dateString
}

export { formatDateForInput };