import express from 'express';
import { getActivityLogs } from '../controllers/activityLogController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(auth, authorize('admin'), getActivityLogs);

export default router;