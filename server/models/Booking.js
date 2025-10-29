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
  paymentProof: { type: String, required: true }, // Cloudinary path/filename
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
    itemType: { type: String, enum: ['car', 'tour', 'transport'], required: true },
    itemModel: { type: String, enum: ['Car', 'Tour', 'TransportService'], required: true }, // Ensure this is set on creation

    // Booking Dates & Details
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    time: { type: String, required: true }, // Storing time as a string e.g., "14:00"
    numberOfDays: { type: Number },
    numberOfGuests: { type: Number }, // Used for tour and transport

    // Delivery & Location (Mainly for cars)
    deliveryMethod: { type: String, enum: ['pickup', 'dropoff'] },
    pickupLocation: { type: String, trim: true },
    pickupCoordinates: {
      lat: Number,
      lng: Number,
    },
    dropoffLocation: { type: String, trim: true },
    dropoffCoordinates: {
      lat: Number,
      lng: Number,
    },

    // *** ADDED: New fields for transport ***
    transportDestination: { type: String, trim: true },
    transportServiceType: { type: String, trim: true },
    // *** END OF ADDED fields ***

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

    pendingExpiresAt: {
        type: Date,
        // *** MODIFIED: Default expiry set conditionally in pre-save hook ***
        default: () => new Date(Date.now() + 15 * 60 * 1000), 
        // Removed TTL index - rely on background job in server.js to update status
    },
    paymentDueDate: {
        type: Date,
        index: true // Index for efficient querying by the background job
    },
    // *** ADDED: New field for admin confirmation timer ***
    adminConfirmationDueDate: {
        type: Date,
        index: true
    },
    // *** END OF ADDED field ***
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
      const timestampPart = Date.now().toString(36).slice(-6).toUpperCase();
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      return `${prefix}-${timestampPart}-${randomPart}`;
    };
    this.bookingReference = generateBookingReference();
  }
  // Ensure itemModel is set based on itemType
  if (this.itemType && !this.itemModel) {
    if (this.itemType === 'car') this.itemModel = 'Car';
    else if (this.itemType === 'tour') this.itemModel = 'Tour';
    else if (this.itemType === 'transport') this.itemModel = 'TransportService';
  }

  // Ensure numberOfDays is calculated for cars if possible
  if (this.itemType === 'car' && this.startDate && this.endDate && (!this.numberOfDays || this.isModified('startDate') || this.isModified('endDate'))) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    if (end > start) {
        const diffTime = Math.abs(end - start);
        // Calculate difference in days, rounding up.
        this.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
        this.numberOfDays = 1; // Default to 1 day if dates are same or invalid order
    }
  }

  // *** MODIFIED: Logic to handle timers based on itemType ***
  if (this.isNew) { // Only run this logic when the document is new
    if (this.itemType === 'transport') {
      // Transport bookings are now paid, they should not expire in 15 mins.
      // They get the new admin confirmation timer instead.
      this.pendingExpiresAt = undefined; 
      
      // Set the admin confirmation timer (e.g., 24 hours)
      // This applies if it's a new, pending booking with payment.
      if (this.status === 'pending' && (this.amountPaid > 0 || this.payments.length > 0)) {
           this.adminConfirmationDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour timer
      }
    } else if (!this.pendingExpiresAt) {
      // Ensure other new (car/tour) bookings get the default 15-min expiry
      this.pendingExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
  // *** END OF MODIFIED logic ***

  next();
});

export default mongoose.model("Booking", bookingSchema);