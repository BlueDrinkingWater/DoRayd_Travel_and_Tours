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
    // Find confirmed or pending bookings for the item
    const bookings = await Booking.find({
      itemId: serviceId,
      status: { $in: ['confirmed', 'pending', 'fully_paid'] } // Include fully_paid
    }).select('startDate endDate');

    const bookedDates = bookings.reduce((acc, booking) => {
      // Ensure dates are valid before processing
      const startDate = booking.startDate ? new Date(booking.startDate) : null;
      const endDate = booking.endDate ? new Date(booking.endDate) : startDate; // Use start date if end date is missing

      if (!startDate || isNaN(startDate.getTime())) return acc; // Skip invalid entries

      let currentDate = new Date(startDate);
      currentDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC start of day

      const finalEndDate = new Date(endDate);
      finalEndDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC start of day

      // Loop through dates inclusively
      while (currentDate <= finalEndDate) {
        acc.push(currentDate.toISOString().split('T')[0]);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Increment day correctly in UTC
      }
      return acc;
    }, []);

    // Return unique dates
    res.json({ success: true, data: { bookedDates: [...new Set(bookedDates)] } });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching availability.' });
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
            path: 'itemId', // Populate related Car or Tour
            select: 'brand model title' // Select only needed fields
        })
        .populate('user', 'firstName lastName') // Populate user info
        .sort({ createdAt: -1 }); // Sort by creation date descending
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
            .populate('itemId', 'brand model title images') // Populate related item with images
            .sort({ createdAt: -1 });

        // Filter out bookings where the linked item might have been deleted
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
            paymentReference, manualPaymentReference, amountPaid, paymentOption, // System ref + manual ref
            firstName, lastName, email, phone, address, // Address added
            numberOfGuests, specialRequests, agreedToTerms, deliveryMethod,
            pickupLocation, dropoffLocation, totalPrice,
            originalPrice, discountApplied, promotionTitle // Promotion fields
        } = req.body;

        // --- Basic Validations ---
        if (!itemType || !itemId || !startDate || !time || !paymentOption || !totalPrice || !agreedToTerms) {
            return res.status(400).json({ success: false, message: 'Missing required booking details.' });
        }
        if (agreedToTerms !== 'true' && agreedToTerms !== true) {
             return res.status(400).json({ success: false, message: 'You must agree to the terms and conditions.' });
        }
        if (!firstName || !lastName || !email || !phone || !address) {
             return res.status(400).json({ success: false, message: 'Missing required personal information.' });
        }
        if (!amountPaid || !req.file || !(manualPaymentReference || paymentReference)) { // Ensure payment details are present
             return res.status(400).json({ success: false, message: 'Missing required payment details (amount, proof, reference).' });
        }
        if (paymentOption === 'downpayment' && !isUserLoggedIn) {
            return res.status(400).json({ success: false, message: 'You must be logged in to choose the downpayment option.' });
        }

        // --- Fetch Item and Check Availability ---
        const item = itemType === 'car' ? await Car.findById(itemId) : await Tour.findById(itemId);
        if (!item || !item.isAvailable) {
            return res.status(400).json({ success: false, message: 'Selected item is currently unavailable.' });
        }

        // --- Check for Date Conflicts (Simplified Check - more robust check might be needed) ---
        // Basic check for confirmed/pending bookings overlapping the start date
         const conflictingBooking = await Booking.findOne({
           itemId: itemId,
           status: { $in: ['confirmed', 'pending', 'fully_paid'] },
           // Check if the new booking's start date falls within an existing booking's range
           startDate: { $lte: new Date(startDate) },
           endDate: { $gte: new Date(startDate) }
         });

         if (conflictingBooking) {
           return res.status(400).json({ success: false, message: 'Selected start date is unavailable. Please choose another date.' });
         }

        // --- Prepare Booking Data ---
        let coords = null;
        if (dropoffCoordinates) {
            try { coords = typeof dropoffCoordinates === 'string' ? JSON.parse(dropoffCoordinates) : dropoffCoordinates; }
            catch (error) { console.warn('Invalid dropoff coordinates format.'); }
        }

        // Use user details if logged in, otherwise use form data
        const finalFirstName = isUserLoggedIn ? req.user.firstName : firstName;
        const finalLastName = isUserLoggedIn ? req.user.lastName : lastName;
        const finalEmail = isUserLoggedIn ? req.user.email : email;
        const finalPhone = phone || (isUserLoggedIn ? req.user.phone : '');
        const finalAddress = address || (isUserLoggedIn ? req.user.address : ''); // Use provided address or user's address


        const newBooking = new Booking({
            user: userId,
            itemType,
            itemId,
            itemName, // Make sure this is passed correctly (e.g., "Toyota Vios" or "El Nido Tour")
            startDate: new Date(startDate), // Ensure date conversion
            endDate: endDate ? new Date(endDate) : new Date(startDate), // Ensure date conversion
            time,
            itemModel: itemType.charAt(0).toUpperCase() + itemType.slice(1),
            dropoffCoordinates: coords,
            paymentOption,
            firstName: finalFirstName,
            lastName: finalLastName,
            email: finalEmail,
            phone: finalPhone,
            address: finalAddress, // Save address
            numberOfGuests: Number(numberOfGuests) || (itemType === 'tour' ? 1 : null), // Default guests for tours
            specialRequests,
            agreedToTerms: true, // Already validated above
            deliveryMethod: itemType === 'car' ? deliveryMethod : undefined, // Only for cars
            pickupLocation: itemType === 'car' && deliveryMethod === 'pickup' ? pickupLocation : undefined,
            dropoffLocation: itemType === 'car' && deliveryMethod === 'dropoff' ? dropoffLocation : undefined,
            totalPrice: Number(totalPrice) || 0,
            originalPrice: Number(originalPrice) || null,
            discountApplied: Number(discountApplied) || null,
            promotionTitle: promotionTitle || null,
            // pendingExpiresAt is set by default in the model
        });

        // Add initial payment
        const paymentData = {
            amount: Number(amountPaid) || 0,
            paymentReference, // System generated ref
            manualPaymentReference: manualPaymentReference || null, // User provided ref
            paymentProof: req.file ? req.file.path : null, // Cloudinary path
        };
        newBooking.payments.push(paymentData);
        newBooking.amountPaid = newBooking.payments.reduce((acc, payment) => acc + payment.amount, 0);

        // --- Save Booking and Update User ---
        await newBooking.save();

        if(userId) {
            await User.findByIdAndUpdate(userId, { $push: { bookings: newBooking._id } });
        }

        // --- Notifications ---
        const io = req.app.get('io');
        if (io) {
            const notificationMessage = `New booking received: ${newBooking.bookingReference} for ${newBooking.itemName}`;
            await createNotification(
              io,
              { roles: ['admin', 'employee'], module: 'bookings' }, // Target admins and employees with booking permissions
              notificationMessage,
              { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' } // Links for different roles
            );
        }

        // --- Confirmation Email ---
        try {
            await EmailService.sendBookingConfirmation(newBooking);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError.message);
            // Don't fail the whole booking if email fails, but log it
        }

        res.status(201).json({ success: true, data: newBooking });

    } catch (error) {
        console.error('Error creating booking:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: `Validation Error: ${error.message}` });
        }
        res.status(500).json({ success: false, message: 'An internal server error occurred during booking creation.' });
    }
};

