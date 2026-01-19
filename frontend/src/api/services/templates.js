import { apiRequest } from '../api'

// list templates.
export async function listTemplates() {
	const url = `/api/templates/list`

	try {
		const response = await apiRequest(url)
		const data = response.data
		return { data }
	} catch (error) {
		console.error('Error listing templates:', error)
		throw error
	}
}