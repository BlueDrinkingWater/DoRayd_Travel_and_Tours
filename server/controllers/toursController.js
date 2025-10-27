import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';
// *** ADDED: Import deleteImage ***
import { deleteImage } from './uploadController.js';

export const getAllTours = async (req, res) => {
  try {
    const { page = 1, limit = 12, archived = 'false', ...filters } = req.query;

    const query = {}; // Start with empty query

    // Handle 'search' query
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        query.$or = [
            { title: searchRegex },
            { destination: searchRegex },
            { category: searchRegex },
            // { difficulty: searchRegex } // Removed difficulty
        ];
    }

    if (filters.featured) query.featured = filters.featured === 'true';
    if (filters.isAvailable) query.isAvailable = filters.isAvailable === 'true';
    if (filters.destination) query.destination = new RegExp(filters.destination, 'i');
    if (filters.maxGroupSize) query.maxGroupSize = { $gte: Number(filters.maxGroupSize) };

    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    // Handle 'includeArchived'
    if (req.query.includeArchived === 'true') {
        query.archived = { $in: [true, false] };
    } else {
        query.archived = false; // Default to active tours
    }
    // Override if 'archived' filter is explicitly set
    if (req.query.archived) {
         query.archived = req.query.archived === 'true';
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
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
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
    const {
        title, description, price, duration, startDate, endDate, maxGroupSize,
        category, inclusions, exclusions, itinerary, // Removed 'difficulty'
        availabilityStatus,
        paymentType, downpaymentType, downpaymentValue, images
    } = req.body;

    // --- Validation ---
    if (!title || !price || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Title, Price, Start Date, and End Date are required.' });
    }
    if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({ success: false, message: 'End Date must be after Start Date.' });
    }
    if (paymentType === 'downpayment') {
        if (!downpaymentType || !downpaymentValue || Number(downpaymentValue) <= 0) {
            return res.status(400).json({ success: false, message: 'If allowing downpayment, type and a value greater than 0 are required.' });
        }
         if (downpaymentType === 'percentage' && (Number(downpaymentValue) < 1 || Number(downpaymentValue) > 99)) {
             return res.status(400).json({ success: false, message: 'Downpayment percentage must be between 1 and 99.' });
        }
    }

    let parsedItinerary = [];
    try {
        if (itinerary) {
            parsedItinerary = JSON.parse(itinerary); // Expecting JSON string from client
            if (!Array.isArray(parsedItinerary)) throw new Error();
        }
    } catch (e) {
        return res.status(400).json({ success: false, message: 'Itinerary must be a valid JSON array string.' });
    }
    // --- End Validation ---

    const tour = new Tour({
        ...req.body,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        inclusions: Array.isArray(inclusions) ? inclusions : (inclusions ? inclusions.split(',').map(f => f.trim()) : []),
        exclusions: Array.isArray(exclusions) ? exclusions : (exclusions ? exclusions.split(',').map(f => f.trim()) : []),
        itinerary: parsedItinerary, // Save the parsed array
        images: Array.isArray(images) ? images : (images ? [images] : []), // Ensure images is array
        isAvailable: availabilityStatus ? availabilityStatus === 'available' : (req.body.isAvailable !== undefined ? req.body.isAvailable : true),
        // Handle payment fields
        paymentType: paymentType || 'full',
        downpaymentType: paymentType === 'downpayment' ? downpaymentType : undefined,
        downpaymentValue: paymentType === 'downpayment' ? Number(downpaymentValue) : undefined,
    });
    // Remove difficulty before saving if it somehow exists
    delete tour.difficulty;

    await tour.save();

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.status(201).json({ success: true, data: tour });
  } catch (error) {
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const tour = await Tour.findById(id);
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    // --- Validation ---
    const newStartDate = updateData.startDate || tour.startDate;
    const newEndDate = updateData.endDate || tour.endDate;
    if (new Date(newStartDate) >= new Date(newEndDate)) {
        return res.status(400).json({ success: false, message: 'End Date must be after Start Date.' });
    }

    const paymentType = updateData.paymentType || tour.paymentType;
    if (paymentType === 'downpayment') {
         const dpType = updateData.downpaymentType || tour.downpaymentType;
         const dpValue = updateData.downpaymentValue !== undefined ? updateData.downpaymentValue : tour.downpaymentValue;
        if (!dpType || !dpValue || Number(dpValue) <= 0) {
            return res.status(400).json({ success: false, message: 'If allowing downpayment, type and a value greater than 0 are required.' });
        }
         if (dpType === 'percentage' && (Number(dpValue) < 1 || Number(dpValue) > 99)) {
             return res.status(400).json({ success: false, message: 'Downpayment percentage must be between 1 and 99.' });
        }
         // Set fields for saving
         tour.paymentType = paymentType;
         tour.downpaymentType = dpType;
         tour.downpaymentValue = Number(dpValue);
    } else if (paymentType === 'full') {
        tour.paymentType = 'full';
        tour.downpaymentType = undefined;
        tour.downpaymentValue = undefined;
    }
    // --- End Validation ---

    // Handle availabilityStatus
     if (updateData.availabilityStatus) {
         updateData.isAvailable = updateData.availabilityStatus === 'available';
         delete updateData.availabilityStatus;
     }

    // Handle string-to-array conversions
    if (updateData.inclusions && typeof updateData.inclusions === 'string') {
         updateData.inclusions = updateData.inclusions.split(',').map(f => f.trim()).filter(Boolean);
    }
    if (updateData.exclusions && typeof updateData.exclusions === 'string') {
         updateData.exclusions = updateData.exclusions.split(',').map(f => f.trim()).filter(Boolean);
    }

    // Handle itinerary JSON string
    if (updateData.itinerary && typeof updateData.itinerary === 'string') {
        try {
            updateData.itinerary = JSON.parse(updateData.itinerary);
            if (!Array.isArray(updateData.itinerary)) throw new Error("Itinerary must be an array.");
        } catch (e) {
            return res.status(400).json({ success: false, message: 'Itinerary must be a valid JSON array string.' });
        }
    }

    // Handle images (assuming 'images' in body is the final array of URLs)
     if (updateData.images && Array.isArray(updateData.images)) {
         tour.images = updateData.images.map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean);
     }
     // Remove fields we've already manually set or don't want to mass-assign
     delete updateData.paymentType;
     delete updateData.downpaymentType;
     delete updateData.downpaymentValue;
     delete updateData.images; // We set this manually on `tour`

    // Remove difficulty if it's sent
    if (updateData.hasOwnProperty('difficulty')) {
      delete updateData.difficulty;
    }

    // Update other fields
    tour.set(updateData);

    const updatedTour = await tour.save(); // Run validators on save

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_TOUR', `Tour: ${updatedTour.title}`, '/owner/manage-tours');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, data: updatedTour });
  } catch (error) {
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const archiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

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
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: "Tour restored successfully", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteTour = async (req, res) => {
  try {
    const { id } = req.params;
    const tour = await Tour.findById(id);

    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Check for existing bookings
    // Ensure the query checks against the correct itemId and relevant statuses
    const existingBookings = await Booking.findOne({ itemId: id, itemType: 'tour', status: { $in: ['pending', 'confirmed', 'fully_paid'] } });
    if (existingBookings) {
      return res.status(400).json({ success: false, message: 'Cannot delete tour with active or pending bookings. Please archive it instead.' });
    }

    // Delete associated images from Cloudinary
    if (tour.images && tour.images.length > 0) {
      console.log(`Deleting ${tour.images.length} tour images...`);
      for (const imageUrl of tour.images) {
        try {
          // Extract public_id from URL
          const urlParts = imageUrl.split('/');
          const publicIdWithFolder = urlParts.slice(urlParts.indexOf('dorayd')).join('/'); // Gets 'dorayd/tours/image_id.jpg'
          if (publicIdWithFolder) {
             // Pass the *decoded* public_id with folder structure to deleteImage
             await deleteImage({ params: { public_id: decodeURIComponent(publicIdWithFolder) } }, { // Mock request and response objects
                status: () => ({ json: () => {} }), // Mock response methods
                json: () => {}
             });
             console.log(`Attempted deletion of image: ${publicIdWithFolder}`);
          }
        } catch (imgErr) {
          console.warn(`Failed to delete tour image ${imageUrl}: ${imgErr.message}`);
          // Continue deletion even if image removal fails
        }
      }
    }

    await Tour.findByIdAndDelete(id);

    // Activity Log
    const io = req.app.get('io');
     // *** MODIFIED: Changed check to req.user.role === 'employee' ***
     if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(
          req.user.id,
          'DELETE_TOUR',
          `Permanently deleted: ${tour.title}`,
          '/owner/manage-tours' // Or appropriate link
        );
         if(newLog) io.to('admin').emit('activity-log-update', newLog); // Emit to admin room
         console.log(`Activity log created for DELETE_TOUR by ${req.user.role}: ${req.user.id}`);
     }
     // *** END MODIFICATION ***

    res.json({ success: true, message: 'Tour permanently deleted' });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ success: false, message: 'Server Error during tour deletion.', error: error.message });
  }
};