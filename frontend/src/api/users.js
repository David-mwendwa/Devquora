import apiClient from './apiClient';

export const fetchUserProfile = (username) =>
  apiClient.get(`/users/${username}`).then((r) => r.data.user);

export const updateMyProfile = (payload) =>
  apiClient.patch('/users/me', payload).then((r) => r.data.user);

// Resolves to { token, user } — the API re-issues the JWT on a password change,
// and AuthContext persists it. See updateMyPassword in userController.
export const updateMyPassword = (payload) =>
  apiClient.patch('/users/me/password', payload).then((r) => r.data);
