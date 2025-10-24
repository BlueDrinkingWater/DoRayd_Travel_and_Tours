import express from 'express';
import { 
    getAllEmployees, createEmployee, updateEmployee, deleteEmployee, changeEmployeePassword,
    getAllCustomers, resetCustomerPassword,
    updateUserProfile, deleteUserAccount, uploadProfilePicture // --- ADDED new functions ---
} from '../controllers/usersController.js';
import { auth, authorize } from '../middleware/auth.js';
import { uploadProfile } from '../middleware/upload.js';

const router = express.Router();

// --- Profile Management (for all logged-in users) ---
router.route('/profile')
    .put(auth, updateUserProfile)
    .delete(auth, deleteUserAccount);
    
router.route('/profile/picture')
    .post(auth, uploadProfile.single('profilePicture'), uploadProfilePicture);

// --- Employee Management Routes (Admin Only) ---
router.route('/employees').get(auth, authorize('admin'), getAllEmployees).post(auth, authorize('admin'), createEmployee);
router.route('/employees/:id').put(auth, authorize('admin'), updateEmployee).delete(auth, authorize('admin'), deleteEmployee);
router.route('/employees/:id/password').put(auth, authorize('admin'), changeEmployeePassword);

// --- Customer Management Routes (Admin Only) ---
router.route('/customers').get(auth, authorize('admin'), getAllCustomers);
router.route('/customers/:id/reset-password').put(auth, authorize('admin'), resetCustomerPassword);

export default router;