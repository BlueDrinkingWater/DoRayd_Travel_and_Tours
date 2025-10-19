// server/controllers/bookingsController.js

import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import EmailService from '../utils/emailServices.js';
import { createNotification } from './notificationController.js';

// Get all bookings for a specific service
export const getBookingAvailability = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const bookings = await Booking.find({
      itemId: serviceId,
      status: { $in: ['confirmed', 'pending'] }
    }).select('startDate endDate');

    const bookedDates = bookings.reduce((acc, booking) => {
      let currentDate = new Date(booking.startDate);
      const endDate = booking.endDate ? new Date(booking.endDate) : new Date(booking.startDate);

      while (currentDate <= endDate) {
        acc.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return acc;
    }, []);

    res.json({ success: true, data: { bookedDates: [...new Set(bookedDates)] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all bookings (for admin/employee) with filtering and searching
export const getAllBookings = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { bookingReference: searchRegex },
        { paymentReference: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { itemName: searchRegex },
      ];
    }

    const bookings = await Booking.find(query)
        .populate({
            path: 'itemId',
            select: 'brand model title'
        })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get bookings for the currently authenticated user
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate('itemId')
            .sort({ createdAt: -1 });
        
        const validBookings = bookings.filter(booking => booking.itemId);

        res.json({ success: true, data: validBookings });
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// CREATE a new booking
export const createBooking = async (req, res) => {
    try {
        const isUserLoggedIn = !!req.user;
        const userId = isUserLoggedIn ? req.user.id : null;

        const {
            itemType, itemId, itemName, startDate, endDate, dropoffCoordinates,
            paymentReference, amountPaid, firstName, lastName, email, phone,
            address, 
            numberOfGuests, specialRequests, agreedToTerms, deliveryMethod,
            pickupLocation, dropoffLocation, totalPrice,
            originalPrice, discountApplied, promotionTitle // Promotion fields
        } = req.body;

        const finalFirstName = isUserLoggedIn ? req.user.firstName : firstName;
        const finalLastName = isUserLoggedIn ? req.user.lastName : lastName;
        const finalEmail = isUserLoggedIn ? req.user.email : email;
        const finalPhone = phone || (isUserLoggedIn ? req.user.phone : '');

        if (!itemType || !itemId || !startDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const item = itemType === 'car' ? await Car.findById(itemId) : await Tour.findById(itemId);
        if (!item || !item.isAvailable) {
            return res.status(400).json({ success: false, message: 'Selected item is not available' });
        }

        let coords = null;
        if (dropoffCoordinates) {
            try {
                coords = typeof dropoffCoordinates === 'string' ? JSON.parse(dropoffCoordinates) : dropoffCoordinates;
            } catch (error) {
                console.error('Invalid dropoff coordinates:', error);
            }
        }

        const newBooking = new Booking({
            user: userId,
            itemType,
            itemId,
            itemName,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : new Date(startDate),
            itemModel: itemType.charAt(0).toUpperCase() + itemType.slice(1),
            paymentProofUrl: req.file ? req.file.path : null,
            dropoffCoordinates: coords,
            paymentReference,
            amountPaid: Number(amountPaid) || 0,
            firstName: finalFirstName,
            lastName: finalLastName,
            email: finalEmail,
            phone: finalPhone,
            address: address,
            numberOfGuests: Number(numberOfGuests) || 1,
            specialRequests,
            agreedToTerms: agreedToTerms === 'true' || agreedToTerms === true,
            deliveryMethod,
            pickupLocation,
            dropoffLocation,
            totalPrice: Number(totalPrice) || 0,
            originalPrice: Number(originalPrice) || null,
            discountApplied: Number(discountApplied) || null,
            promotionTitle: promotionTitle || null
        });

        await newBooking.save();

        if(userId) {
            await User.findByIdAndUpdate(userId, { $push: { bookings: newBooking._id } });
        }

        const io = req.app.get('io');
        if (io) {
            const notificationMessage = `New booking received: ${newBooking.bookingReference}`;
            
            await createNotification(
              io,
              { roles: ['admin', 'employee'], module: 'bookings' },
              notificationMessage,
              { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
        }
        
        try {
            await EmailService.sendBookingConfirmation(newBooking);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
        }

        res.status(201).json({ success: true, data: newBooking });

    } catch (error) {
        console.error('Error creating booking:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
        req.params.id, 
        { status, adminNotes, processedBy: req.user.id },
        { new: true }
    ).populate('user').populate('itemId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const io = req.app.get('io');
    if (io && booking.user) {
      const notificationMessage = `Your booking ${booking.bookingReference} has been ${status}.`;
      
      await createNotification(
        io,
        { user: booking.user._id },
        notificationMessage,
        '/my-bookings',
        req.user.id
      );
    }
    
    try {
        if (status === 'confirmed' || status === 'rejected' || status === 'completed') {
            await EmailService.sendStatusUpdate(booking);
        }
    } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
    }

    if (io) {
        io.to('admin').to('employee').emit('booking-updated', booking);
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', adminNotes, processedBy: req.user.id },
      { new: true }
    ).populate('user').populate('itemId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    const io = req.app.get('io');
    if (io && booking.user) {
       const notificationMessage = `Your booking ${booking.bookingReference} has been cancelled.`;
       await createNotification(
        io,
        { user: booking.user._id },
        notificationMessage,
        '/my-bookings',
        req.user.id
      );
    }

    if (io) {
      io.to('admin').to('employee').emit('booking-cancelled', booking);
    }
    
    try {
        await EmailService.sendBookingCancellation(booking);
    } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
};

// UPLOAD payment proof for a booking
export const uploadPaymentProof = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { paymentProofUrl: req.file.path },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        const io = req.app.get('io');
        if (io) {
            await createNotification(
              io,
              { roles: ['admin', 'employee'], module: 'bookings' },
              `Payment proof uploaded for booking ${booking.bookingReference}`,
              { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
        }
        
        res.json({ success: true, message: 'Payment proof uploaded successfully.', data: booking });

    } catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({ success: false, message: 'Failed to upload payment proof.' });
    }
};