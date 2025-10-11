import express from 'express';
import {
  getAllPromotions,
  getAllPromotionsAdmin,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionsController.js';
import { auth } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

// Public route
router.get('/', getAllPromotions);

// Admin & Employee (with permission) routes
router.get('/admin', auth, checkPermission('promotions', 'read'), getAllPromotionsAdmin);
router.post('/', auth, checkPermission('promotions', 'write'), createPromotion);
router.put('/:id', auth, checkPermission('promotions', 'write'), updatePromotion);
router.delete('/:id', auth, checkPermission('promotions', 'full'), deletePromotion);

export default router;