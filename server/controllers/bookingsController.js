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
        { 'payments.paymentReference': searchRegex },
        { 'payments.manualPaymentReference': searchRegex },
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
        res.status(500).json({ success: false, message: 'Failed to fetch your bookings.' });
    }
};

// CREATE a new booking
export const createBooking = async (req, res) => {
    try {
        const isUserLoggedIn = !!req.user;
        const userId = isUserLoggedIn ? req.user.id : null;

        const {
            itemType, itemId, itemName, startDate, endDate, time, dropoffCoordinates,
            paymentReference, manualPaymentReference, amountPaid, paymentOption, firstName, lastName, email, phone,
            address, 
            numberOfGuests, specialRequests, agreedToTerms, deliveryMethod,
            pickupLocation, dropoffLocation, totalPrice,
            originalPrice, discountApplied, promotionTitle // Promotion fields
        } = req.body;

        if (paymentOption === 'downpayment' && !isUserLoggedIn) {
            return res.status(400).json({ success: false, message: 'You must be logged in to choose the downpayment option.' });
        }

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
            time,
            itemModel: itemType.charAt(0).toUpperCase() + itemType.slice(1),
            dropoffCoordinates: coords,
            paymentOption,
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
        
        const paymentData = {
            amount: Number(amountPaid) || 0,
            paymentReference,
            manualPaymentReference,
            paymentProof: req.file ? req.file.path : null,
        };

        newBooking.payments.push(paymentData);
        newBooking.amountPaid = newBooking.payments.reduce((acc, payment) => acc + payment.amount, 0);

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

// Add another payment to a booking
export const addPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, manualPaymentReference } = req.body;
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this booking.' });
        }
        
        const newPayment = {
            amount: Number(amount),
            manualPaymentReference,
            paymentProof: req.file ? req.file.path : null,
        };

        booking.payments.push(newPayment);
        booking.amountPaid = booking.payments.reduce((acc, payment) => acc + payment.amount, 0);

        // Optionally, if the full amount is paid, update status
        if (booking.amountPaid >= booking.totalPrice) {
            // You might want to automatically move it to a different status,
            // or just notify admins to review it.
        }

        await booking.save();

        const io = req.app.get('io');
        if (io) {
            const notificationMessage = `An additional payment was made for booking ${booking.bookingReference}.`;
            await createNotification(
                io,
                { roles: ['admin', 'employee'], module: 'bookings' },
                notificationMessage,
                { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
        }

        res.json({ success: true, data: booking });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ success: false, message: 'Failed to add payment.' });
    }
};


// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;

    if (adminNotes) {
      const newNote = {
        note: adminNotes,
        author: req.user.id,
      };
      if (req.file) {
        newNote.attachment = req.file.path;
        newNote.attachmentOriginalName = req.file.originalname;
      }
      booking.notes.push(newNote);
    }

    await booking.save();
    
    const populatedBooking = await Booking.findById(booking._id).populate('user').populate('itemId');

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
            await EmailService.sendStatusUpdate(populatedBooking);
        }
    } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
    }

    if (io) {
        io.to('admin').to('employee').emit('booking-updated', populatedBooking);
    }

    res.json({ success: true, data: populatedBooking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    
    if (adminNotes) {
      const newNote = {
        note: adminNotes,
        author: req.user.id,
      };
      if (req.file) {
        newNote.attachment = req.file.path;
        newNote.attachmentOriginalName = req.file.originalname;
      }
      booking.notes.push(newNote);
    }
    
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id).populate('user').populate('itemId');
    
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
      io.to('admin').to('employee').emit('booking-cancelled', populatedBooking);
    }
    
    try {
        await EmailService.sendBookingCancellation(populatedBooking);
    } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
    }

    res.json({ success: true, data: populatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
};