// services / api.js

// api service for backend communication.

// base url for connecting to backend.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// helper function to make api requests.
export async function apiRequest(endpoint, options = {}) {

    // construct full url for request.
    const url = `${baseURL}${endpoint}`
    
    // get token from localStorage if it exists.
    const token = localStorage.getItem('token')
    
    // construct config object for request.
    const config = {
        method: options.method || 'GET',
        credentials: 'include',  // important: allows cookies/credentials in cross-origin requests (like axios withCredentials: true)
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...(options.body && { body: options.body }),
    }

    // try to make request.
    try {
        // make request.
        const response = await fetch(url, config)
        
        // parse response body as json.
        const data = await response.json()

        // if response is not ok, throw error.
        if (!response.ok) {
            throw { response: { data, status: response.status } }
        }
        
        // return response data.
        return { data }

    // if error, throw error.
    } catch (error) {
        throw error
    }
}

// helper function to make api requests that return blobs.
export async function apiRequestBlob(endpoint, options = {}) {
    // construct full url for request.
    const url = `${baseURL}${endpoint}`
    
    // get token from localStorage if it exists.
    const token = localStorage.getItem('token')
    
    // construct config object for request.
    const config = {
        method: options.method || 'GET',
        credentials: 'include',  // important: allows cookies/credentials in cross-origin requests
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        },
        ...(options.body && { body: options.body }),
    }

    // try to make request.
    try {
        // make request.
        const response = await fetch(url, config)
        
        // if response is not ok, try to parse error message.
        if (!response.ok) {
            // Try to get error message from response (might be JSON or text)
            let errorData
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json()
            } else {
                errorData = { message: await response.text() || 'Request failed' }
            }
            throw { response: { data: errorData, status: response.status } }
        }
        
        // return blob response.
        return await response.blob()

    // if error, throw error.
    } catch (error) {
        throw error
    }
}

// export base url for use in other files.
export const API_BASE_URL = baseURL

