// server/models/Booking.js

import mongoose from "mongoose";
const { Schema } = mongoose;

const noteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
  },
  author: {
    // Storing user ID instead of just 'Admin' string for better tracking
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  attachment: {
    type: String, //  Cloudinary path
  },
  attachmentOriginalName: {
    type: String, //  Original file name
  },
}, { _id: false }); // Don't create separate _id for notes

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentReference: { type: String }, // System generated
  manualPaymentReference: { type: String }, // From bank/payment provider
  paymentProof: { type: String, required: true }, // Cloudinary path
  paymentDate: { type: Date, default: Date.now },
}, { _id: false }); // Don't create separate _id for payments

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      index: true, // Index for faster lookups
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow guest bookings
      index: true,
    },
    // Personal Information
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Item Information
    itemId: { type: Schema.Types.ObjectId, required: true, index: true },
    itemName: { type: String, required: true },
    itemType: { type: String, enum: ['car', 'tour'], required: true },
    itemModel: { type: String, enum: ['Car', 'Tour'], required: true }, // Ensure this is set on creation

    // Booking Dates & Details
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    time: { type: String, required: true }, // Storing time as a string e.g., "14:00"
    numberOfDays: { type: Number },
    numberOfGuests: { type: Number },

    // Delivery & Location (Mainly for cars)
    deliveryMethod: { type: String, enum: ['pickup', 'dropoff'] },
    pickupLocation: { type: String, trim: true },
    dropoffLocation: { type: String, trim: true },
    dropoffCoordinates: {
      lat: Number,
      lng: Number,
    },

    // Payment Details
    totalPrice: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentOption: { type: String, enum: ['full', 'downpayment'], required: true },
    payments: [paymentSchema],

    // Promotion Details (Optional)
    originalPrice: { type: Number, min: 0 },
    discountApplied: { type: Number, min: 0 },
    promotionTitle: { type: String, trim: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "rejected", "fully_paid"], // Added 'fully_paid'
      default: "pending",
      index: true,
    },
    specialRequests: { type: String, trim: true },

    notes: [noteSchema], // Admin/Employee notes

    // **MODIFIED:** Renamed expiresAt to pendingExpiresAt
    pendingExpiresAt: {
        type: Date,
        // Set expiration 15 minutes from creation for pending bookings
        default: () => new Date(Date.now() + 15 * 60 * 1000),
        // MongoDB TTL index to automatically remove *pending* documents after 15 min
        // Note: This deletes the document. If you want to *update* status instead, use a background job.
        // For status update, remove 'index: { expires: '15m' }' and rely on the server.js job.
        index: { expires: '15m' }
    },
    // **NEW:** Added paymentDueDate for confirmed downpayments
    paymentDueDate: {
        type: Date,
        index: true // Index for efficient querying by the background job
    },
    agreedToTerms: { type: Boolean, required: true, default: false } // Added this field

  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Generate booking reference before saving
bookingSchema.pre('save', function (next) {
  if (!this.bookingReference) {
    const generateBookingReference = () => {
      const prefix = 'DRYD';
      // More concise timestamp + random part
      const timestampPart = Date.now().toString(36).slice(-6).toUpperCase();
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      return `${prefix}-${timestampPart}-${randomPart}`;
    };
    this.bookingReference = generateBookingReference();
  }
  // Ensure itemModel is set based on itemType
  if (this.itemType && !this.itemModel) {
    this.itemModel = this.itemType.charAt(0).toUpperCase() + this.itemType.slice(1);
  }

  // Ensure numberOfDays is calculated for cars if possible
  if (this.itemType === 'car' && this.startDate && this.endDate && !this.numberOfDays) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    // Add 1 because the calculation is inclusive of the start day
    this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);