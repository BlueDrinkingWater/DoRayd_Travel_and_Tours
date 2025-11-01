import express from 'express';
import { auth } from '../middleware/auth.js';
import { uploadSingleImage, deleteImage } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { generateUploadSignature } from '../controllers/uploadSignaturesController.js';

const router = express.Router();
router.post(
  '/image',
  auth, 
  upload.single('image'), 
  uploadSingleImage 
);

router.delete(
  '/image/:public_id', 
  auth, 
  deleteImage
);

router.post('/signature', auth, generateUploadSignature);

export default router;