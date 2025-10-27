// server/routes/transportRoutes.js

import express from 'express';
import {
  getAllTransportAdmin,
  getAllTransportPublic,
  getTransportById,
  createTransport,
  updateTransport,
  archiveTransport,
  unarchiveTransport,
  getBookedDatesForTransport,
  deleteTransport, // --- ADDED ---
} from '../controllers/transportController.js';
import { auth, isAdminOrEmployee } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllTransportPublic);
router.get('/:id', getTransportById);
router.get('/booked-dates/:id', getBookedDatesForTransport);

// Admin/Employee routes
router.get('/admin/all', auth, isAdminOrEmployee, getAllTransportAdmin); // Changed path to avoid conflict
router.post('/', auth, isAdminOrEmployee, createTransport);
router.put('/:id', auth, isAdminOrEmployee, updateTransport);
router.patch('/archive/:id', auth, isAdminOrEmployee, archiveTransport);
router.patch('/unarchive/:id', auth, isAdminOrEmployee, unarchiveTransport);

// --- ADDED ---
// DELETE a transport service (permanent)
router.delete('/:id', auth, isAdminOrEmployee, deleteTransport);


export default router;