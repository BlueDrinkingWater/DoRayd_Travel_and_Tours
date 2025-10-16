import express from 'express';
import multer from 'multer';
import { uploadSingleImage, deleteImage } from '../controllers/uploadController.js';
import { auth, authorize } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// This uploader is for generic images (e.g., from content management)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req) => `dorayd/${req.body.category || 'general'}`,
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

// Route for uploading a single image
router.post('/image', auth, authorize('admin', 'employee'), upload.single('image'), uploadSingleImage);

// Route for deleting an image using its public_id. The (*) allows slashes.
router.delete('/image/:public_id(*)', auth, authorize('admin', 'employee'), deleteImage);

export default router;