import RefundRequest from '../models/RefundRequest.js';
import Booking from '../models/Booking.js';
import EmailService from '../utils/emailServices.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

const calculateRefund = (booking) => {
  const now = new Date();
  const startDate = new Date(booking.startDate);
  const daysDifference = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDifference >= 7) {
    // Full refund
    return {
      policy: 'full',
      amount: booking.totalPrice,
    };
  } else if (daysDifference >= 0) {
    // Half refund (6 days or less, but before the date)
    return {
      policy: 'half',
      amount: booking.totalPrice / 2,
    };
  } else {
    // No refund (request is after the booking date has passed)
    return {
      policy: 'none',
      amount: 0,
    };
  }
};

/**
 * @desc    Create a new refund request
 * @route   POST /api/refunds
 * @access  Public
 */
export const createRefundRequest = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      reason,
      bookingReference,
    } = req.body;

    if (!name || !email || !phone || !reason || !bookingReference) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    // 1. Find the booking
    const booking = await Booking.findOne({ bookingReference: bookingReference.trim() });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking Reference Number not found.' });
    }
    // 2. Check for existing refund request
    const existingRequest = await RefundRequest.findOne({ booking: booking._id });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'A refund request for this booking already exists.' });
    }
    // 3. Check booking status (e.g., can't refund a 'completed' or 'cancelled' booking)
    if (['completed', 'cancelled', 'rejected'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: `Cannot request refund for a booking with status: ${booking.status}` });
    }

    // 4. Calculate refund amount based on policy
    const { policy, amount } = calculateRefund(booking);

    // 5. Create the refund request
    const newRefundRequest = new RefundRequest({
      booking: booking._id,
      bookingReference: booking.bookingReference,
      user: booking.user || null, 
      itemType: booking.itemType,
      itemName: booking.itemName,
      bookingStartDate: booking.startDate,
      
      submitterName: name,
      submitterEmail: email,
      submitterPhone: phone,
      
      reason: reason,
      status: 'pending',
      
      bookingTotalPrice: booking.totalPrice,
      refundPolicy: policy,
      calculatedRefundAmount: amount,
    });

    await newRefundRequest.save();

    // 6. Notify admin
    const io = req.app.get('io');
    if (io) {
      const notificationMessage = `New refund request submitted for ${booking.bookingReference}.`;
      await createNotification(
        io,
        { roles: ['admin', 'employee'], module: 'refunds' },
        notificationMessage,
        { admin: '/owner/manage-refunds', employee: '/employee/manage-refunds' }
      );
    }

    res.status(201).json({ 
        success: true, 
        message: 'Refund request submitted successfully.',
        data: {
            policy: policy,
            amount: amount
        }
    });

  } catch (error) {
    console.error('Error creating refund request:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/**
 * @desc    Get all refund requests (for admin/employee)
 * @route   GET /api/refunds
 * @access  Admin/Employee (Protected)
 */
export const getAllRefundRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { bookingReference: searchRegex },
        { submitterName: searchRegex },
        { submitterEmail: searchRegex },
        { itemName: searchRegex },
      ];
    }

    const requests = await RefundRequest.find(query)
      .populate('user', 'firstName lastName')
      .populate('booking', 'status')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Update a refund request status (for admin/employee)
 * @route   PUT /api/refunds/:id/status
 * @access  Admin/Employee (Protected)
 */
export const updateRefundStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const refundRequest = await RefundRequest.findById(id).populate('user'); 
    if (!refundRequest) {
      return res.status(404).json({ success: false, message: 'Refund request not found.' });
    }

    // 1. Update status
    refundRequest.status = status;

    // 2. Add note
    const newNote = {
      note: adminNotes || `Status updated to ${status}`,
      author: req.user.id,
      date: new Date(),
    };

    if (req.file) {
      newNote.attachment = req.file.filename; 
      newNote.attachmentOriginalName = req.file.originalname;
    }
    refundRequest.notes.push(newNote);

    await refundRequest.save();

    // 4. If status is 'approved' or 'declined', also cancel the original booking
    if (status === 'approved' || status === 'declined') {
        await Booking.findByIdAndUpdate(refundRequest.booking, {
            status: 'cancelled',
            $push: {
                notes: {
                    note: `Booking cancelled due to refund request status: ${status}. Reason: ${adminNotes || 'N/A'}`,
                    author: req.user.id,
                    date: new Date()
                }
            }
        });
    }
    // 5. Send notification email
    try {
      await EmailService.sendRefundStatusUpdate(refundRequest, newNote);
    } catch (emailError) {
      console.error(`Failed to send refund status email for ${refundRequest.bookingReference}:`, emailError.message);
    }
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
      const newLog = await createActivityLog(
        req.user.id,
        'UPDATE_REFUND_STATUS',
        `Refund ${refundRequest.bookingReference} status set to ${status}`,
        '/owner/manage-refunds'
      );
      if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    
    if (io && refundRequest.user) { 
      let notificationMessage = '';
      
      switch (status) {
        case 'approved':
          notificationMessage = `Your refund request for ${refundRequest.bookingReference} has been approved.`;
          break;
        case 'declined':
          notificationMessage = `Your refund request for ${refundRequest.bookingReference} has been declined. See notes for details.`;
          break;
        case 'confirmed':
          notificationMessage = `Your refund for ${refundRequest.bookingReference} has been processed and sent.`;
          break;
        default:
          break;
      }

      if (notificationMessage) {
        await createNotification(
          io,
          { userId: refundRequest.user._id.toString() }, 
          notificationMessage,
          { customer: '/my-bookings' } 
        );
      }
    }

    res.json({ success: true, data: refundRequest });
  } catch (error) {
    console.error('Error updating refund status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};