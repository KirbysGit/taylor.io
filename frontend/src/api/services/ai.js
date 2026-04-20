import { apiRequest } from '../api'

/**
 * Request AI tailoring suggestions from backend.
 *
 * @param {Object} payload
 * @param {string} payload.job_description
 * @param {Object} payload.resume_data
 * @param {string=} payload.template_name
 * @param {string=} payload.target_role
 * @param {Object=} payload.style_preferences
 * @param {boolean=} payload.strict_truth
 */
export async function tailorResume(payload) {
	return apiRequest('/api/ai/job-tailor/tailor', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}
