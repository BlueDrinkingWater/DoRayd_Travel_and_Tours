import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true, 
      enum: [
        'mission',
        'vision',
        'about',
        'terms',
        'privacy',
        'contact',
        'bookingTerms',
        'bookingDisclaimer',
        'paymentQR1', 
        'paymentQR2', 
        'paymentQR3', 
        'paymentQR4', 
        'paymentQR5',
        'aboutImage',
        'contactPhone',
        'contactEmail',
        'contactAddress',
        'contactHours',
        'officeLocation',
        'loginPrivacy', 
      ],
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, 
  }
);

contentSchema.index({ type: 1 }, { unique: true });

export default mongoose.model('Content', contentSchema);