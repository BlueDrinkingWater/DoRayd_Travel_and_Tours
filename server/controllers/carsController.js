import Car from '../models/Car.js';
import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';
import Booking from '../models/Booking.js';
import { deleteImage } from './uploadController.js';

export const getAllCars = async (req, res) => {
  try {
    const { page = 1, limit = 12, archived = 'false', ...filters } = req.query;

    const query = { archived: archived === 'true' };

    if (filters.brand) query.brand = new RegExp(filters.brand, 'i');
    if (filters.location) query.location = new RegExp(filters.location, 'i');
    if (filters.isAvailable) query.isAvailable = filters.isAvailable === 'true';
    if (filters.seats) query.seats = { $gte: Number(filters.seats) };

    if (filters.minPrice || filters.maxPrice) {
        query.pricePerDay = {};
        if (filters.minPrice) query.pricePerDay.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.pricePerDay.$lte = Number(filters.maxPrice);
    }

    // Handle 'search' query for broader matching
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [
            { brand: searchRegex },
            { model: searchRegex },
            { location: searchRegex },
            { type: searchRegex } // 'type' is category in model
        ];
    }
    // Handle 'includeArchived'
    if (req.query.includeArchived === 'true') {
        query.archived = { $in: [true, false] };
    } else {
        query.archived = false; // Default to active cars unless specified
    }
    // Override if 'archived' filter is explicitly set
    if (req.query.archived) {
         query.archived = req.query.archived === 'true';
    }


    const cars = await Car.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const promotions = await Promotion.find({
  isActive: true,
  startDate: { $lte: new Date() }, // <-- ADD THIS LINE
  endDate: { $gte: new Date() }
});
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
    const {
        brand, model, year, category, transmission, seats, fuelType, pricePerDay,
        description, features, pickupLocations, availabilityStatus,
        paymentType, downpaymentType, downpaymentValue, images // Images now passed as array of URLs
    } = req.body;

    // Downpayment validation
    if (paymentType === 'downpayment') {
        if (!downpaymentType || !downpaymentValue || Number(downpaymentValue) <= 0) {
            return res.status(400).json({ success: false, message: 'If allowing downpayment, type and a value greater than 0 are required.' });
        }
         if (downpaymentType === 'percentage' && (Number(downpaymentValue) < 1 || Number(downpaymentValue) > 99)) {
             return res.status(400).json({ success: false, message: 'Downpayment percentage must be between 1 and 99.' });
        }
    }

    const car = new Car({
        ...req.body,
        owner: req.user.id,
        // Ensure arrays are saved correctly from comma-separated strings if needed
        features: Array.isArray(features) ? features : (features ? features.split(',').map(f => f.trim()) : []),
        pickupLocations: Array.isArray(pickupLocations) ? pickupLocations : (pickupLocations ? pickupLocations.split(',').map(f => f.trim()) : []),
        images: Array.isArray(images) ? images : (images ? [images] : []), // Ensure images is an array of URLs
        isAvailable: availabilityStatus ? availabilityStatus === 'available' : (req.body.isAvailable !== undefined ? req.body.isAvailable : true), // Handle both inputs
        // Handle payment fields
        paymentType: paymentType || 'full',
        downpaymentType: paymentType === 'downpayment' ? downpaymentType : undefined,
        downpaymentValue: paymentType === 'downpayment' ? Number(downpaymentValue) : undefined,
    });

    await car.save();

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.status(201).json({ success: true, data: car });
  } catch (error) {
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCar = async (req, res) => {
  try {
     const { id } = req.params;
     const updateData = { ...req.body };

     // Find car first
     const car = await Car.findById(id);
     if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

     // Handle availabilityStatus
     if (updateData.availabilityStatus) {
         updateData.isAvailable = updateData.availabilityStatus === 'available';
         delete updateData.availabilityStatus; // Remove field to avoid saving it
     }

     // Handle features conversion from string
     if (updateData.features && typeof updateData.features === 'string') {
         updateData.features = updateData.features.split(',').map(f => f.trim()).filter(Boolean);
     }

     // Handle pickupLocations conversion from string
     if (updateData.pickupLocations && typeof updateData.pickupLocations === 'string') {
         updateData.pickupLocations = updateData.pickupLocations.split(',').map(f => f.trim()).filter(Boolean);
     }

     // Handle images (assuming 'images' in body is the final array of URLs)
     if (updateData.images && Array.isArray(updateData.images)) {
         car.images = updateData.images.map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean);
     } else if (updateData.existingImages) {
         // Fallback if ImageUpload sends 'existingImages'
         car.images = Array.isArray(updateData.existingImages) ? updateData.existingImages : [updateData.existingImages];
     }
     // Note: Image DELETION logic should be handled by ImageUpload component calling delete endpoint
     // This update just saves the final list of URLs

    // --- PAYMENT FIELD LOGIC ---
    if (updateData.paymentType) {
        car.paymentType = updateData.paymentType;
        if (updateData.paymentType === 'full') {
            car.downpaymentType = undefined;
            car.downpaymentValue = undefined;
        } else { // paymentType is 'downpayment'
            // Validation
            if (!updateData.downpaymentType || !updateData.downpaymentValue || Number(updateData.downpaymentValue) <= 0) {
                 return res.status(400).json({ success: false, message: 'If allowing downpayment, type and a value greater than 0 are required.' });
            }
            if (updateData.downpaymentType === 'percentage' && (Number(updateData.downpaymentValue) < 1 || Number(updateData.downpaymentValue) > 99)) {
                 return res.status(400).json({ success: false, message: 'Downpayment percentage must be between 1 and 99.' });
            }
            car.downpaymentType = updateData.downpaymentType;
            car.downpaymentValue = Number(updateData.downpaymentValue);
        }
    }
    // --- END PAYMENT LOGIC ---

    // Update other fields
    car.set(updateData); // Apply other updates from req.body

    const updatedCar = await car.save(); // Run validators on save

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_CAR', `Car: ${updatedCar.brand} ${updatedCar.model}`, '/owner/manage-cars');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, data: updatedCar });
  } catch (error) {
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

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
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_CAR', `Car: ${car.brand} ${car.model}`, '/owner/manage-cars');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: "Car restored successfully", data: car });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findById(id);

    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    // Check for existing active/pending bookings
    const existingBookings = await Booking.findOne({
      itemId: id,
      itemType: 'car',
      status: { $in: ['pending', 'confirmed', 'fully_paid'] }
    });

    if (existingBookings) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete car with active or pending bookings. Please archive it instead.'
      });
    }

    // Delete associated images from Cloudinary
    if (car.images && car.images.length > 0) {
      console.log(`Deleting ${car.images.length} car images...`);
      for (const imageUrl of car.images) {
        try {
          // Extract public_id from URL
          const urlParts = imageUrl.split('/');
          const publicIdWithFolder = urlParts.slice(urlParts.indexOf('dorayd')).join('/');

          if (publicIdWithFolder) {
             await deleteImage(
               { params: { public_id: decodeURIComponent(publicIdWithFolder) } },
               { // Mock response object
                 status: () => ({ json: () => {} }),
                 json: () => {}
               }
             );
             console.log(`Attempted deletion of image: ${publicIdWithFolder}`);
          }
        } catch (imgErr) {
          console.warn(`Failed to delete car image ${imageUrl}: ${imgErr.message}`);
        }
      }
    }

    await Car.findByIdAndDelete(id);

    // Activity Log
    const io = req.app.get('io');
    // *** MODIFIED: Changed check to req.user.role === 'employee' ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(
          req.user.id,
          'DELETE_CAR',
          `Permanently deleted: ${car.brand} ${car.model}`,
          '/owner/manage-cars'
        );
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
        console.log(`Activity log created for DELETE_CAR by ${req.user.role}: ${req.user.id}`);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: 'Car permanently deleted' });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ success: false, message: 'Server Error during car deletion.', error: error.message });
  }
};

export const getCarById = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const promotions = await Promotion.find({
  isActive: true,
  startDate: { $lte: new Date() }, // <-- ADD THIS LINE
  endDate: { $gte: new Date() }
});
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