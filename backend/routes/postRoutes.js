import express from 'express';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  getMyStats,
  getSavedPosts,
  getReadingStats,
  getPostForEdit,
  getPostTags,
  getPostBySlug,
  getRelatedPosts,
  getPostComments,
  createComment,
  deleteComment,
  toggleCommentLike,
  togglePostLike,
  togglePostSave,
  triggerSync,
  getSyncStatus,
} from '../controllers/postController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Must come before '/:slug' — otherwise Express treats "tags"/"mine"/"comments"
// as a slug value.
router.get('/tags', getPostTags);
router.get('/mine', authenticate, getMyPosts);
router.get('/mine/stats', authenticate, getMyStats);
router.get('/saved', authenticate, getSavedPosts);
router.get('/reading-stats', authenticate, getReadingStats);
router.get('/by-id/:id', authenticate, getPostForEdit);
router.post('/sync', authenticate, authorizeRoles('admin'), triggerSync);
router.get('/sync/status', authenticate, authorizeRoles('admin'), getSyncStatus);
router.post('/comments/:commentId/like', authenticate, toggleCommentLike);
router.delete('/comments/:commentId', authenticate, deleteComment);

router.get('/', getPosts);
// Authoring is the one thing the `user` (reader) role exists to withhold, and
// the Write button being hidden in the header is not a guard — the editor route
// and this endpoint are both reachable directly. Admins are included because
// they can already edit and delete anyone's post.
router.post('/', authenticate, authorizeRoles('author', 'admin'), createPost);
router.patch('/:id', authenticate, updatePost);
router.delete('/:id', authenticate, deletePost);
router.get('/:slug', getPostBySlug);
router.get('/:slug/related', getRelatedPosts);
router.get('/:slug/comments', getPostComments);
router.post('/:slug/comments', authenticate, createComment);
router.post('/:slug/like', authenticate, togglePostLike);
router.post('/:slug/save', authenticate, togglePostSave);

export default router;
