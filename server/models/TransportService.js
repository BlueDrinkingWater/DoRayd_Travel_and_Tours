// server/models/TransportService.js

import mongoose from 'mongoose';

const transportPricingSchema = new mongoose.Schema({
  region: {
    type: String,
    trim: true,
  },
  destination: {
    type: String,
    trim: true,
    required: true,
  },
  // --- MODIFIED ---
  dayTourTime: { // Represents duration in hours, e.g., 8, 10, 12
    type: Number, 
  },
  // --- END MODIFICATION ---
  dayTourPrice: {
    type: Number,
  },
  ovnPrice: { // Overnight
    type: Number,
  },
  threeDayTwoNightPrice: { // 3D2N
    type: Number,
  },
  dropAndPickPrice: {
    type: Number,
  },
});

const transportServiceSchema = new mongoose.Schema({
  vehicleType: {
    type: String,
    required: true,
    enum: ['Tourist Bus', 'Coaster'],
  },
  name: { // Optional name, e.g., "Bus Alpha"
    type: String,
    trim: true,
  },
  capacity: {
    type: Number, // Changed from String to Number
    required: true,
  },
  amenities: [{
    type: String,
    trim: true,
  }],
  description: {
    type: String,
  },
  images: [{
    type: String,
  }],
  isAvailable: {
    type: Boolean,
    default: true,
  },
  archived: {
    type: Boolean,
    default: false,
  },
  pricing: [transportPricingSchema], // Array of pricing rules

  // Payment fields
  paymentType: {
    type: String,
    enum: ['full', 'downpayment'],
    default: 'full',
  },
  downpaymentType: { // 'percentage' or 'fixed'
    type: String,
    enum: ['percentage', 'fixed'],
    required: function() { return this.paymentType === 'downpayment'; },
  },
  downpaymentValue: {
    type: Number,
    required: function() { return this.paymentType === 'downpayment'; },
    min: [1, 'Downpayment value must be at least 1.'],
  },
}, { timestamps: true });

// Index for searching
transportServiceSchema.index({ vehicleType: 'text', name: 'text', capacity: 'text' });

export default mongoose.model('TransportService', transportServiceSchema);