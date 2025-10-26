import express from 'express';
import multer from 'multer';
import { uploadSingleImage, deleteImage } from '../controllers/uploadController.js';
import { auth, authorize } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// This uploader is for generic images
// Note: access_mode will be set in the controller AFTER upload for sensitive folders
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req) => `dorayd/${req.body.category || 'general'}`,
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'txt'],
    transformation: [{ width: 1024, height: 1024, crop: 'limit' }],
  },
});

const upload = multer({ storage: storage });

// Route for uploading a single image
router.post('/image', auth, authorize('admin', 'employee'), upload.single('image'), uploadSingleImage);

// Route for deleting an image using its public_id. The (*) allows slashes.
router.delete('/image/:public_id(*)', auth, authorize('admin', 'employee'), deleteImage);

export default router;