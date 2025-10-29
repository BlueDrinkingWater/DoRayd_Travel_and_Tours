import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
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
  item: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'itemModel'
  },
  itemModel: { 
    type: String, 
    enum: ['tour', 'car', 'general', 'transport'],
  },
  type: {
    type: String,
    enum: ['review', 'feedback'],
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
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  isAnonymous: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Index for better performance
reviewSchema.index({ item: 1, isApproved: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ type: 1, isApproved: 1 });

export default mongoose.model('Review', reviewSchema);