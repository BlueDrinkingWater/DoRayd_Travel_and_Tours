import express from 'express';
import { getContentByType, updateContent, getAllContentTypes } from '../controllers/contentController.js';
import { auth } from '../middleware/auth.js';
// Import the specific permission checker
import { checkPermission } from '../middleware/permission.js'; 

const router = express.Router();

router.get('/', getAllContentTypes);
router.get('/:type', getContentByType);

// FIX: Use checkPermission to allow admins OR employees with the 'content' permission
router.put('/:type', auth, checkPermission('content', 'write'), updateContent);

export default router;