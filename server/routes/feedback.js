import express from 'express';
import { 
    submitFeedback, 
    getPublicFeedback, 
    getMyFeedback,
    getAllFeedback,
    approveFeedback,
    disapproveFeedback
} from '../controllers/reviewsController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicFeedback);

// Protected routes (require authentication)
router.post('/', auth, upload.single('image'), submitFeedback);
router.get('/my-feedback', auth, getMyFeedback);

// Admin routes
router.get('/', auth, checkPermission('reviews', 'read'), getAllFeedback);
router.patch('/:id/approve', auth, checkPermission('reviews', 'write'), approveFeedback);
router.patch('/:id/disapprove', auth, checkPermission('reviews', 'write'), disapproveFeedback);

export default router;