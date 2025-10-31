import Message from '../models/Message.js';
import EmailService from '../utils/emailServices.js';
import { createNotification } from './notificationController.js';
import User from '../models/User.js';
import axios from 'axios'; 
import { v2 as cloudinary } from 'cloudinary';

// Get all messages
export const getAllMessages = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const messages = await Message.find(query)
      .populate('user', 'firstName lastName')
      .populate('replies.repliedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// Get a single message by ID
export const getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('user', 'firstName lastName')
      .populate('replies.repliedBy', 'firstName lastName');

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Mark as read if it's new
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// Create a new message (from contact form)
export const createMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, userId } = req.body;

    const newMessageData = { name, email, phone, subject, message };

    if (userId) {
      newMessageData.user = userId;
    }

    const newMessage = await Message.create(newMessageData);

    // Notify all admins (database notification)
    const admins = await User.find({ role: 'admin' });
    const notificationData = {
      message: `New contact message from ${name} regarding "${subject}".`,
      type: 'message',
      link: `/admin/messages` 
    };
    for (const admin of admins) {
      await createNotification(admin._id, notificationData);
    }

    const io = req.app.get('io');
    
    const socketNotificationPayload = {
        _id: newMessage._id, 
        message: `New message from ${name}: "${subject}"`,
        link: '/admin/messages',
        timestamp: new Date()
    };
    io.to('admin').to('employee').emit('notification', socketNotificationPayload);

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    next(error);
  }
};

// Reply to a message
export const replyToMessage = async (req, res, next) => {
  try {
    const { replyMessage } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const replyData = {
      message: replyMessage,
      repliedBy: req.user.id
    };

    // --- FIX 1: SAVE ATTACHMENT ID TO DATABASE ---
    // This must be done *before* message.save()
    if (req.file) {
      replyData.attachment = req.file.filename; // Save Cloudinary public_id (filename)
      replyData.attachmentOriginalName = req.file.originalname; // Save original name
    }

    message.replies.push(replyData);
    message.status = 'replied';
    await message.save();

    // Prepare email
    const emailData = {
      to: message.email,
      subject: `RE: ${message.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Hello ${message.name},</p>
          <p>Thank you for contacting DoRayd Travel & Tours. Here is our reply regarding your message:</p>
          <div style="background-color: #f4f4f4; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
            <p style="white-space: pre-wrap;">${replyMessage}</p>
            <p style="font-size: 0.9em; color: #555; margin-top: 15px;">
              Replied by: ${req.user.firstName} ${req.user.lastName}
            </p>
          </div>
          <p><strong>Original Message:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 15px; margin-left: 0; color: #777;">
            ${message.message}
          </blockquote>
          <p>If you have any further questions, please feel free to reply to this email.</p>
          <p>Best regards,<br/>The DoRayd Team</p>
        </div>
      `,
    };

    // --- FIX 2: ADD SECURE ATTACHMENT LOGIC HERE ---
    // This must be done *after* emailData is defined
    if (req.file) {
      try {
        // Generate a fresh, signed URL from the public_id
        const url = cloudinary.url(req.file.filename, {
          resource_type: 'auto',
          sign_url: true,
          secure: true,
        });

        // Download the file content
        const response = await axios.get(url, { 
          responseType: 'arraybuffer' 
        });
        
        // Attach the file content as a Buffer
        emailData.attachments = [{
          filename: req.file.originalname,
          content: Buffer.from(response.data),
        }];

      } catch (error) {
        console.error("Failed to download attachment for message reply:", error);
        // Email will be sent without attachment
      }
    }
    
    // --- FIX 3: REMOVED THE OLD, BUGGY ATTACHMENT BLOCK ---

    await EmailService.sendEmail(emailData);

    if (message.user) {
      await createNotification(message.user, {
        message: `You have a new reply for your message: "${message.subject}".`,
        type: 'message',
        link: `/my-bookings?tab=feedback` // Link to their dashboard
      });
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'firstName lastName')
      .populate('replies.repliedBy', 'firstName lastName');

    res.status(200).json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
};

// Mark a message as read (if needed separately)
export const markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// Delete a message
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await message.deleteOne(); // Use deleteOne()

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};

// --- Added missing export ---
export const updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true }
    );
    if (!message) {
      return res.status(4404).json({ success: false, message: 'Message not found' });
    }
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};