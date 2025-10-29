import TransportService from '../models/TransportService.js';
import Promotion from '../models/Promotion.js'; // Import Promotion model
import { createActivityLog } from './activityLogController.js';

// Get all Transport Services (Admin/Employee, includes archived optionally)
export const getAllTransportServicesAdmin = async (req, res) => {
  try {
    const { archived = 'false', search } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { vehicleType: searchRegex },
        { name: searchRegex },
        { capacity: searchRegex },
        { 'pricing.destination': searchRegex } // Search within pricing destinations
      ];
    }

    if (archived === 'true') {
      query.archived = true;
    } else {
      query.archived = false;
    }

    const services = await TransportService.find(query).sort({ vehicleType: 1, name: 1 });
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error fetching transport services.' });
  }
};

// Get all Active Transport Services (Public)
export const getAllTransportServicesPublic = async (req, res) => {
  try {
    const services = await TransportService.find({ archived: false, isAvailable: true }).sort({ vehicleType: 1, name: 1 });
    // Fetch active promotions
    const promotions = await Promotion.find({
  isActive: true,
  startDate: { $lte: new Date() }, // <-- ADD THIS LINE
  endDate: { $gte: new Date() }
});
    // Map through services and apply promotions
    const servicesWithPromotions = services.map(service => {
        const serviceObj = service.toObject();

        const applicablePromotions = promotions.filter(promo => {
            if (promo.applicableTo === 'all') return true;
            if (promo.applicableTo === 'transport' && promo.itemIds.includes(service._id.toString())) return true;
            return false;
        });

        if (applicablePromotions.length > 0) {
             // Find the "best" promotion (e.g., highest discount)
             // This is a simplistic approach; you might want more complex logic
             const bestPromo = applicablePromotions.reduce((best, current) => {
                // Simple logic: assume percentage is better, or higher fixed value
                // You'll need to refine this based on your pricing
                if (!best) return current;
                if (current.discountType === 'percentage' && best.discountType !== 'percentage') return current;
                if (current.discountType === best.discountType && current.discountValue > best.discountValue) return current;
                return best;
             }, null);

             if (bestPromo) {
                serviceObj.promotion = {
                    title: bestPromo.title,
                    discountValue: bestPromo.discountValue,
                    discountType: bestPromo.discountType,
                };
                
                // --- IMPORTANT ---
                // Applying discounts to transport's complex pricing (per destination/type)
                // is complex. We are just attaching the promo info.
                // The frontend will need to interpret this and apply the discount
                // to the relevant pricing field (e.g., dayTour, overnight, etc.)
                // For example, you could apply it to each pricing entry:
                /*
                serviceObj.pricing = serviceObj.pricing.map(p => {
                    const originalPrice = p.price;
                    let discountedPrice = originalPrice;
                    if (bestPromo.discountType === 'percentage') {
                        discountedPrice = originalPrice * (1 - bestPromo.discountValue / 100);
                    } else { // fixed
                        discountedPrice = originalPrice - bestPromo.discountValue;
                    }
                    return { ...p, originalPrice, price: Math.max(0, discountedPrice) };
                });
                */
             }
        }
        return serviceObj;
    });


    res.json({ success: true, data: servicesWithPromotions }); // Send modified data
  } catch (error) {
    console.error("Error fetching public transport services:", error); // Log error
    res.status(500).json({ success: false, message: 'Server Error fetching transport services.' });
  }
};


