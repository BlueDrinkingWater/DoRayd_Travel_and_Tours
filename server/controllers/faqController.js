import FAQ from '../models/FAQ.js';
import { createActivityLog } from './activityLogController.js';

// Get all FAQs
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ isActive: true });
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all FAQs for admin
export const getAllFAQsAdmin = async (req, res) => {
    try {
      const faqs = await FAQ.find();
      res.json({ success: true, data: faqs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  };

// Create a new FAQ
export const createFAQ = async (req, res) => {
  try {
    // --- THIS IS THE FIX ---
    // Use req.body directly to include all fields (like isFeatured)
    const newFAQ = new FAQ(req.body);
    // --- END OF FIX ---
    
    await newFAQ.save();

    // *** MODIFIED: Added check for req.user.role before logging ***
    if (req.user && req.user.role === 'employee') {
        const io = req.app.get('io');
        // Use newFAQ.question to get the value from the saved object
        const newLog = await createActivityLog(req.user.id, 'CREATE_FAQ', `FAQ: ${newFAQ.question}`, '/owner/manage-faqs');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.status(201).json({ success: true, data: newFAQ });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update an FAQ
export const updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    // *** MODIFIED: Added check for req.user.role before logging ***
    if (req.user && req.user.role === 'employee') {
        const io = req.app.get('io');
        const newLog = await createActivityLog(req.user.id, 'UPDATE_FAQ', `FAQ: ${faq.question}`, '/owner/manage-faqs');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, data: faq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete an FAQ
export const deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res.status(404).json({ success: false, message: 'FAQ not found' });
    }

    // *** MODIFIED: Added check for req.user.role before logging ***
    if (req.user && req.user.role === 'employee') {
        const io = req.app.get('io');
        const newLog = await createActivityLog(req.user.id, 'DELETE_FAQ', `FAQ: ${faq.question}`, '/owner/manage-faqs');
        if (newLog) io.to('admin').emit('activity-log-update', newLog);
    }
    // *** END MODIFICATION ***

    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
