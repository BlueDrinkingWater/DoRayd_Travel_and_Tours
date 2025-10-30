import express from 'express';
import {
  createRefundRequest,
  getAllRefundRequests,
  updateRefundStatus,
} from '../controllers/refundController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';
import { uploadAttachment } from '../middleware/upload.js'; // Use the secure attachment uploader

const router = express.Router();

// @route   POST /api/refunds
// @desc    Create a new refund request (public)
router.post('/', createRefundRequest);

// @route   GET /api/refunds
// @desc    Get all refund requests (admin/employee)
router.get('/', auth, checkPermission('refunds', 'read'), getAllRefundRequests);

// @route   PUT /api/refunds/:id/status
// @desc    Update a refund request's status (admin/employee)
router.put(
  '/:id/status',
  auth,
  checkPermission('refunds', 'write'),
  uploadAttachment.single('attachment'), // Use attachment middleware
  updateRefundStatus
);

export default router;