import express from 'express';
import {
    getAllBookings,
    createBooking,
    updateBookingStatus,
    getMyBookings,
    addPayment,
    getBookingAvailability,
    cancelBooking
} from '../controllers/bookingsController.js';
import { auth, authorize } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { checkPermission } from '../middleware/permission.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get('/availability/:serviceId', getBookingAvailability);

// Use optionalAuth to handle both guest and logged-in user bookings
router.post('/', optionalAuth, upload.single('paymentProof'), createBooking);


// --- AUTHENTICATED ROUTES ---
router.route('/')
    .get(auth, checkPermission('bookings', 'read'), getAllBookings);
    
router.route('/my-bookings')
    .get(auth, authorize('customer'), getMyBookings);

router.route('/:id/status')
    .put(auth, checkPermission('bookings', 'write'), upload.single('attachment'), updateBookingStatus);

router.route('/:id/cancel')
    .patch(auth, checkPermission('bookings', 'write'), upload.single('attachment'), cancelBooking);

router.route('/:id/add-payment')
    .post(auth, authorize('customer'), upload.single('paymentProof'), addPayment);

export default router;