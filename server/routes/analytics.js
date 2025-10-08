import express from 'express';
// FIX: Corrected folder path to 'controllers' and filename to 'analyticsController'
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', auth, authorize('admin', 'employee'), getDashboardAnalytics);

export default router;