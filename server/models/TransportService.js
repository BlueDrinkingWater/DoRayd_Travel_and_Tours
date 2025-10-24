import mongoose from 'mongoose';
const { Schema } = mongoose;

const pricingSchema = new Schema({
  region: { type: String, trim: true },
  destination: { type: String, required: true, trim: true },
  dayTourTime: { type: String, trim: true }, // e.g., "10", "12", "36" hours/days
  dayTourPrice: { type: Number, min: 0 },
  ovnPrice: { type: Number, min: 0 }, // Overnight
  threeDayTwoNightPrice: { type: Number, min: 0 }, // 3D2N
  dropAndPickPrice: { type: Number, min: 0 },
}, { _id: false });

const transportServiceSchema = new Schema({
  vehicleType: {
    type: String,
    enum: ['Tourist Bus', 'Coaster'],
    required: [true, 'Vehicle type is required'],
  },
  name: { // Optional: e.g., "Bus Alpha", "Coaster 1"
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  capacity: {
    type: String, // Store as string like "49 Regular", "22 Regular + 6 Jumpseats"
    required: [true, 'Capacity is required'],
    trim: true,
    maxlength: [100, 'Capacity description cannot exceed 100 characters']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  images: [{
    type: String, // URLs to images
  }],
  pricing: [pricingSchema], // Array to hold destination-based pricing
  isAvailable: {
    type: Boolean,
    default: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  owner: { // Optional, if needed to track who added it
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // --- PAYMENT FIELDS (Aligned with Car model) ---
  downpaymentRate: { 
    type: Number, 
    default: 0.2, // Default 20%
    min: 0, 
    max: 1 
  },
  requiresDownpayment: { 
    type: Boolean, 
    default: true 
  },
  // --- END PAYMENT FIELDS ---
}, {
  timestamps: true
});

transportServiceSchema.index({ vehicleType: 1 });
transportServiceSchema.index({ archived: 1, isAvailable: 1 });

export default mongoose.model('TransportService', transportServiceSchema);