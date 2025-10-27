import express from 'express';
import {
    getAllTransportServicesAdmin,
    getAllTransportServicesPublic,
    getTransportServiceById,
    createTransportService,
    updateTransportService,
    archiveTransportService,
    unarchiveTransportService,
    deleteTransportService // Optional, if you want hard delete
} from '../controllers/transportController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js'; // Assuming 'transport' module

const router = express.Router();

// Public routes
router.get('/', getAllTransportServicesPublic);
router.get('/:id', getTransportServiceById); // Public can view details too

// Admin & Employee (with 'transport' permission) routes
router.get('/admin/all', auth, checkPermission('transport', 'read'), getAllTransportServicesAdmin); // Separate route for admin view
router.post('/', auth, checkPermission('transport', 'write'), createTransportService);
router.put('/:id', auth, checkPermission('transport', 'write'), updateTransportService);
router.patch('/:id/archive', auth, checkPermission('transport', 'full'), archiveTransportService);
router.patch('/:id/unarchive', auth, checkPermission('transport', 'full'), unarchiveTransportService);
router.delete('/:id', auth, checkPermission('transport', 'full'), deleteTransportService); 

export default router;
