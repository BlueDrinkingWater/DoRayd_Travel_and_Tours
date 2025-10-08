import express from 'express';
// This import will now work correctly
import { getContentByType, updateContent, getAllContentTypes } from '../controllers/contentController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllContentTypes);
router.get('/:type', getContentByType);
router.put('/:type', auth, authorize('admin'), updateContent);

export default router;