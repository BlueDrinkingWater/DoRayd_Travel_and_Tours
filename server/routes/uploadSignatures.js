import express from 'express';
import { generateUploadSignature } from '../controllers/uploadSignaturesController.js';
import { auth as protect } from '../middleware/auth.js'; 
import { checkPermission } from '../middleware/permission.js'; 

const router = express.Router();

// Allow all authenticated users for profiles, restrict other folders to admin/employee
router.post(
    '/', 
    protect,
    (req, res, next) => {
        const folder = req.body.folder;
        // Allow ANY authenticated user to upload profile pictures
        if (folder === 'profiles') {
            return next();
        }
        // Restrict payment_proofs and attachments to admin/employee only
        return checkPermission('admin', 'employee')(req, res, next);
    },
    generateUploadSignature 
);

export default router;