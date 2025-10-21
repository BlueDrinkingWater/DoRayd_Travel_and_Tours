import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true, // only one document per type (e.g. mission, about, etc.)
      enum: [
        "mission",
        "vision",
        "about",
        "terms",
        "privacy",
        "contact",
        "bookingTerms",
        "bookingDisclaimer",
        "paymentQR",
        "aboutImage",
        "contactPhone",
        "contactEmail",
        "contactAddress",
        "contactHours",
        "officeLocation"
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
      default: "",
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

//  Ensure indexes are synced (prevents leftover 'page' index errors)
contentSchema.index({ type: 1 }, { unique: true });

export default mongoose.model("Content", contentSchema);