import express from 'express';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(auth, getMyNotifications);

router.route('/read-all')
  .patch(auth, markAllAsRead);

router.route('/:id/read')
  .patch(auth, markAsRead);

export default router;