// Add another payment to a booking (typically the remaining balance)
export const addPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, manualPaymentReference } = req.body;
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Ensure the logged-in user owns this booking
        if (!booking.user || booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You are not authorized to add payment to this booking.' });
        }

        // Only allow adding payment to 'confirmed' downpayment bookings
        if (booking.status !== 'confirmed' || booking.paymentOption !== 'downpayment') {
            return res.status(403).json({ success: false, message: 'You can only add payments to confirmed downpayment bookings.' });
        }

        const remainingBalance = booking.totalPrice - booking.amountPaid;

        if (!amount || !req.file || !manualPaymentReference) {
            return res.status(400).json({ success: false, message: 'Amount, payment proof, and bank reference number are required.' });
        }

        const paymentAmount = Number(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
        }

        // Optionally, enforce paying the exact remaining balance
        if (paymentAmount !== remainingBalance) {
           console.warn(`Payment amount ${paymentAmount} does not match remaining balance ${remainingBalance} for booking ${booking.bookingReference}. Allowing partial payment.`);
           // If strict balance payment is required, return error here:
           // return res.status(400).json({ success: false, message: `Payment amount must be exactly the remaining balance of ${remainingBalance.toFixed(2)}.` });
        }

        const newPayment = {
            amount: paymentAmount,
            manualPaymentReference,
            paymentProof: req.file.path, // Cloudinary path
            paymentReference: `PAY-${Date.now().toString(36).toUpperCase()}` // Simple unique ID for this payment
        };

        booking.payments.push(newPayment);
        booking.amountPaid = booking.payments.reduce((acc, payment) => acc + payment.amount, 0);

        // **MODIFIED:** Update status to fully_paid if applicable
        if (booking.amountPaid >= booking.totalPrice) {
            booking.status = 'fully_paid';
            booking.paymentDueDate = undefined; // Clear due date once fully paid
        }

        await booking.save();

        // Notify Admins/Employees
        const io = req.app.get('io');
        if (io) {
            const notificationMessage = `Balance payment received for booking ${booking.bookingReference}. New status: ${booking.status}.`;
            await createNotification(
                io,
                { roles: ['admin', 'employee'], module: 'bookings' },
                notificationMessage,
                { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
        }

        res.json({ success: true, data: booking, message: 'Payment added successfully.' });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ success: false, message: 'Failed to add payment.' });
    }
};


