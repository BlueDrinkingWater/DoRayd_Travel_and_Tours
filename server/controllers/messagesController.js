import Message from '../models/Message.js';
import EmailService from '../utils/emailServices.js';
import { createNotification } from './notificationController.js';
import { createActivityLog } from './activityLogController.js';

export const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createMessage = async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    
    const io = req.app.get('io');
    if (io) {
        const notificationMessage = `New message from ${message.name}`;
        await createNotification(
          io,
          { roles: ['admin', 'employee'], module: 'messages' },
          notificationMessage,
          { admin: '/owner/messages', employee: '/employee/messages' }
        );
    }
    
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const replyToMessage = async (req, res) => {
  try {
    const { replyMessage } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    message.replies.push({ message: replyMessage, repliedBy: req.user.id });
    message.status = 'replied';
    await message.save();
    
    const io = req.app.get('io');
    if (io && req.user.role === 'employee') {
        const link = '/owner/messages';
        
        const newLog = await createActivityLog(req.user.id, 'REPLY_MESSAGE', `Message from: ${message.name}`, link);
        io.to('admin').emit('activity-log-update', newLog);
    }
    
    // Notify the original sender
    if (io && message.user) {
      const userSocketId = message.user.toString();
      const notification = {
        message: `You have a new reply to your message: "${message.subject}"`,
        link: '/my-feedback' 
      };

      io.to(userSocketId).emit('notification', notification);
      
      await createNotification(
        io,
        { user: message.user },
        notification.message,
        notification.link
      );
    }

    // Prepare attachment if it exists
    const attachments = [];
    if (req.file) {
        attachments.push({
            filename: req.file.originalname,
            path: req.file.path
        });
    }

    await EmailService.sendContactReply(message, replyMessage, attachments);
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};