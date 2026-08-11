import apiClient from './apiClient';

// Every endpoint behind /admin is role-gated server-side; a non-admin calling
// these gets a 403 regardless of what the UI shows.
export const fetchPlatformStats = () => apiClient.get('/admin/stats').then((r) => r.data);

export const fetchAllUsers = () => apiClient.get('/admin/users').then((r) => r.data.users);

export const updateUser = (id, payload) =>
  apiClient.patch(`/admin/users/${id}`, payload).then((r) => r.data.user);

export const fetchAllPosts = () => apiClient.get('/admin/posts').then((r) => r.data.posts);

export const moderatePost = (id, payload) =>
  apiClient.patch(`/admin/posts/${id}`, payload).then((r) => r.data.post);
