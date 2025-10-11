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
    const { question, answer, keywords, category } = req.body;
    const newFAQ = new FAQ({ question, answer, keywords, category });
    await newFAQ.save();

    if (req.user.role === 'employee') {
        const io = req.app.get('io');
        const newLog = await createActivityLog(req.user.id, 'CREATE_FAQ', `FAQ: ${question}`, '/owner/manage-faqs');
        io.to('admin').emit('activity-log-update', newLog);
    }

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

    if (req.user.role === 'employee') {
        const io = req.app.get('io');
        const newLog = await createActivityLog(req.user.id, 'UPDATE_FAQ', `FAQ: ${faq.question}`, '/owner/manage-faqs');
        io.to('admin').emit('activity-log-update', newLog);
    }

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

    if (req.user.role === 'employee') {
        const io = req.app.get('io');
        const newLog = await createActivityLog(req.user.id, 'DELETE_FAQ', `FAQ: ${faq.question}`, '/owner/manage-faqs');
        io.to('admin').emit('activity-log-update', newLog);
    }

    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};