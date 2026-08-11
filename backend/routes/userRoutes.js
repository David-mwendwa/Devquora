import express from 'express';
import {
  getUserProfile,
  updateMyPassword,
  updateMyProfile,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Declared before '/:username' — these are PATCHes so nothing actually collides
// today, but a future GET /me would otherwise be read as a lookup for a user
// literally named "me".
router.patch('/me', authenticate, updateMyProfile);
router.patch('/me/password', authenticate, updateMyPassword);

router.get('/:username', authenticate, getUserProfile);

export default router;
