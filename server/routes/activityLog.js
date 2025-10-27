import express from 'express';
import { getActivityLogs } from '../controllers/activityLogController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// --- MODIFICATION: Allow 'employee' role to access this route ---
router.route('/').get(auth, authorize('admin', 'employee'), getActivityLogs);

export default router;