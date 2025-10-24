import TransportService from '../models/TransportService.js';
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
    res.json({ success: true, data: services });
  } catch (error) {
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
    res.json({ success: true, data: service });
  } catch (error) {
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
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CREATE_TRANSPORT', `Transport: ${newService.vehicleType} ${newService.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }

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
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_TRANSPORT', `Transport: ${updatedService.vehicleType} ${updatedService.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }

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
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'ARCHIVE_TRANSPORT', `Transport: ${service.vehicleType} ${service.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }

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
    if (io && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'RESTORE_TRANSPORT', `Transport: ${service.vehicleType} ${service.name || ''}`, '/owner/manage-transport');
        if(newLog) io.to('admin').emit('activity-log-update', newLog);
    }

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

    // Add activity log if needed
    // ...

    res.json({ success: true, message: 'Transport service deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error deleting service.' });
  }
};
