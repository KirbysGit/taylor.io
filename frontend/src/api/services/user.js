// services / user.js

// user-related api calls.

// get user by id.
// get all users (admin only, maybe).
// update user.
// delete user.

// services.
import { apiRequest } from './api'

// get user by id.
export async function getUser(userId) {
  return apiRequest(`/users/${userId}`, {
    method: 'GET',
  })
}

// get all users (admin only, maybe).
export async function getAllUsers() {
  return apiRequest('/users', {
    method: 'GET',
  })
}

// update user.
export async function updateUser(userId, userData) {
  return apiRequest(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
}

// delete user.
export async function deleteUser(userId) {
  return apiRequest(`/users/${userId}`, {
    method: 'DELETE',
  })
}