// Get a single Transport Service by ID
export const getTransportServiceById = async (req, res) => {
  try {
    const service = await TransportService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Transport service not found' });
    }

    // Fetch active promotions
const promotions = await Promotion.find({
  isActive: true,
  startDate: { $lte: new Date() }, // <-- ADD THIS LINE
  endDate: { $gte: new Date() }
});
    const serviceObj = service.toObject();

    // Apply promotion logic (similar to getAllTransportServicesPublic)
    const applicablePromotions = promotions.filter(promo => {
        if (promo.applicableTo === 'all') return true;
        if (promo.applicableTo === 'transport' && promo.itemIds.includes(service._id.toString())) return true;
        return false;
    });

    if (applicablePromotions.length > 0) {
        // Find the "best" promotion
        const bestPromo = applicablePromotions.reduce((best, current) => {
            if (!best) return current;
            if (current.discountType === 'percentage' && best.discountType !== 'percentage') return current;
            if (current.discountType === best.discountType && current.discountValue > best.discountValue) return current;
            return best;
        }, null);

        if (bestPromo) {
            serviceObj.promotion = {
                title: bestPromo.title,
                discountValue: bestPromo.discountValue,
                discountType: bestPromo.discountType,
            };
            
            // Again, just attaching promo info. Frontend must apply discount.
            // Example of applying discount to pricing array:
            /*
            serviceObj.pricing = serviceObj.pricing.map(p => {
                const originalPrice = p.price;
                let discountedPrice = originalPrice;
                if (bestPromo.discountType === 'percentage') {
                    discountedPrice = originalPrice * (1 - bestPromo.discountValue / 100);
                } else { // fixed
                    discountedPrice = originalPrice - bestPromo.discountValue;
                }
                return { ...p, originalPrice, price: Math.max(0, discountedPrice) };
            });
            */
        }
    }

    res.json({ success: true, data: serviceObj }); // Send modified data
  } catch (error) {
    console.error("Error fetching transport service by ID:", error); // Log error
    res.status(500).json({ success: false, message: 'Server Error fetching transport service.' });
  }
};

// Create a new Transport Service
export const createTransportService = async (req, res) => {
  try {
    const { pricing, ...restOfData } = req.body;

    // Basic validation for pricing structure if provided
    if (pricing && !Array.isArray(pricing)) {
        return res.status(400).json({ success: false, message: 'Pricing data must be an array.' });
    }

    const newService = new TransportService({
        ...restOfData,
        pricing: pricing || [], // Ensure pricing is an array
        owner: req.user.id
    });

    await newService.save();

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_TRANSPORT', `Transport: ${newService.vehicleType} ${newService.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.status(201).json({ success: true, data: newService });
  } catch (error) {
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update a Transport Service
export const updateTransportService = async (req, res) => {
  try {
    const { id } = req.params;
    const { pricing, ...restOfData } = req.body;

    // Basic validation for pricing structure if provided
    if (pricing && !Array.isArray(pricing)) {
        return res.status(400).json({ success: false, message: 'Pricing data must be an array.' });
    }

    const updatedService = await TransportService.findByIdAndUpdate(
        id,
        { ...restOfData, pricing: pricing || [] }, // Ensure pricing is an array
        { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ success: false, message: 'Transport service not found' });
    }

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_TRANSPORT', `Transport: ${updatedService.vehicleType} ${updatedService.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, data: updatedService });
  } catch (error) {
     if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
     }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Archive a Transport Service
export const archiveTransportService = async (req, res) => {
  try {
    const service = await TransportService.findByIdAndUpdate(req.params.id, { archived: true, isAvailable: false }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Transport service not found' });

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_TRANSPORT', `Transport: ${service.vehicleType} ${service.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: "Transport service archived", data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error archiving service.' });
  }
};

// Unarchive a Transport Service
export const unarchiveTransportService = async (req, res) => {
  try {
    const service = await TransportService.findByIdAndUpdate(req.params.id, { archived: false, isAvailable: true }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Transport service not found' });

    const io = req.app.get('io');
    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_TRANSPORT', `Transport: ${service.vehicleType} ${service.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: "Transport service restored successfully", data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error restoring service.' });
  }
};

// Delete a Transport Service (Consider if needed - maybe only archive?)
export const deleteTransportService = async (req, res) => {
  try {
    const service = await TransportService.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Transport service not found' });
    }

    // *** MODIFIED: Added check for req.user.role before logging ***
    const io = req.app.get('io');
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'DELETE_TRANSPORT', `Permanently deleted: ${service.vehicleType} ${service.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: 'Transport service deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error deleting service.' });
  }
};