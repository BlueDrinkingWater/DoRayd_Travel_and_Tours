import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  applicableTo: { type: String, enum: ['all', 'car', 'tour', 'transport'], required: true }, // Added 'transport'
  itemIds: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'itemModel' }], // Correctly reference other models
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create a virtual property 'itemModel' that refPath can use
promotionSchema.virtual('itemModel').get(function() {
  if (this.applicableTo === 'car') return 'Car';
  if (this.applicableTo === 'tour') return 'Tour';
  if (this.applicableTo === 'transport') return 'TransportService'; // Added this line
  return undefined;
});

export default mongoose.model('Promotion', promotionSchema);