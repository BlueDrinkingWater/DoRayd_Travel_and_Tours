// models/ActivityLog.js

import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  // --- ADDED a link field to store navigation paths ---
  link: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model('ActivityLog', activityLogSchema);