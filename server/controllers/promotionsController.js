import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Public
export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    res.json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all promotions (Admin)
// @route   GET /api/promotions/admin
// @access  Admin
export const getAllPromotionsAdmin = async (req, res) => {
    try {
      const promotions = await Promotion.find().sort({ createdAt: -1 });
      res.json({ success: true, data: promotions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };

// @desc    Create a promotion
// @route   POST /api/promotions
// @access  Admin
export const createPromotion = async (req, res) => {
  try {
    const promotionData = { ...req.body };
    promotionData.discountValue = Number(promotionData.discountValue);
    if (isNaN(promotionData.discountValue)) {
      promotionData.discountValue = 0;
    }

    const promotion = new Promotion(promotionData);
    await promotion.save();

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_PROMOTION', `Promotion: ${promotion.title}`, '/owner/manage-promotions');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    console.error("PROMOTION CREATION ERROR:", error); 
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a promotion
// @route   PUT /api/promotions/:id
// @access  Admin
export const updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_PROMOTION', `Promotion: ${promotion.title}`, '/owner/manage-promotions');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a promotion
// @route   DELETE /api/promotions/:id
// @access  Admin
export const deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promotion not found' });
    }

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'DELETE_PROMOTION', `Promotion: ${promotion.title}`, '/owner/manage-promotions');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};