import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
  image: { 
    type: String 
  },
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },
  serviceType: {
    type: String,
    enum: ['tour', 'car', 'general', 'transport'],
    required: true
  }
}, { 
  timestamps: true 
});

// Index for better performance
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ isApproved: 1 });

export default mongoose.model('Feedback', feedbackSchema);