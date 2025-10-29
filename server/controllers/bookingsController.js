// server/controllers/bookingsController.js

import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import TransportService from '../models/TransportService.js'; // Ensure this is imported
import User from '../models/User.js';
import EmailService from '../utils/emailServices.js';
import { createNotification } from './notificationController.js';
// *** ADDED: Import createActivityLog ***
import { createActivityLog } from './activityLogController.js';


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
      // *** MODIFIED: Use startDate if endDate is invalid or missing ***
      const endDate = booking.endDate && !isNaN(new Date(booking.endDate)) ? new Date(booking.endDate) : startDate;

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
    const { search, status, itemType, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query; // Added itemType, pagination, sorting
    const query = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    if (status && status !== 'all') {
      query.status = status;
    }

    if (itemType) { // Filter by itemType if provided
        query.itemType = itemType;
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
            path: 'itemId', // Populate related Car, Tour, or TransportService
            select: 'brand model title vehicleType name' // Select potentially relevant fields
        })
        .populate('user', 'firstName lastName') // Populate user info
        .sort({ [sort]: sortOrder }) // Apply dynamic sorting
        .skip(skip)
        .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(query); // Count documents matching the query

    res.json({
        success: true,
        data: { bookings, totalBookings } // Return bookings and total count
     });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get bookings for the currently authenticated user
