import express from 'express';
import { getAllMessages, createMessage, replyToMessage, updateMessageStatus } from '../controllers/messagesController.js';
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

export default router;