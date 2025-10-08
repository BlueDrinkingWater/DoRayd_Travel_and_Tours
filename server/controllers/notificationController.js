import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Creates and saves notifications for specified users or roles.
 * @param {Object} recipients - Object containing user ID or roles.
 * @param {string} recipients.user - A single user ID.
 * @param {Array<string>} recipients.roles - An array of roles (e.g., ['admin', 'employee']).
 * @param {string} message - The notification message.
 * @param {string} link - The link for the notification.
 */
export const createNotification = async (recipients, message, link) => {
    try {
        let userIds = [];

        // Handle single user ID
        if (recipients.user) {
            userIds.push(recipients.user);
        }

        // Handle roles
        if (recipients.roles && Array.isArray(recipients.roles)) {
            const usersInRoles = await User.find({ role: { $in: recipients.roles } }).select('_id');
            userIds.push(...usersInRoles.map(u => u._id));
        }

        // Ensure unique user IDs
        const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];

        const notifications = uniqueUserIds.map(userId => ({
            user: userId,
            message,
            link,
        }));

        if (notifications.length > 0) {
            const createdNotifications = await Notification.insertMany(notifications);
            console.log(`Created ${notifications.length} notifications.`);
            return createdNotifications; // --- FIX: Return the created notifications ---
        }
        return []; // --- FIX: Return empty array if none created ---
    } catch (error) {
        console.error('Error creating notification:', error);
        return []; // --- FIX: Return empty array on error ---
    }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};