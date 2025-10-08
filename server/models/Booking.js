// models/Booking.js
import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
    // REMOVED: required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  itemType: {
    type: String,
    enum: ['car', 'tour'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemModel'
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  itemModel: {
    type: String,
    required: true,
    enum: ['Car', 'Tour']
  },
  // Guest Information
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  
  // Booking Details
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  numberOfGuests: { type: Number, required: true, min: 1 },
  specialRequests: { type: String, maxlength: 500 },
  
  // Delivery/Pickup Details
  deliveryMethod: { type: String, enum: ['pickup', 'dropoff'] },
  pickupLocation: { type: String, trim: true },
  dropoffLocation: { type: String, trim: true },
  dropoffCoordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  
  totalPrice: { type: Number, required: true, min: 0 },
  paymentProofUrl: { type: String },
  paymentReference: { type: String, trim: true },
  amountPaid: { type: Number, min: 0 },
  
  // Verification & Status
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'], default: 'pending' },
  agreedToTerms: { type: Boolean, required: true },
  
  // Admin fields
  adminNotes: { type: String, maxlength: 1000 },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Generate booking reference before saving
bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.bookingReference) {
    const prefix = this.itemType === 'car' ? 'CAR' : 'TOUR';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.bookingReference = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

export default mongoose.model('Booking', bookingSchema);