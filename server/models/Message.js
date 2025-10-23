import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied'],
    default: 'new'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Link to the user who sent it, if they were logged in
  },
  replies: [{
    message: {
      type: String,
      required: true
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    repliedAt: {
      type: Date,
      default: Date.now
    },
    // --- ADDED FIELDS ---
    attachment: {
      type: String // Cloudinary path (req.file.path)
    },
    attachmentOriginalName: {
      type: String // Original filename (req.file.originalname)
    }
    // --- END ADDED FIELDS ---
  }]
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Create index for faster searching by status or email
messageSchema.index({ status: 1 });
messageSchema.index({ email: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;