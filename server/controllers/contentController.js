import { createNotification } from './notificationController.js';

// This is a simulation. In a real app, this would be a Mongoose model.
let contentStore = {
    mission: { title: 'Our Mission', content: 'To provide exceptional travel experiences...' },
    vision: { title: 'Our Vision', content: 'To be the leading travel and transportation company...' },
    about: { title: 'About Us', content: 'DoRayd Travel & Tours was founded with a passion...' },
    terms: { title: 'Terms and Conditions', content: 'All bookings must be confirmed...' },
    privacy: { title: 'Privacy Policy', content: 'We are committed to protecting your privacy...' },
    contact: { title: 'Contact Information', content: 'HEAD OFFICE...' },
    bookingTerms: { title: 'Booking Modal Terms', content: 'By checking this box, you agree to our booking terms, cancellation policy, and privacy policy. Data will be stored securely in our database.' },
    paymentQR: { title: 'Payment QR Code', content: '' }
};
export const getAllContentTypes = (req, res) => {
    const contentTypes = Object.keys(contentStore);
    res.json({ success: true, data: contentTypes });
};

export const getContentByType = (req, res) => {
  const { type } = req.params;
  const content = contentStore[type];
  if (!content) {
    return res.status(404).json({ success: false, message: 'Content not found' });
  }
  res.json({ success: true, data: content });
};

export const updateContent = async (req, res) => {
  const { type } = req.params;
  const { title, content } = req.body;
  if (!contentStore[type]) {
    return res.status(404).json({ success: false, message: 'Content type not found' });
  }
  contentStore[type] = {
    title: title || contentStore[type].title,
    content: content || contentStore[type].content,
    updatedAt: new Date().toISOString()
  };

  const io = req.app.get('io');
  if (io && req.user.role === 'employee') {
      const message = `Employee ${req.user.firstName} updated the '${type}' content.`;
      const link = '/owner/content-management';
      const notifications = await createNotification({ roles: ['admin'] }, message, link);
      if (notifications && notifications.length > 0) {
          io.to('admin').emit('activity-log', notifications[0]);
      }
  }

  res.json({ success: true, message: 'Content updated successfully', data: contentStore[type] });
};