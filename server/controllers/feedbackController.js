import Feedback from '../models/Feedback.js';

// Create new feedback
export const createFeedback = async (req, res) => {
    try {
        const { rating, comment, isAnonymous } = req.body;
        const newFeedback = new Feedback({
            user: req.user.id,
            rating,
            comment,
            isAnonymous
        });
        await newFeedback.save();
        res.status(201).json({ success: true, data: newFeedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create feedback.' });
    }
};

// Get all feedback (Admin only)
export const getAllFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ user: { $ne: null } }) // Optimization
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch feedback.' });
    }
};

// Get all approved feedback (Public)
export const getPublicFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ isApproved: true, user: { $ne: null } }) // Optimization
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch public feedback.' });
    }
};
// Approve feedback (Admin only)
export const approveFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found.' });
        }
        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to approve feedback.' });
    }
};

// Delete feedback (Admin only)
export const deleteFeedback = async (req, res) => {
    try {
        await Feedback.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Feedback deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete feedback.' });
    }
};