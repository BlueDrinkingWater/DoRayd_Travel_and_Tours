import express from 'express';
import {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  archiveTour,
  unarchiveTour,
  deleteTour, // --- ADDED ---
} from '../controllers/toursController.js';
import { auth, isAdminOrEmployee } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js'; // Ensure upload is imported if used

const router = express.Router();

// Public routes
router.get('/', getAllTours);
router.get('/:id', getTourById);

// Admin/Employee routes
// Assuming createTour and updateTour handle multipart/form-data for images
// If 'upload' middleware is used for parsing, it should be included
// If images are just URLs, 'upload.none()' or no middleware is fine if body-parser handles it
router.post('/', auth, isAdminOrEmployee, upload.none(), createTour); // Using upload.none() as images seem to be URLs
router.put('/:id', auth, isAdminOrEmployee, upload.none(), updateTour);
router.patch('/archive/:id', auth, isAdminOrEmployee, archiveTour);
router.patch('/unarchive/:id', auth, isAdminOrEmployee, unarchiveTour);

// --- ADDED ---
// DELETE a tour (permanent)
router.delete('/:id', auth, isAdminOrEmployee, deleteTour);

export default router;