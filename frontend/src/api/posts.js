import apiClient from './apiClient';

export const fetchPosts = (params) => apiClient.get('/posts', { params }).then((r) => r.data);

export const createPost = (payload) => apiClient.post('/posts', payload).then((r) => r.data.post);

export const updatePost = (id, payload) =>
  apiClient.patch(`/posts/${id}`, payload).then((r) => r.data.post);

export const deletePost = (id) => apiClient.delete(`/posts/${id}`).then((r) => r.data.deletedId);

// The signed-in author's own posts, drafts included — the public list endpoint
// filters drafts out, so the dashboard can't reuse it.
export const fetchMyPosts = () => apiClient.get('/posts/mine').then((r) => r.data.posts);

export const fetchMyStats = () => apiClient.get('/posts/mine/stats').then((r) => r.data);

export const fetchSavedPosts = () => apiClient.get('/posts/saved').then((r) => r.data.posts);

export const fetchReadingStats = () =>
  apiClient.get('/posts/reading-stats').then((r) => r.data.stats);

// By id rather than slug, and drafts included — this is the editor's loader.
export const fetchPostForEdit = (id) =>
  apiClient.get(`/posts/by-id/${id}`).then((r) => r.data.post);

export const fetchPostTags = () => apiClient.get('/posts/tags').then((r) => r.data.tags);

export const fetchPostBySlug = (slug) => apiClient.get(`/posts/${slug}`).then((r) => r.data.post);

export const fetchRelatedPosts = (slug) =>
  apiClient.get(`/posts/${slug}/related`).then((r) => r.data.posts);

export const fetchComments = (slug) =>
  apiClient.get(`/posts/${slug}/comments`).then((r) => r.data.comments);

export const postComment = (slug, body, parentComment) =>
  apiClient.post(`/posts/${slug}/comments`, { body, parentComment }).then((r) => r.data.comment);

export const toggleCommentLike = (commentId) =>
  apiClient.post(`/posts/comments/${commentId}/like`).then((r) => r.data.comment);

export const deleteComment = (commentId) =>
  apiClient.delete(`/posts/comments/${commentId}`).then((r) => r.data.deletedIds);

export const togglePostLike = (slug) =>
  apiClient.post(`/posts/${slug}/like`).then((r) => r.data.post);

// Admin-only. The server kicks the dev.to import off and returns immediately —
// the sync itself keeps running after this resolves.
export const triggerSync = () => apiClient.post('/posts/sync').then((r) => r.data.message);

export const fetchSyncStatus = () =>
  apiClient.get('/posts/sync/status').then((r) => r.data.syncing);

export const togglePostSave = (slug) =>
  apiClient.post(`/posts/${slug}/save`).then((r) => r.data.post);
