import Feedback from '../models/Feedback.js';
// ... existing code ...
import Booking from '../models/Booking.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

// Create new feedback
export const createFeedback = async (req, res) => {
    try {
        const { bookingId, rating, comment, isAnonymous } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
// ... existing code ...
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'You can only provide feedback for completed bookings.' });
        }
        if (!booking.user || booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only provide feedback for your own bookings.' });
        }

        const existingFeedback = await Feedback.findOne({ booking: bookingId });
// ... existing code ...
        if (existingFeedback) {
            return res.status(400).json({ success: false, message: 'You have already provided feedback for this booking.' });
        }

        const feedback = new Feedback({
            user: req.user.id,
            booking: bookingId,
            rating,
            comment,
            isAnonymous: isAnonymous || false,
            serviceType: booking.itemType,
            image: req.file ? req.file.path : undefined // Use Cloudinary URL
        });

        await feedback.save();

        const io = req.app.get('io');
// ... existing code ...
        if (io) {
            const notification = {
                message: 'New feedback has been submitted for approval.',
                linkMap: {
                  admin: '/owner/manage-feedback',
                  employee: '/employee/manage-feedback'
                },
                feedback
            };
            io.to('admin').to('employee').emit('new-feedback', notification);
            await createNotification(
              { roles: ['admin', 'employee'], module: 'feedback' },
              notification.message,
              notification.linkMap
            );
        }

        res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
    }
};

// Get all feedback (Admin only)
export const getAllFeedback = async (req, res) => {
// ... existing code ...
    try {
        const feedback = await Feedback.find({}) 
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch feedback.' });
    }
};

// Get all approved feedback (Public)
export const getPublicFeedback = async (req, res) => {
// ... existing code ...
    try {
        const feedback = await Feedback.find({ isApproved: true })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch public feedback.' });
    }
};

// Get user's own feedback
export const getMyFeedback = async (req, res) => {
// ... existing code ...
    try {
        const feedback = await Feedback.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your feedback.' });
    }
};

// Approve feedback (Admin only)
export const approveFeedback = async (req, res) => {
// ... existing code ...
    try {
        const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found.' });
        }
        
        if (req.user.role === 'employee') {
            const io = req.app.get('io');
            const newLog = await createActivityLog(req.user.id, 'APPROVE_FEEDBACK', `Feedback ID: ${feedback._id}`, '/owner/manage-feedback');
            io.to('admin').emit('activity-log-update', newLog);
        }

        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to approve feedback.' });
    }
};

// Delete feedback (Admin only)
export const deleteFeedback = async (req, res) => {
// ... existing code ...
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        if (req.user.role === 'employee') {
            const io = req.app.get('io');
            const newLog = await createActivityLog(req.user.id, 'DELETE_FEEDBACK', `Feedback ID: ${feedback._id}`, '/owner/manage-feedback');
            io.to('admin').emit('activity-log-update', newLog);
        }

        res.json({ success: true, message: 'Feedback deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete feedback.' });
    }
};