// Update booking status (Admin/Employee action)
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, adminNotes, paymentDueDuration, paymentDueUnit } = req.body; // Added duration and unit
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const previousStatus = booking.status; // Store previous status

    // **MODIFIED:** Handle payment due date setting
    if (status === 'confirmed' && booking.paymentOption === 'downpayment') {
      if (paymentDueDuration && paymentDueUnit) {
          const duration = parseInt(paymentDueDuration, 10);
          if (!isNaN(duration) && duration > 0) {
              const now = new Date();
              if (paymentDueUnit === 'days') {
                  now.setDate(now.getDate() + duration);
              } else { // Default to hours
                  now.setHours(now.getHours() + duration);
              }
              booking.paymentDueDate = now;
              console.log(`Payment due date set for booking ${booking.bookingReference}: ${booking.paymentDueDate}`);
          } else {
             console.warn(`Invalid payment due duration received: ${paymentDueDuration} ${paymentDueUnit} for booking ${booking.bookingReference}`);
          }
      } else {
        console.warn(`Missing payment due duration/unit for confirming downpayment booking ${booking.bookingReference}`);
        // Optionally return an error if due date is mandatory for confirmation
        // return res.status(400).json({ success: false, message: 'Payment due duration and unit are required for confirming downpayment bookings.' });
      }
       // Remove pending expiration when confirmed
       booking.pendingExpiresAt = undefined;
    }

    // **MODIFIED:** Clear paymentDueDate if status changes from confirmed (e.g., to completed, cancelled, rejected)
    if (previousStatus === 'confirmed' && status !== 'confirmed') {
        booking.paymentDueDate = undefined;
    }
    // Also clear if moving directly to fully_paid or completed
    if (status === 'fully_paid' || status === 'completed') {
        booking.paymentDueDate = undefined;
        booking.pendingExpiresAt = undefined; // Also clear pending expiry
    }

    booking.status = status;

    // Add admin note if provided
    if (adminNotes) {
      const newNote = {
        note: adminNotes.trim(),
        author: req.user.id, // Link note to the admin/employee user
        date: new Date(),
      };
      // Add attachment info if a file was uploaded
      if (req.file) {
        newNote.attachment = req.file.path; // Cloudinary path
        newNote.attachmentOriginalName = req.file.originalname;
      }
      booking.notes.push(newNote);
    }

    await booking.save();

    // Populate necessary fields for notifications/emails
    const populatedBooking = await Booking.findById(booking._id)
                                    .populate('user', 'firstName email') // Populate user for email/notification
                                    .populate('itemId', 'brand model title'); // Populate item details

    // --- Notifications ---
    const io = req.app.get('io');
    // Notify customer
    if (io && populatedBooking.user) {
      const customerMessage = `Your booking ${populatedBooking.bookingReference} status updated to: ${status}. ${adminNotes ? 'Note: ' + adminNotes : ''}`;
      await createNotification(
        io,
        { user: populatedBooking.user._id }, // Target specific user
        customerMessage,
        '/my-bookings', // Link for customer
        req.user.id // Exclude the admin making the change
      );
    }
    // Notify other admins/employees
    if (io) {
      const adminMessage = `Booking ${populatedBooking.bookingReference} status changed to ${status} by ${req.user.firstName}.`;
        await createNotification(
            io,
            { roles: ['admin', 'employee'], module: 'bookings' },
            adminMessage,
            { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' },
            req.user.id // Exclude self
        );
        // Emit general update event for admin/employee dashboards
        io.to('admin').to('employee').emit('booking-updated', populatedBooking);
    }

    // --- Status Update Email ---
    try {
        // Send email for significant status changes
        if (['confirmed', 'rejected', 'completed', 'cancelled', 'fully_paid'].includes(status)) {
            await EmailService.sendStatusUpdate(populatedBooking); // Assumes sendStatusUpdate handles different statuses
        }
    } catch (emailError) {
        console.error(`Failed to send status update email for booking ${populatedBooking.bookingReference}:`, emailError.message);
        // Log error but don't fail the request
    }

    res.json({ success: true, data: populatedBooking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: `Failed to update status: ${error.message}` });
  }
};

