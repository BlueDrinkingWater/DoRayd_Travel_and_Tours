import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand cannot exceed 50 characters']
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1990, 'Year cannot be before 1990'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['economy', 'compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van', 'convertible'],
    default: 'economy'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price cannot be negative']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  seats: {
    type: Number,
    required: [true, 'Number of seats is required'],
    min: [1, 'Must have at least 1 seat'],
    max: [15, 'Cannot exceed 15 seats']
  },
  transmission: {
    type: String,
    required: [true, 'Transmission type is required'],
    enum: ['automatic', 'manual'],
    default: 'automatic'
  },
  fuelType: {
    type: String,
    required: [true, 'Fuel type is required'],
    enum: ['gasoline', 'diesel', 'hybrid', 'electric'],
    default: 'gasoline'
  },
  features: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String, // URLs to images
    required: false
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  pickupLocations: [{
    type: String,
    trim: true
  }],
  // --- PAYMENT FIELDS ---
  paymentType: {
    type: String,
    enum: ['full', 'downpayment'],
    default: 'full'
  },
  downpaymentType: {
    type: String,
    enum: ['fixed', 'percentage'],
    // No default, only relevant if paymentType is 'downpayment'
  },
  downpaymentValue: {
    type: Number,
    min: 0,
    // Validate that value exists and is positive if downpayment is enabled
    validate: {
        validator: function(value) {
            if (this.paymentType !== 'downpayment') {
                return true; // Not required if full payment
            }
            // Required and must be > 0 if paymentType is downpayment
            return value != null && value > 0;
        },
        message: 'Downpayment value is required when downpayment is enabled and must be greater than 0.'
    }
  }
  // --- END PAYMENT FIELDS ---
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
carSchema.index({ brand: 1, model: 1 });
carSchema.index({ location: 1 });
carSchema.index({ pricePerDay: 1 });
carSchema.index({ isAvailable: 1 });
carSchema.index({ createdAt: -1 });

// Virtual for bookings
carSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'car'
});

export default mongoose.model('Car', carSchema);
