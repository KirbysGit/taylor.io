// services / api.js

// api service for backend communication.

// base url for connecting to backend.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// unified helper function to make api requests.
// options.responseType: 'json' (default, returns { data }), 'blob', or 'text'
async function apiRequestCore(endpoint, options = {}) {
    // construct full url for request.
    const url = `${baseURL}${endpoint}`
    
    // get token from localStorage if it exists.
    const token = localStorage.getItem('token')
    
    // check if body is FormData (don't set Content-Type - browser sets it with boundary).
    const isFormData = options.body instanceof FormData
    
    // construct config object for request.
    const config = {
        method: options.method || 'GET',
        credentials: 'include',
        headers: {
            // only set Content-Type for non-FormData requests.
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...(options.body && { body: options.body }),
    }

    // try to make request.
    try {
        // make request.
        const response = await fetch(url, config)
        
        // if response is not ok, handle error.
        if (!response.ok) {
            let errorData
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json()
            } else {
                errorData = { message: await response.text() || 'Request failed' }
            }
            throw { response: { data: errorData, status: response.status } }
        }
        
        // parse response based on responseType.
        const responseType = options.responseType || 'json'
        
        if (responseType === 'blob') {
            return await response.blob()
        } else if (responseType === 'text') {
            return await response.text()
        } else {
            const data = await response.json()
        return { data }
        }

    // if error, throw error.
    } catch (error) {
        throw error
    }
}

// --- convenience functions.
export async function apiRequest(endpoint, options = {}) {
    return apiRequestCore(endpoint, { ...options, responseType: 'json' })
}

export async function apiRequestBlob(endpoint, options = {}) {
    return apiRequestCore(endpoint, { ...options, responseType: 'blob' })
}

export async function apiRequestText(endpoint, options = {}) {
    return apiRequestCore(endpoint, { ...options, responseType: 'text' })
}

// --- export base url for use in other files. ---
export const API_BASE_URL = baseURL