// Cancel a booking (Admin/Employee action)
export const cancelBooking = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Optional: Add checks here if certain statuses shouldn't be cancelled (e.g., 'completed')
    // if (booking.status === 'completed') {
    //   return res.status(400).json({ success: false, message: 'Cannot cancel a completed booking.' });
    // }

    booking.status = 'cancelled';
    booking.paymentDueDate = undefined; // Clear payment due date on cancellation
    booking.pendingExpiresAt = undefined; // Clear pending expiry on cancellation

    // Add cancellation reason/note
    if (adminNotes) {
      const newNote = {
        note: `Cancellation reason: ${adminNotes.trim()}`,
        author: req.user.id, // Link note to the admin/employee user
        date: new Date(),
      };
      // Add attachment info if provided
      if (req.file) {
        newNote.attachment = req.file.path;
        newNote.attachmentOriginalName = req.file.originalname;
      }
      booking.notes.push(newNote);
    } else {
        // Add a default note if none provided
         booking.notes.push({
            note: 'Booking cancelled by staff.',
            author: req.user.id,
            date: new Date(),
         });
    }

    await booking.save();

    // Populate necessary fields for notifications/emails
    const populatedBooking = await Booking.findById(booking._id)
                                    .populate('user', 'firstName email')
                                    .populate('itemId', 'brand model title');

    // --- Notifications ---
    const io = req.app.get('io');
    // Notify customer
    if (io && populatedBooking.user) {
       const customerMessage = `Your booking ${populatedBooking.bookingReference} has been cancelled. ${adminNotes ? 'Reason: ' + adminNotes : ''}`;
       await createNotification(
        io,
        { user: populatedBooking.user._id }, // Target specific user
        customerMessage,
        '/my-bookings', // Link for customer
        req.user.id // Exclude the admin making the change
      );
    }
     // Notify other admins/employees
    if (io) {
        const adminMessage = `Booking ${populatedBooking.bookingReference} was cancelled by ${req.user.firstName}.`;
        await createNotification(
            io,
            { roles: ['admin', 'employee'], module: 'bookings' },
            adminMessage,
            { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' },
            req.user.id // Exclude self
        );
      // Emit general update event for admin/employee dashboards
      io.to('admin').to('employee').emit('booking-cancelled', populatedBooking); // Or use 'booking-updated'
    }

    // --- Cancellation Email ---
    try {
        await EmailService.sendBookingCancellation(populatedBooking);
    } catch (emailError) {
        console.error(`Failed to send cancellation email for booking ${populatedBooking.bookingReference}:`, emailError.message);
        // Log error but don't fail the request
    }

    res.json({ success: true, data: populatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: `Failed to cancel booking: ${error.message}` });
  }
};