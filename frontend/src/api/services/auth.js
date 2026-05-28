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
	return apiRequest('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(userData),
	})
}

// ---- login user ----

export async function loginUser(credentials) {
	const response = await apiRequest('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	})
	return response
}

// ---- get current user ----

export async function getCurrentUser() {
	return apiRequest('/api/auth/me', {
		method: 'GET',
	})
}

// ---- logout user ----

export async function logoutUser() {
	try {
		await apiRequest('/api/auth/logout', { method: 'POST' })
	} catch {
		// local cleanup still matters if the session already expired.
	}
	localStorage.removeItem('user')
	localStorage.removeItem('token')
}

export async function resendVerification(email) {
	return apiRequest('/api/auth/resend-verification', {
		method: 'POST',
		body: JSON.stringify({ email }),
	})
}

export async function forgotPassword(email) {
	return apiRequest('/api/auth/forgot-password', {
		method: 'POST',
		body: JSON.stringify({ email }),
	})
}

export async function resetPassword(token, password) {
	return apiRequest('/api/auth/reset-password', {
		method: 'POST',
		body: JSON.stringify({ token, password }),
	})
}

