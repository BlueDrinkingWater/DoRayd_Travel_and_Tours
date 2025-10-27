import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import Promotion from '../models/Promotion.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';
import { deleteImage } from './imageController.js'; // --- ADDED ---

// Fetches tours based on query parameters (including archived status)
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
            { difficulty: searchRegex }
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

    // Handle 'includeArchived' and 'archived' filters for admin/employee views
    if (req.query.includeArchived === 'true') {
        query.archived = { $in: [true, false] }; // Show all if includeArchived is true
    } else {
        // Default: only show active unless 'archived=true' is explicitly passed
        query.archived = archived === 'true';
    }


    const tours = await Tour.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    // Apply promotions (no changes needed here)
    const promotions = await Promotion.find({ isActive: true, endDate: { $gte: new Date() } });
    const toursWithPromotions = tours.map(tour => {
        // ... (promotion logic remains the same)
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

    // Apply promotions (no changes needed here)
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

// Creates a new tour
export const createTour = async (req, res) => {
  try {
    const {
        title, description, price, duration, startDate, endDate, maxGroupSize,
        difficulty, category, inclusions, exclusions, itinerary,
        availabilityStatus, // This comes from the select dropdown in the modal
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
        // Expecting itinerary as a JSON string array from the frontend form
        if (itinerary && typeof itinerary === 'string') {
            parsedItinerary = JSON.parse(itinerary);
            if (!Array.isArray(parsedItinerary)) throw new Error();
        } else if (Array.isArray(itinerary)) {
             parsedItinerary = itinerary; // Already an array
        }
    } catch (e) {
        return res.status(400).json({ success: false, message: 'Itinerary must be a valid JSON array string or an array.' });
    }
    // --- End Validation ---

    const tour = new Tour({
        ...req.body,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        inclusions: Array.isArray(inclusions) ? inclusions : (inclusions ? String(inclusions).split(',').map(f => f.trim()) : []),
        exclusions: Array.isArray(exclusions) ? exclusions : (exclusions ? String(exclusions).split(',').map(f => f.trim()) : []),
        itinerary: parsedItinerary, // Save the parsed or passed array
        images: Array.isArray(images) ? images : (images ? [images] : []), // Ensure images is array of URLs
        // Determine isAvailable based on availabilityStatus from form, default to true if not provided
        isAvailable: availabilityStatus ? availabilityStatus === 'available' : true,
        // Handle payment fields
        paymentType: paymentType || 'full',
        downpaymentType: paymentType === 'downpayment' ? downpaymentType : undefined,
        downpaymentValue: paymentType === 'downpayment' ? Number(downpaymentValue) : undefined,
    });

    await tour.save();

    // --- Activity Log Call ---
    const io = req.app.get('io');
    if (io && (req.user.role === 'employee' || req.user.role === 'admin')) { // Log for admin too
        const newLog = await createActivityLog(req.user.id, 'CREATE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if(newLog) io.to('admin').emit('activity-log-update', newLog); // Emit to admin room
        console.log(`Activity log created for CREATE_TOUR by ${req.user.role}: ${req.user.id}`);
    } else {
        console.log(`Skipped activity log for CREATE_TOUR by role: ${req.user?.role}`);
    }
    // --- End Activity Log ---

    res.status(201).json({ success: true, data: tour });
  } catch (error) {
     console.error("Create Tour Error:", error); // Log the detailed error
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message || 'Failed to create tour.' });
  }
};


// Updates an existing tour
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
    // Remove payment fields from updateData to avoid direct assignment later
    delete updateData.paymentType;
    delete updateData.downpaymentType;
    delete updateData.downpaymentValue;
    // --- End Validation ---

    // Handle availabilityStatus from form select
     if (updateData.availabilityStatus) {
         updateData.isAvailable = updateData.availabilityStatus === 'available';
         delete updateData.availabilityStatus;
     }

    // Handle potential string-to-array conversions if necessary
    if (updateData.inclusions && typeof updateData.inclusions === 'string') {
         updateData.inclusions = updateData.inclusions.split(',').map(f => f.trim()).filter(Boolean);
    }
    if (updateData.exclusions && typeof updateData.exclusions === 'string') {
         updateData.exclusions = updateData.exclusions.split(',').map(f => f.trim()).filter(Boolean);
    }

    // Handle itinerary JSON string or array
    if (updateData.itinerary) {
        if (typeof updateData.itinerary === 'string') {
            try {
                updateData.itinerary = JSON.parse(updateData.itinerary);
                if (!Array.isArray(updateData.itinerary)) throw new Error("Itinerary must be an array.");
            } catch (e) {
                return res.status(400).json({ success: false, message: 'Itinerary must be a valid JSON array string or array.' });
            }
        } else if (!Array.isArray(updateData.itinerary)) {
             return res.status(400).json({ success: false, message: 'Itinerary must be an array.' });
        }
    }


    // --- Handle Image Deletion ---
    const oldImages = tour.images || [];
    const newImages = updateData.images || []; // Expecting an array of URLs
     // Find images that are in oldImages but not in newImages
    const imagesToDelete = oldImages.filter(imgUrl => !newImages.includes(imgUrl));
    
    if (imagesToDelete.length > 0) {
      console.log(`Deleting ${imagesToDelete.length} tour images...`);
      for (const imageUrl of imagesToDelete) {
        try {
          await deleteImage(imageUrl); // Use the deleteImage controller
        } catch (imgErr) {
          console.warn(`Failed to delete tour image ${imageUrl}: ${imgErr.message}`);
        }
      }
    }
    // Update images on the tour object
    tour.images = newImages;
    delete updateData.images; // Remove from mass assignment
    // --- End Image Deletion ---


    // Update other fields
    tour.set(updateData); // Apply remaining updates from req.body

    const updatedTour = await tour.save(); // Run validators on save

    // --- Activity Log Call ---
    const io = req.app.get('io');
    if (io && (req.user.role === 'employee' || req.user.role === 'admin')) {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_TOUR', `Tour: ${updatedTour.title}`, '/owner/manage-tours');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
        console.log(`Activity log created for UPDATE_TOUR by ${req.user.role}: ${req.user.id}`);
    } else {
         console.log(`Skipped activity log for UPDATE_TOUR by role: ${req.user?.role}`);
    }
    // --- End Activity Log ---

    res.json({ success: true, data: updatedTour });
  } catch (error) {
     console.error("Update Tour Error:", error); // Log the detailed error
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message || 'Failed to update tour.' });
  }
};


