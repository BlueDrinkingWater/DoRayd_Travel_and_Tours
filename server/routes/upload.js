import express from 'express';
import { auth } from '../middleware/auth.js';

// --- FIX: Import the controllers and middleware for image uploads ---
import { uploadSingleImage, deleteImage } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';

// (This import is from your original file for the /signature route)
import { generateUploadSignature } from '../controllers/uploadSignaturesController.js';

const router = express.Router();

// --- FIX: Add the POST /image route ---
// This handles the call from DataService.jsx
router.post(
  '/image',
  auth, // Requires user to be logged in
  upload.single('image'), // Uses the multer middleware to process a single file named 'image'
  uploadSingleImage // Calls the controller function to handle the logic
);

// --- FIX: Add the DELETE /image route ---
// This is the corresponding route to delete an image, matching your uploadController
router.delete(
  '/image/:public_id', // Matches the controller's req.params.public_id
  auth, // Requires user to be logged in
  deleteImage
);

// This was your original route, leave it if you still use it
router.post('/signature', auth, generateUploadSignature);

export default router;