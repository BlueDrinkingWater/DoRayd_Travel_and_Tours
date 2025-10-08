import Car from '../models/Car.js';
import { createNotification } from './notificationController.js'; 

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

    const total = await Car.countDocuments(query);
    
    res.json({ 
        success: true, 
        data: cars, 
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
    if (io) {
      io.to('customer').emit('new-car', {
          message: `New car available: ${car.brand} ${car.model}`,
          link: `/cars/${car._id}`
      });

      if (req.user.role === 'employee') {
          const message = `Employee ${req.user.firstName} added a new car: ${car.brand} ${car.model}`;
          const link = '/owner/manage-cars';
          const notifications = await createNotification({ roles: ['admin'] }, message, link);
          if (notifications.length > 0) {
              io.to('admin').emit('activity-log', notifications[0]);
          }
      }
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
        const message = `Employee ${req.user.firstName} updated the car: ${car.brand} ${car.model}`;
        const link = '/owner/manage-cars';
        const notifications = await createNotification({ roles: ['admin'] }, message, link);
        if (notifications.length > 0) {
            io.to('admin').emit('activity-log', notifications[0]);
        }
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
        const message = `Employee ${req.user.firstName} archived the car: ${car.brand} ${car.model}`;
        const link = '/owner/manage-cars';
        const notifications = await createNotification({ roles: ['admin'] }, message, link);
        if (notifications.length > 0) {
            io.to('admin').emit('activity-log', notifications[0]);
        }
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
    res.json({ success: true, data: car });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};