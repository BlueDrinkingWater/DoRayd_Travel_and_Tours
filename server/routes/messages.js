import express from 'express';
// Import deleteMessage controller
import { getAllMessages, createMessage, replyToMessage, updateMessageStatus, deleteMessage } from '../controllers/messagesController.js';
import { auth, authorize } from '../middleware/auth.js';
import { uploadAttachment } from '../middleware/upload.js';

const router = express.Router();

router.route('/')
    .get(auth, authorize('admin', 'employee'), getAllMessages)
    .post(createMessage);

router.route('/:id/reply')
    .post(auth, authorize('admin', 'employee'), uploadAttachment.single('attachment'), replyToMessage);

router.route('/:id/status')
    .put(auth, authorize('admin', 'employee'), updateMessageStatus);

// --- ADD THIS ROUTE ---
router.route('/:id')
    .delete(auth, authorize('admin', 'employee'), deleteMessage); // Add delete route for a specific message ID

export default router;