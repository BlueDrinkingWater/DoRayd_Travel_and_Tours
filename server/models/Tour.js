import mongoose from 'mongoose';

const tourSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true,
    maxlength: [100, 'Destination cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true,
    maxlength: [50, 'Duration cannot exceed 50 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required for tours']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required for tours']
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'Maximum group size is required'],
    min: [1, 'Group size must be at least 1']
  },
  difficulty: {
    type: String,
    required: [true, 'Difficulty level is required'],
    enum: ['easy', 'moderate', 'challenging'],
    default: 'moderate'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['adventure', 'cultural', 'nature', 'beach', 'city', 'historical'],
    default: 'nature'
  },
  images: [{
    type: String,
    required: false
  }],
  itinerary: [{ // Expects an array of objects
    day: { type: Number },
    title: { type: String },
    activities: { type: String } // Changed from array to single string
  }],
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
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
  featured: {
    type: Boolean,
    default: false
  },
  // --- PAYMENT FIELDS ---
  paymentType: {
    type: String,
    enum: ['full', 'downpayment'],
    default: 'full'
  },
  downpaymentType: {
    type: String,
    enum: ['fixed', 'percentage'],
  },
  downpaymentValue: {
    type: Number,
    min: 0,
    validate: {
        validator: function(value) {
            if (this.paymentType !== 'downpayment') {
                return true;
            }
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

// Indexes for performance
tourSchema.index({ destination: 1 });
tourSchema.index({ price: 1 });
tourSchema.index({ startDate: 1 });

export default mongoose.model('Tour', tourSchema);
