import mongoose from 'mongoose';
const { Schema } = mongoose;

const refundNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  attachment: {
    type: String, 
  },
  attachmentOriginalName: {
    type: String,
  },
}, { _id: false });

const refundRequestSchema = new mongoose.Schema({
  // Booking and User Info
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  bookingReference: {
    type: String,
    required: true,
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
  },
  itemType: {
    type: String,
    enum: ['car', 'tour', 'transport'],
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  bookingStartDate: {
    type: Date,
    required: true,
  },

  // Submitter's Contact Info (from the form)
  submitterName: {
    type: String,
    required: true,
  },
  submitterEmail: {
    type: String,
    required: true,
  },
  submitterPhone: {
    type: String,
    required: true,
  },

  // Refund Details
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'confirmed'], 
    default: 'pending',
    index: true,
  },
  
  bookingTotalPrice: {
    type: Number,
    required: true,
  },
  refundPolicy: {
    type: String,
    enum: ['full', 'half', 'none'],
    required: true,
  },
  calculatedRefundAmount: {
    type: Number,
    required: true,
  },
  
  // Admin communication
  notes: [refundNoteSchema],

}, { timestamps: true });

refundRequestSchema.index({ booking: 1 }, { unique: true });
refundRequestSchema.index({ bookingReference: 1 }, { unique: true });

export default mongoose.model('RefundRequest', refundRequestSchema);