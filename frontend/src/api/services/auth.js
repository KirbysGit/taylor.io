// services / auth.js

// authentication api calls.

// services in order :
// - register user.
// - login user.
// - get current user.
// - logout user.

// services imports.
import { apiRequest } from '../api'

// ---- register user ----

export async function registerUser(userData) {
	// api call to register user.
	const response = await apiRequest('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(userData),
	})

	// store token in localStorage.
	if (response.data.access_token) {
		localStorage.setItem('token', response.data.access_token)
	}

	return response
}

// ---- login user ----

export async function loginUser(credentials) {
	// api call to login user.
	const response = await apiRequest('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	})

	// store token in localStorage.
	if (response.data.access_token) {
		localStorage.setItem('token', response.data.access_token)
	}

	return response
}

// ---- get current user ----

export async function getCurrentUser() {
	// api call to get current user.
	return apiRequest('/api/auth/me', {
		method: 'GET',
	})
}

// ---- logout user ----

export function logoutUser() {
	// remove token and user from localStorage.
	localStorage.removeItem('token')
	localStorage.removeItem('user')
}

