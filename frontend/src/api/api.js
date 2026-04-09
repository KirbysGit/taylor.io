// services / api.js

// api service for backend communication.

// base url for connecting to backend.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const inFlightGetJsonRequests = new Map()

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
        cache: 'no-store', // prevent cached /me response (e.g. stale education list after refresh)
        headers: {
            // only set Content-Type for non-FormData requests.
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...(options.body && { body: options.body }),
    }

    const method = String(config.method || 'GET').toUpperCase()
    const responseType = options.responseType || 'json'
    const canDedupeGetJson = method === 'GET' && !options.body && responseType === 'json'
    const dedupeKey = canDedupeGetJson ? `${url}::${token || ''}` : null

    if (canDedupeGetJson && inFlightGetJsonRequests.has(dedupeKey)) {
        return inFlightGetJsonRequests.get(dedupeKey)
    }

    // try to make request.
    const runRequest = async () => {
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

    if (!canDedupeGetJson) {
        return runRequest()
    }

    const inFlight = runRequest().finally(() => {
        inFlightGetJsonRequests.delete(dedupeKey)
    })
    inFlightGetJsonRequests.set(dedupeKey, inFlight)
    return inFlight
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

