import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Creates, saves, and emits notifications via socket.io.
 * @param {Object} io - The socket.io server instance.
 * @param {Object} recipients - Object containing user ID or roles.
 * @param {string} message - The notification message.
 * @param {Object|string} linkMap - An object mapping roles to links, or a single link string.
 * @param {string} [initiatorId] - The ID of the user who triggered the action (to be excluded).
 */
export const createNotification = async (io, recipients, message, linkMap, initiatorId = null) => {
    try {
        let usersToNotify = [];

        if (recipients.user) {
            const user = await User.findById(recipients.user).select('_id role permissions');
            if (user) usersToNotify.push(user);
        }

        if (recipients.roles && Array.isArray(recipients.roles)) {
            const usersInRoles = await User.find({ role: { $in: recipients.roles } }).select('_id role permissions');
            usersToNotify.push(...usersInRoles);
        }

        const uniqueUsers = Array.from(new Map(
            usersToNotify
                .filter(u => !initiatorId || u._id.toString() !== initiatorId)
                .map(u => [u._id.toString(), u])
        ).values());

        const notificationsToCreate = uniqueUsers.map(user => {
            const link = typeof linkMap === 'object' ? (linkMap[user.role] || linkMap.default || '#') : linkMap;

            if (user.role === 'employee' && recipients.module) {
                const hasPermission = user.permissions.some(p => p.module === recipients.module);
                if (!hasPermission) return null;
            }

            return { user: user._id, message, link };
        }).filter(Boolean);

        if (notificationsToCreate.length > 0) {
            const createdNotifications = await Notification.insertMany(notificationsToCreate);
            
            // Emit a socket event to each user individually
            if (io && createdNotifications) {
                createdNotifications.forEach(notification => {
                    const userSocketRoom = notification.user.toString();
                    // Emitting a generic 'notification' event that the client listens for
                    io.to(userSocketRoom).emit('notification', notification);
                });
            }
            
            console.log(`Created and emitted ${createdNotifications.length} notifications.`);
            return createdNotifications;
        }
        return [];
    } catch (error) {
        console.error('Error creating notification:', error);
        return [];
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