export const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate('itemId', 'brand model title images vehicleType name capacity') // Populate related item
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
            itemType, itemId, itemName, startDate, endDate, time, dropoffCoordinates, pickupCoordinates, // *** FIX: ADDED pickupCoordinates HERE ***
            paymentReference, manualPaymentReference, amountPaid, paymentOption,
            firstName, lastName, email, phone, address,
            numberOfGuests, specialRequests, agreedToTerms, deliveryMethod,
            pickupLocation, dropoffLocation, totalPrice,
            originalPrice, discountApplied, promotionTitle,
            transportDestination, transportServiceType
        } = req.body;

        // --- Basic Validations ---
        if (!itemType || !itemId || !startDate || !time || !paymentOption || !agreedToTerms) {
            return res.status(400).json({ success: false, message: 'Missing required booking details.' });
        }
        // Client-sent totalPrice is now required for ALL bookings
        if (totalPrice === undefined || totalPrice === null) {
            return res.status(400).json({ success: false, message: 'Total price is required.' });
        }
        if (agreedToTerms !== 'true' && agreedToTerms !== true) {
             return res.status(400).json({ success: false, message: 'You must agree to the terms and conditions.' });
        }
        if (!firstName || !lastName || !email || !phone || !address) {
             return res.status(400).json({ success: false, message: 'Missing required personal information.' });
        }
        // *** MODIFIED: Payment validation now applies to ALL item types ***
        if (!amountPaid || !req.file || !(manualPaymentReference || paymentReference)) {
             return res.status(400).json({ success: false, message: 'Missing required payment details (amount, proof, reference).' });
        }
        if (paymentOption === 'downpayment' && !isUserLoggedIn) {
            return res.status(400).json({ success: false, message: 'You must be logged in to choose the downpayment option.' });
        }
        // Ensure guests for tour/transport
        if ((itemType === 'tour' || itemType === 'transport') && (!numberOfGuests || Number(numberOfGuests) < 1)) {
            return res.status(400).json({ success: false, message: 'Number of guests/passengers is required.' });
        }
        // *** ADDED: Transport field validation ***
        if (itemType === 'transport' && (!transportDestination || !transportServiceType)) {
             return res.status(400).json({ success: false, message: 'Destination and Service Type are required for transport.' });
        }


        // --- Fetch Item and Check Availability ---
        let item;
        let itemModelName;
        if (itemType === 'car') {
            item = await Car.findById(itemId);
            itemModelName = 'Car';
        } else if (itemType === 'tour') {
            item = await Tour.findById(itemId);
            itemModelName = 'Tour';
        } else if (itemType === 'transport') {
            item = await TransportService.findById(itemId);
            itemModelName = 'TransportService';
        } else {
             return res.status(400).json({ success: false, message: 'Invalid item type specified.' });
        }

        if (!item || !item.isAvailable) {
            return res.status(400).json({ success: false, message: 'Selected item is currently unavailable.' });
        }

        const newStartDate = new Date(startDate);
        const newEndDate = endDate ? new Date(endDate) : newStartDate;

        // --- Check for Date Conflicts (Improved Check) ---
        const conflictingBooking = await Booking.findOne({
          itemId: itemId,
          status: { $in: ['confirmed', 'pending', 'fully_paid'] },
          // Check for overlap: existing starts before new ends AND existing ends after new starts
          startDate: { $lt: newEndDate },
          endDate: { $gt: newStartDate }
        });

         if (conflictingBooking) {
           return res.status(400).json({ success: false, message: 'Selected dates conflict with an existing booking. Please choose different dates.' });
         }

        // *** MODIFIED: SERVER-SIDE PRICE CALCULATION & VALIDATION (Security Fix) ***
        let serverCalculatedPrice = 0;
        let serverNumberOfDays = 0;

        if (itemType === 'car') {
            const start = new Date(newStartDate);
            const end = new Date(newEndDate);
            if (end > start) {
                const diffTime = Math.abs(end - start);
                serverNumberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                serverNumberOfDays = 1;
            }
            // Use pricePerDay from the fetched item
            serverCalculatedPrice = item.pricePerDay * serverNumberOfDays;
        } else if (itemType === 'tour') {
            // Use price from the fetched item
            serverCalculatedPrice = item.price * (Number(numberOfGuests) || 1);
        } else if (itemType === 'transport') {
            // *** ADDED: Server-side price calculation for transport ***
            if (item.pricing && transportDestination && transportServiceType) {
                const priceRule = item.pricing.find(p => p.destination === transportDestination);
                if (priceRule) {
                    switch (transportServiceType) {
                        case 'Day Tour': serverCalculatedPrice = priceRule.dayTourPrice || 0; break;
                        case 'Overnight': serverCalculatedPrice = priceRule.ovnPrice || 0; break;
                        case '3D2N': serverCalculatedPrice = priceRule.threeDayTwoNightPrice || 0; break;
                        case 'Drop & Pick': serverCalculatedPrice = priceRule.dropAndPickPrice || 0; break;
                        default: serverCalculatedPrice = 0;
                    }
                }
            }
            if (serverCalculatedPrice <= 0) {
                 return res.status(400).json({ success: false, message: 'Could not determine price. Invalid destination or service type.' });
            }
            // *** END OF ADDED transport price logic ***
        }

        // *** MODIFIED: Price Validation (applies to ALL types) ***
        let finalPrice = 0;

        if (promotionTitle && originalPrice !== undefined && discountApplied !== undefined) {
            // A promotion is being applied by the client
            const clientOriginalPrice = Number(originalPrice);
            const clientDiscount = Number(discountApplied);
            const clientTotalPrice = Number(totalPrice);

            // 1. Verify the client's 'originalPrice' matches the server-calculated price
            if (Math.abs(serverCalculatedPrice - clientOriginalPrice) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Price mismatch. Server-calculated base price (${serverCalculatedPrice}) does not match reported original price (${clientOriginalPrice}).`
                });
            }

            // 2. Verify the client's math
            if (Math.abs(clientOriginalPrice - clientDiscount - clientTotalPrice) > 0.01) {
                return res.status(400).json({ success: false, message: 'Promotion calculation error. Client math is incorrect.' });
            }

            // If both checks pass, trust the client's final discounted price
            finalPrice = clientTotalPrice;
        } else {
            // No promotion, just use the server's calculated price
            finalPrice = serverCalculatedPrice;

            // 3. Verify the client's 'totalPrice' matches the server-calculated price
            if (Math.abs(Number(totalPrice) - finalPrice) > 0.01) {
                 return res.status(400).json({
                    success: false,
                    message: `Price mismatch. Client price (${totalPrice}) does not match server-calculated price (${finalPrice}).`
                });
            }
        }
        // *** END OF SERVER-SIDE PRICE CALCULATION ***

        // --- Prepare Booking Data ---
        let coords = null;
        if (dropoffCoordinates) {
            try { coords = typeof dropoffCoordinates === 'string' ? JSON.parse(dropoffCoordinates) : dropoffCoordinates; }
            catch (error) { console.warn('Invalid dropoff coordinates format.'); }
        }

        let pickupCoords = null;
        if (pickupCoordinates) {
            try { pickupCoords = typeof pickupCoordinates === 'string' ? JSON.parse(pickupCoordinates) : pickupCoordinates; }
            catch (error) { console.warn('Invalid pickup coordinates format.'); }
        }

        const finalFirstName = isUserLoggedIn ? req.user.firstName : firstName;
        const finalLastName = isUserLoggedIn ? req.user.lastName : lastName;
        const finalEmail = isUserLoggedIn ? req.user.email : email;
        const finalPhone = phone || (isUserLoggedIn ? req.user.phone : '');
        const finalAddress = address || (isUserLoggedIn ? req.user.address : '');

        const newBooking = new Booking({
            user: userId,
            itemType,
            itemId,
            itemName: itemName || (itemType === 'car' ? `${item.brand} ${item.model}` : item.title || item.vehicleType),
            startDate: newStartDate,
            endDate: newEndDate,
            time,
            itemModel: itemModelName,
            dropoffCoordinates: coords,
            pickupCoordinates: pickupCoords, // ADDED
            paymentOption,
            firstName: finalFirstName,
            lastName: finalLastName,
            email: finalEmail,
            phone: finalPhone,
            address: finalAddress,
            numberOfGuests: (itemType === 'tour' || itemType === 'transport') ? Number(numberOfGuests) : undefined,
            specialRequests: specialRequests,
            agreedToTerms: true,
            deliveryMethod: itemType === 'car' ? deliveryMethod : undefined,
            pickupLocation: itemType === 'car' && deliveryMethod === 'pickup' ? pickupLocation : undefined,
            dropoffLocation: itemType === 'car' && deliveryMethod === 'dropoff' ? dropoffLocation : undefined,

            // *** MODIFIED: Use server-validated price and direct transport data ***
            totalPrice: finalPrice,
            numberOfDays: itemType === 'car' ? serverNumberOfDays : undefined,
            transportDestination: itemType === 'transport' ? transportDestination : undefined,
            transportServiceType: itemType === 'transport' ? transportServiceType : undefined,
            // *** END OF MODIFIED fields ***

            originalPrice: Number(originalPrice) || null,
            discountApplied: Number(discountApplied) || null,
            promotionTitle: promotionTitle || null,
        });

        // Add initial payment (now applies to all types)
        if (Number(amountPaid) > 0 && req.file && (manualPaymentReference || paymentReference)) {
            const paymentData = {
                amount: Number(amountPaid),
                paymentReference: paymentReference || `PAY-${Date.now().toString(36).toUpperCase()}`, // Generate if missing
                manualPaymentReference: manualPaymentReference || null,
                paymentProof: req.file.filename,
            };
            newBooking.payments.push(paymentData);
            newBooking.amountPaid = newBooking.payments.reduce((acc, payment) => acc + payment.amount, 0);
        } else {
             // This case should be blocked by validation, but as a fallback:
             newBooking.amountPaid = 0;
             if (itemType !== 'transport') { // Keep transport quote logic as fallback? No, validation blocks it.
                console.warn("Booking created with 0 amountPaid, but was not a transport quote. This shouldn't happen.");
             }
        }


        // --- Save Booking and Update User ---
        // Note: The pre-save hook in Booking.js now handles all timer logic
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
              { roles: ['admin', 'employee'], module: 'bookings' },
              notificationMessage,
              { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
            io.to('admin').to('employee').emit('new-booking', newBooking); // Emit specific event
        }

        // --- Confirmation Email ---
        try {
            await EmailService.sendBookingConfirmation(newBooking);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError.message);
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

// Add another payment to a booking
export const addPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, manualPaymentReference } = req.body;
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (!booking.user || booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You are not authorized to add payment to this booking.' });
        }

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

        // Use Math.abs for comparison with a small tolerance for floating point issues
        if (Math.abs(paymentAmount - remainingBalance) > 0.01) {
             console.warn(`Payment amount ${paymentAmount} does not exactly match remaining balance ${remainingBalance} for booking ${booking.bookingReference}. Proceeding.`);
        }

        const newPayment = {
            amount: paymentAmount,
            manualPaymentReference,
            paymentProof: req.file.filename,
            paymentReference: `PAY-${Date.now().toString(36).toUpperCase()}`
        };

        booking.payments.push(newPayment);
        booking.amountPaid = booking.payments.reduce((acc, payment) => acc + payment.amount, 0);

        if (booking.amountPaid >= booking.totalPrice) {
            booking.status = 'fully_paid';
            booking.paymentDueDate = undefined;
        }

        await booking.save();

        const io = req.app.get('io');
        if (io) {
            const notificationMessage = `Balance payment received for booking ${booking.bookingReference}. New status: ${booking.status}.`;
            await createNotification(
                io,
                { roles: ['admin', 'employee'], module: 'bookings' },
                notificationMessage,
                { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' }
            );
            io.to('admin').to('employee').emit('booking-updated', booking);
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
    // *** MODIFIED: Removed newTotalPrice from destructuring ***
    const { status, adminNotes, paymentDueDuration, paymentDueUnit } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const previousStatus = booking.status;

    // *** REMOVED: Logic to update transport price. Price is now set on creation. ***
    // The admin's job is to confirm the payment, not set the price.

    // Handle payment due date setting
    if (status === 'confirmed') {
      if (booking.paymentOption === 'downpayment') {
        if (paymentDueDuration && paymentDueUnit) {
            const duration = parseInt(paymentDueDuration, 10);
            if (!isNaN(duration) && duration > 0) {
                const now = new Date();
                if (paymentDueUnit === 'days') {
                    now.setDate(now.getDate() + duration);
                } else {
                    now.setHours(now.getHours() + duration);
                }
                booking.paymentDueDate = now;
                console.log(`Payment due date set for booking ${booking.bookingReference}: ${booking.paymentDueDate}`);
            } else {
               console.warn(`Invalid payment due duration received: ${paymentDueDuration} ${paymentDueUnit} for booking ${booking.bookingReference}`);
            }
        } else {
          console.warn(`Missing payment due duration/unit for confirming downpayment booking ${booking.bookingReference}`);
        }
      }
       booking.pendingExpiresAt = undefined; // Remove pending expiration
       booking.adminConfirmationDueDate = undefined; // *** ADDED: Clear admin timer on confirmation ***
    }

    // Clear paymentDueDate if status changes from confirmed or moves to final states
    if (previousStatus === 'confirmed' && status !== 'confirmed') {
        booking.paymentDueDate = undefined;
    }
    if (status === 'fully_paid' || status === 'completed' || status === 'cancelled' || status === 'rejected') {
        booking.paymentDueDate = undefined;
        booking.pendingExpiresAt = undefined;
        booking.adminConfirmationDueDate = undefined; // *** ADDED: Clear admin timer on final states ***
    }

    booking.status = status;

    if (adminNotes || req.file) { // Add note if text or attachment exists
      const newNote = {
        note: adminNotes ? adminNotes.trim() : 'Attachment added.', // Default note if only file
        author: req.user.id,
        date: new Date(),
      };
      if (req.file) {
        newNote.attachment = req.file.filename;
        newNote.attachmentOriginalName = req.file.originalname;
      }
      booking.notes.push(newNote);
    }

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
                                    .populate('user', 'firstName email')
                                    .populate('itemId', 'brand model title vehicleType name');

    const io = req.app.get('io');

    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'UPDATE_BOOKING_STATUS', `Booking ${populatedBooking.bookingReference} status changed to ${status}`, '/owner/manage-bookings');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    if (io && populatedBooking.user) {
      const customerMessage = `Your booking ${populatedBooking.bookingReference} status updated to: ${status}. ${adminNotes ? 'Note: ' + adminNotes : ''}`;
      await createNotification(
        io,
        { user: populatedBooking.user._id },
        customerMessage,
        '/my-bookings',
        req.user.id
      );
    }
    if (io) {
      const adminMessage = `Booking ${populatedBooking.bookingReference} status changed to ${status} by ${req.user.firstName}.`;
        await createNotification(
            io,
            { roles: ['admin', 'employee'], module: 'bookings' },
            adminMessage,
            { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' },
            req.user.id
        );
        io.to('admin').to('employee').emit('booking-updated', populatedBooking);
    }

    try {
        if (['confirmed', 'rejected', 'completed', 'cancelled', 'fully_paid'].includes(status)) {
            // *** MODIFIED: Email logic ***
            // We no longer send a "Quote" email. All bookings get a status update.
            await EmailService.sendStatusUpdate(populatedBooking);
        }
    } catch (emailError) {
        console.error(`Failed to send status update email for booking ${populatedBooking.bookingReference}:`, emailError.message);
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

    booking.status = 'cancelled';
    booking.paymentDueDate = undefined;
    booking.pendingExpiresAt = undefined;
    booking.adminConfirmationDueDate = undefined; // *** ADDED: Clear admin timer on cancellation ***

    const noteText = adminNotes ? `Cancellation reason: ${adminNotes.trim()}` : 'Booking cancelled by staff.';
    const newNote = {
      note: noteText,
      author: req.user.id,
      date: new Date(),
    };
    if (req.file) {
      newNote.attachment = req.file.filename;
      newNote.attachmentOriginalName = req.file.originalname;
    }
    booking.notes.push(newNote);

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
                                    .populate('user', 'firstName email')
                                    .populate('itemId', 'brand model title vehicleType name');

    const io = req.app.get('io');

    // *** MODIFIED: Added check for req.user.role before logging ***
    if (io && req.user && req.user.role === 'employee') {
        const newLog = await createActivityLog(req.user.id, 'CANCEL_BOOKING', `Cancelled booking ${populatedBooking.bookingReference}`, '/owner/manage-bookings');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    if (io && populatedBooking.user) {
       const customerMessage = `Your booking ${populatedBooking.bookingReference} has been cancelled. ${adminNotes ? 'Reason: ' + adminNotes : ''}`;
       await createNotification(
        io,
        { user: populatedBooking.user._id },
        customerMessage,
        '/my-bookings',
        req.user.id
      );
    }
    if (io) {
        const adminMessage = `Booking ${populatedBooking.bookingReference} was cancelled by ${req.user.firstName}.`;
        await createNotification(
            io,
            { roles: ['admin', 'employee'], module: 'bookings' },
            adminMessage,
            { admin: '/owner/manage-bookings', employee: '/employee/manage-bookings' },
            req.user.id
        );
      io.to('admin').to('employee').emit('booking-updated', populatedBooking); // Use booking-updated for consistency
    }

    try {
        await EmailService.sendBookingCancellation(populatedBooking);
    } catch (emailError) {
        console.error(`Failed to send cancellation email for booking ${populatedBooking.bookingReference}:`, emailError.message);
    }

    res.json({ success: true, data: populatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: `Failed to cancel booking: ${error.message}` });
  }
};