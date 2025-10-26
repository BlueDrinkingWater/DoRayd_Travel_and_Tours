import express from 'express';
import { generateUploadSignature } from '../controllers/uploadSignaturesController.js'; // Corrected: Signature -> Signatures
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Route to generate upload signature (for authenticated uploads)
router.post('/signature', auth, generateUploadSignature);

export default router;