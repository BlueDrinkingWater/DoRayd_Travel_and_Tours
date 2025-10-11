import Car from '../models/Car.js';
import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

export const getAllCars = async (req, res) => {
  try {
    const { page = 1, limit = 12, archived = 'false', ...filters } = req.query;

    const query = { archived: archived === 'true' };

    if (filters.brand) query.brand = new RegExp(filters.brand, 'i');
    if (filters.location) query.location = new RegExp(filters.location, 'i');
    if (filters.isAvailable) query.isAvailable = filters.isAvailable === 'true';

    if (filters.minPrice || filters.maxPrice) {
        query.pricePerDay = {};
        if (filters.minPrice) query.pricePerDay.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.pricePerDay.$lte = Number(filters.maxPrice);
    }

    const cars = await Car.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });
      
    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    
    const carsWithPromotions = cars.map(car => {
        const carObj = car.toObject();
        carObj.originalPrice = carObj.pricePerDay;

        const applicablePromotions = promotions.filter(promo => {
            if (promo.applicableTo === 'all') return true;
            if (promo.applicableTo === 'car' && promo.itemIds.includes(car._id.toString())) return true;
            return false;
        });

        if (applicablePromotions.length > 0) {
            let bestPrice = carObj.pricePerDay;
            let bestPromo = null;
            applicablePromotions.forEach(promo => {
                let discountedPrice;
                if (promo.discountType === 'percentage') {
                    discountedPrice = carObj.originalPrice - (carObj.originalPrice * (promo.discountValue / 100));
                } else {
                    discountedPrice = carObj.originalPrice - promo.discountValue;
                }
                if (discountedPrice < bestPrice) {
                    bestPrice = discountedPrice;
                    bestPromo = promo;
                }
            });
            carObj.pricePerDay = bestPrice;
            if (bestPromo) {
              carObj.promotion = {
                title: bestPromo.title,
                discountValue: bestPromo.discountValue,
                discountType: bestPromo.discountType,
              };
            }
        }
        return carObj;
    });


    const total = await Car.countDocuments(query);

    res.json({
        success: true,
        data: carsWithPromotions,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cars', error: error.message });
  }
};

export const createCar = async (req, res) => {
  try {
    const car = new Car({ ...req.body, owner: req.user.id });
    await car.save();

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.status(201).json({ success: true, data: car });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, data: car });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, message: "Car archived successfully", data: car });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const unarchiveCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, { archived: false, isAvailable: true }, { new: true });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });
    
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, message: "Car restored successfully", data: car });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    const carObj = car.toObject();
    carObj.originalPrice = carObj.pricePerDay;

    const applicablePromotions = promotions.filter(promo => {
        if (promo.applicableTo === 'all') return true;
        if (promo.applicableTo === 'car' && promo.itemIds.includes(car._id.toString())) return true;
        return false;
    });

    if (applicablePromotions.length > 0) {
        let bestPrice = carObj.pricePerDay;
        let bestPromo = null;
        applicablePromotions.forEach(promo => {
            let discountedPrice;
            if (promo.discountType === 'percentage') {
                discountedPrice = carObj.originalPrice - (carObj.originalPrice * (promo.discountValue / 100));
            } else {
                discountedPrice = carObj.originalPrice - promo.discountValue;
            }
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
                bestPromo = promo;
            }
        });
        carObj.pricePerDay = bestPrice;
        if (bestPromo) {
          carObj.promotion = {
            title: bestPromo.title,
            discountValue: bestPromo.discountValue,
            discountType: bestPromo.discountType,
          };
        }
    }

    res.json({ success: true, data: carObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};