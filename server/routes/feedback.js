import express from 'express';
import {
    createFeedback,
    getPublicFeedback,
    getAllFeedback,
    approveFeedback,
    deleteFeedback,
    getMyFeedback
} from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicFeedback);

// Protected routes (require authentication)
router.post('/', auth, upload.single('image'), createFeedback);
router.get('/my-feedback', auth, getMyFeedback);

// Admin routes
router.get('/', auth, checkPermission('feedback', 'read'), getAllFeedback);
router.patch('/:id/approve', auth, checkPermission('feedback', 'write'), approveFeedback);
router.delete('/:id', auth, checkPermission('feedback', 'full'), deleteFeedback);

export default router;