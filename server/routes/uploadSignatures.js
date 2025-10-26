import express from 'express';
// --- FIX: Import the correct function name ---
import { generateUploadSignature } from '../controllers/uploadSignaturesController.js'; // Corrected: Signature -> Signatures
import { auth as protect } from '../middleware/auth.js'; 
// Assuming checkPermission is in auth.js, if not, you may need to adjust
import { checkPermission } from '../middleware/permission.js'; 

const router = express.Router();

router.post(
    '/', 
    protect, 
    checkPermission('admin', 'employee'), 
    // --- FIX: Use the correct function name ---
    generateUploadSignature 
);

export default router;