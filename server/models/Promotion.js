import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  applicableTo: { type: String, enum: ['all', 'car', 'tour'], required: true },
  itemIds: [{ type: mongoose.Schema.Types.ObjectId }], // Specific cars/tours if not 'all'
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Promotion', promotionSchema);