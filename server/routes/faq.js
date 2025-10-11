import express from 'express';
import {
  getAllFAQs,
  getAllFAQsAdmin,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../controllers/faqController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

// Public route to get active FAQs
router.get('/', getAllFAQs);

// Admin & Employee (with permission) routes
router.get('/admin', auth, checkPermission('faqs', 'read'), getAllFAQsAdmin);
router.post('/', auth, checkPermission('faqs', 'write'), createFAQ);
router.put('/:id', auth, checkPermission('faqs', 'write'), updateFAQ);
router.delete('/:id', auth, checkPermission('faqs', 'full'), deleteFAQ);

export default router;