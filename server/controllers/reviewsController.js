import Review from '../models/Reviews.js';
import Feedback from '../models/Feedback.js';
import Booking from '../models/Booking.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';


// Submit a review for a specific item (car/tour)
export const submitReview = async (req, res) => {
    try {
        const { bookingId, rating, comment, isAnonymous } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'You can only review completed bookings.' });
        }
        if (!booking.user || booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You can only review your own bookings.' });
        }
        const existingReview = await Review.findOne({ booking: bookingId, type: 'review' });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this booking.' });
        }

        const review = new Review({
            user: req.user.id,
            booking: bookingId,
            item: booking.itemId,
            itemModel: booking.itemModel,
            type: 'review',
            rating,
            comment,
            isAnonymous: isAnonymous || false,
        });

        await review.save();

        const io = req.app.get('io');
        if (io) {
            const notificationMessage = 'A new review has been submitted for approval.';
            await createNotification(
              io,
              { roles: ['admin', 'employee'], module: 'reviews' },
              notificationMessage,
              {
                admin: '/owner/manage-reviews',
                employee: '/employee/manage-reviews'
              }
            );
        }

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ success: false, message: 'Failed to submit review.' });
    }
};

// Get reviews for a specific item (car/tour)
export const getReviewsForItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const reviews = await Review.find({
            item: itemId,
            type: 'review',
            isApproved: true
        })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching item reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};

// Get public feedback for dashboard
export const getPublicFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ isApproved: true })
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching public feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feedback.' });
    }
};

// Get user's own reviews
export const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id, type: 'review' })
            .populate('item', 'title brand model')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your reviews.' });
    }
};

// Get user's own feedback
export const getMyFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your feedback.' });
    }
};

// ADMIN: Get all reviews
export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ type: 'review' })
            .populate('user', 'firstName lastName')
            .populate('item', 'title brand model')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};

// ADMIN: Get all feedback
export const getAllFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching all feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feedback.' });
    }
};

// ADMIN: Approve review
export const approveReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved: true },
            { new: true }
        ).populate('user', 'firstName lastName');
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        // --- ACTIVITY LOGGING ---
        const io = req.app.get('io');
        // *** MODIFIED: Added check for req.user.role before logging ***
        if (io && req.user && req.user.role === 'employee') {
            const userName = review.user ? `${review.user.firstName} ${review.user.lastName}` : 'an unknown user';
            const newLog = await createActivityLog(req.user.id, 'APPROVE_REVIEW', `Approved review from ${userName}`, '/owner/manage-reviews');
            if (newLog) io.to('admin').emit('activity-log-update', newLog);
        }
        // *** END MODIFICATION ***

        res.json({ success: true, data: review });
    } catch (error) {
        console.error('Error approving review:', error);
        res.status(500).json({ success: false, message: 'Failed to approve review.' });
    }
};

// ADMIN: Approve feedback
export const approveFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            { isApproved: true },
            { new: true }
        );
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found.' });
        }
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error approving feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to approve feedback.' });
    }
};

// ADMIN: Disapprove review
export const disapproveReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved: false },
            { new: true }
        ).populate('user', 'firstName lastName');
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        // --- ACTIVITY LOGGING ---
        const io = req.app.get('io');
        // *** MODIFIED: Added check for req.user.role before logging ***
        if (io && req.user && req.user.role === 'employee') {
            const userName = review.user ? `${review.user.firstName} ${review.user.lastName}` : 'an unknown user';
            const newLog = await createActivityLog(req.user.id, 'DISAPPROVE_REVIEW', `Disapproved review from ${userName}`, '/owner/manage-reviews');
            if (newLog) io.to('admin').emit('activity-log-update', newLog);
        }
        // *** END MODIFICATION ***

        res.json({ success: true, data: review });
    } catch (error) {
        console.error('Error disapproving review:', error);
        res.status(500).json({ success: false, message: 'Failed to disapprove review.' });
    }
};

// ADMIN: Disapprove feedback
export const disapproveFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            { isApproved: false },
            { new: true }
        );
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found.' });
        }
        res.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error disapproving feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to disapprove feedback.' });
    }
};

// ADMIN: Delete a review
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id).populate('user', 'firstName lastName');
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        // --- ACTIVITY LOGGING ---
        const io = req.app.get('io');
        // *** MODIFIED: Added check for req.user.role before logging ***
        if (io && req.user && req.user.role === 'employee') {
            const userName = review.user ? `${review.user.firstName} ${review.user.lastName}` : 'an unknown user';
            const newLog = await createActivityLog(req.user.id, 'DELETE_REVIEW', `Deleted review from ${userName}`, '/owner/manage-reviews');
            if (newLog) io.to('admin').emit('activity-log-update', newLog);
        }
        // *** END MODIFICATION ***

        res.json({ success: true, message: 'Review deleted successfully.' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review.' });
    }
};