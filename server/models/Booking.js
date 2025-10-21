// server/models/Booking.js

import mongoose from "mongoose";
const { Schema } = mongoose;

const noteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: "Admin",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  attachment: {
    type: String, //  File path
  },
  attachmentOriginalName: {
    type: String, //  Original file name
  },
});

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Allow guest bookings
    },
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },

    // Item Information
    itemId: { type: Schema.Types.ObjectId, required: true },
    itemName: { type: String, required: true },
    itemType: { type: String, enum: ['car', 'tour'], required: true },
    itemModel: { type: String, enum: ['Car', 'Tour'] }, // Added this line back

    // Booking Dates & Details
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    time: { type: String, required: true }, // Storing time as a string e.g., "14:00"
    numberOfDays: { type: Number },
    numberOfGuests: { type: Number },
    
    // Delivery & Location
    deliveryMethod: { type: String, enum: ['pickup', 'dropoff'] },
    pickupLocation: { type: String },
    dropoffLocation: { type: String },
    dropoffCoordinates: {
      lat: Number,
      lng: Number,
    },

    // Payment Details
    totalPrice: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    paymentOption: { type: String, enum: ['full', 'downpayment'], required: true },
    paymentReference: { type: String, required: true },
    paymentProof: { type: String, required: true }, // Path to the uploaded proof

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "rejected"],
      default: "pending",
    },
    specialRequests: { type: String },
    
    notes: [noteSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Booking", bookingSchema);