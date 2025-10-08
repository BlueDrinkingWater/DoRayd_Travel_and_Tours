import express from 'express';
import { 
    getAllEmployees, createEmployee, updateEmployee, deleteEmployee, changeEmployeePassword,
    getAllCustomers, resetCustomerPassword // --- ADDED new functions ---
} from '../controllers/usersController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// --- Employee Management Routes (Admin Only) ---
router.route('/employees').get(auth, authorize('admin'), getAllEmployees).post(auth, authorize('admin'), createEmployee);
router.route('/employees/:id').put(auth, authorize('admin'), updateEmployee).delete(auth, authorize('admin'), deleteEmployee);
router.route('/employees/:id/password').put(auth, authorize('admin'), changeEmployeePassword);

// --- ADDED: Customer Management Routes (Admin Only) ---
router.route('/customers').get(auth, authorize('admin'), getAllCustomers);
router.route('/customers/:id/reset-password').put(auth, authorize('admin'), resetCustomerPassword);

export default router;