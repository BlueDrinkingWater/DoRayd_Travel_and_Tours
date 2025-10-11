import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

export const getAllTours = async (req, res) => {
  try {
    const { page = 1, limit = 12, archived = 'false', ...filters } = req.query;

    const query = { archived: archived === 'true' };

    if (filters.featured) query.featured = filters.featured === 'true';
    if (filters.isAvailable) query.isAvailable = filters.isAvailable === 'true';
    if (filters.destination) query.destination = new RegExp(filters.destination, 'i');

    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    const tours = await Tour.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    
    const toursWithPromotions = tours.map(tour => {
        const tourObj = tour.toObject();
        tourObj.originalPrice = tourObj.price;

        const applicablePromotions = promotions.filter(promo => {
            if (promo.applicableTo === 'all') return true;
            if (promo.applicableTo === 'tour' && promo.itemIds.includes(tour._id.toString())) return true;
            return false;
        });

        if (applicablePromotions.length > 0) {
            let bestPrice = tourObj.price;
            let bestPromo = null;
            applicablePromotions.forEach(promo => {
                let discountedPrice;
                if (promo.discountType === 'percentage') {
                    discountedPrice = tourObj.originalPrice - (tourObj.originalPrice * (promo.discountValue / 100));
                } else {
                    discountedPrice = tourObj.originalPrice - promo.discountValue;
                }
                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                    bestPromo = promo;
                }
            });
            tourObj.price = bestPrice;
            if (bestPromo) {
              tourObj.promotion = {
                title: bestPromo.title,
                discountValue: bestPromo.discountValue,
                discountType: bestPromo.discountType,
              };
            }
        }
        return tourObj;
    });

    const total = await Tour.countDocuments(query);
    res.json({
        success: true,
        data: toursWithPromotions,
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tours', error: error.message });
  }
};

export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    const tourObj = tour.toObject();
    tourObj.originalPrice = tourObj.price;

    const applicablePromotions = promotions.filter(promo => {
        if (promo.applicableTo === 'all') return true;
        if (promo.applicableTo === 'tour' && promo.itemIds.includes(tour._id.toString())) return true;
        return false;
    });

    if (applicablePromotions.length > 0) {
        let bestPrice = tourObj.price;
        let bestPromo = null;
        applicablePromotions.forEach(promo => {
            let discountedPrice;
            if (promo.discountType === 'percentage') {
                discountedPrice = tourObj.originalPrice - (tourObj.originalPrice * (promo.discountValue / 100));
            } else {
                discountedPrice = tourObj.originalPrice - promo.discountValue;
            }
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
                bestPromo = promo;
            }
        });
        tourObj.price = bestPrice;
        if (bestPromo) {
          tourObj.promotion = {
            title: bestPromo.title,
            discountValue: bestPromo.discountValue,
            discountType: bestPromo.discountType,
          };
        }
    }

    res.json({ success: true, data: tourObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createTour = async (req, res) => {
  try {
    const tour = new Tour(req.body);
    await tour.save();

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.status(201).json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, message: "Tour archived", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const unarchiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: false, isAvailable: true }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        io.to('admin').emit('activity-log-update', newLog);
    }
    
    res.json({ success: true, message: "Tour restored successfully", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};