// server/routes/tours.js
import express from 'express';
// --- ADD deleteTour ---
import { getAllTours, getTourById, createTour, updateTour, archiveTour, unarchiveTour, deleteTour } from '../controllers/toursController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

router.route('/')
    .get(getAllTours)
    .post(auth, checkPermission('tours', 'write'), createTour);

router.route('/:id')
    .get(getTourById)
    .put(auth, checkPermission('tours', 'write'), updateTour)
    // --- ADD DELETE route ---
    .delete(auth, checkPermission('tours', 'full'), deleteTour);

router.route('/:id/archive')
    .patch(auth, checkPermission('tours', 'full'), archiveTour);

router.route('/:id/unarchive')
    .patch(auth, checkPermission('tours', 'full'), unarchiveTour);

export default router;