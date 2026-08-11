import express from 'express';
import {
  getPlatformStats,
  getUsers,
  updateUser,
  getAllPosts,
  moderatePost,
} from '../controllers/adminController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Every route here is admin-only, so the guard is applied once at the router
// rather than repeated per-route (and can't be forgotten on a new one).
router.use(authenticate, authorizeRoles('admin'));

router.get('/stats', getPlatformStats);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.get('/posts', getAllPosts);
router.patch('/posts/:id', moderatePost);

export default router;
