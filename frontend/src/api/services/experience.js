// services / experience.js

// experience-related api calls.

// get experiences for user.
// create experience.
// update experience.
// delete experience.

// services.
import { apiRequest } from './api'

// get user experiences.
export async function getUserExperiences(userId) {
    return apiRequest(`/users/${userId}/experiences`, {
      method: 'GET',
    })
}

// create experience.
export async function createExperience(experienceData) {
	return apiRequest('/experiences', {
		method: 'POST',
		body: JSON.stringify(experienceData),
	})
}

// update experience.
export async function updateExperience(experienceId, experienceData) {
	return apiRequest(`/experiences/${experienceId}`, {
		method: 'PUT',
		body: JSON.stringify(experienceData),
	})
}

// delete experience.
export async function deleteExperience(experienceId) {
	return apiRequest(`/experiences/${experienceId}`, {
		method: 'DELETE',
	})
}