// Archives a tour
export const archiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    // --- Activity Log Call ---
    const io = req.app.get('io');
     if (io && (req.user.role === 'employee' || req.user.role === 'admin')) {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
        console.log(`Activity log created for ARCHIVE_TOUR by ${req.user.role}: ${req.user.id}`);
    } else {
        console.log(`Skipped activity log for ARCHIVE_TOUR by role: ${req.user?.role}`);
    }
    // --- End Activity Log ---

    res.json({ success: true, message: "Tour archived", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Restores an archived tour
export const unarchiveTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, { archived: false, isAvailable: true }, { new: true });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });

    // --- Activity Log Call ---
    const io = req.app.get('io');
    if (io && (req.user.role === 'employee' || req.user.role === 'admin')) {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_TOUR', `Tour: ${tour.title}`, '/owner/manage-tours');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
         console.log(`Activity log created for RESTORE_TOUR by ${req.user.role}: ${req.user.id}`);
    } else {
        console.log(`Skipped activity log for RESTORE_TOUR by role: ${req.user?.role}`);
    }
     // --- End Activity Log ---

    res.json({ success: true, message: "Tour restored successfully", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// --- ADDED: Delete Tour ---
export const deleteTour = async (req, res) => {
  try {
    const { id } = req.params;
    const tour = await Tour.findById(id);

    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Check for existing bookings
    const existingBookings = await Booking.findOne({ itemId: id, status: { $in: ['pending', 'confirmed'] } });
    if (existingBookings) {
      return res.status(400).json({ success: false, message: 'Cannot delete tour with active or pending bookings. Please archive it instead.' });
    }

    // Delete associated images
    if (tour.images && tour.images.length > 0) {
      for (const imageUrl of tour.images) {
        try {
          await deleteImage(imageUrl);
        } catch (imgErr) {
          console.warn(`Failed to delete tour image ${imageUrl}: ${imgErr.message}`);
        }
      }
    }

    await Tour.findByIdAndDelete(id);

    // Activity Log
    const io = req.app.get('io');
    const newLog = await createActivityLog(
      req.user.id, 
      'DELETE_TOUR', 
      `Permanently deleted: ${tour.title}`, 
      '/owner/manage-tours'
    );
    if(newLog && io) io.to('admin').emit('activity-log-update', newLog);

    res.json({ success: true, message: 'Tour permanently deleted' });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};