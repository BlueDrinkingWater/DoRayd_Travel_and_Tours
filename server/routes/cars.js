// server/routes/cars.js

import express from 'express';
import {
  getAllCarsAdmin,
  getAllCarsPublic,
  getCarById,
  createCar,
  updateCar,
  archiveCar,
  unarchiveCar,
  getCarBookedDates,
  deleteCar, // --- ADDED ---
} from '../controllers/carsController.js';
import { auth, isAdminOrEmployee } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js'; // Assuming you might use this later for direct uploads

const router = express.Router();

// Public routes
router.get('/', getAllCarsPublic);
router.get('/:id', getCarById);
router.get('/booked-dates/:id', getCarBookedDates); // Public can check availability

// Admin/Employee routes
router.get('/admin', auth, isAdminOrEmployee, getAllCarsAdmin); // Route for admin to get all cars including archived
router.post('/', auth, isAdminOrEmployee, upload.none(), createCar); // Using upload.none() as images seem to be URLs from client-side upload
router.put('/:id', auth, isAdminOrEmployee, upload.none(), updateCar);
router.patch('/archive/:id', auth, isAdminOrEmployee, archiveCar);
router.patch('/unarchive/:id', auth, isAdminOrEmployee, unarchiveCar);

// --- ADDED ---
// DELETE a car (permanent)
router.delete('/:id', auth, isAdminOrEmployee, deleteCar);

export default router;