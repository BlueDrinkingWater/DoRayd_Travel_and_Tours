import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const permissionSchema = new mongoose.Schema({
  module: {
    type: String,
    required: true,
    // *** ADDED 'transport' to the enum ***
    enum: ['bookings', 'cars', 'tours', 'transport', 'promotions', 'content', 'employees', 'customers', 'reports', 'messages', 'faqs', 'feedback', 'reviews']
  },
  access: {
    type: String,
    required: true,
    enum: ['read', 'write', 'full'],
    default: 'read'
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: {
    type: String,
    required: function() { return this.authProvider === 'local'; },
    select: false
  },
  phone: { type: String, trim: true },
  // --- ADDED: profilePicture field ---
  profilePicture: {
    type: String, // Store the Cloudinary public_id (e.g., "dorayd/profiles/xyz123")
    trim: true
  },
  // --- END ADDED ---
  address: { type: String, trim: true, maxlength: 500 },
  role: {
    type: String,
    enum: ['customer', 'employee', 'admin'],
    default: 'customer'
  },
  position: { type: String },
  permissions: [permissionSchema],
  isActive: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  // Fields for Social Logins
  authProvider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  googleId: { type: String },
  facebookId: { type: String },
}, { timestamps: true });

// Hash password before saving only for local auth
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.authProvider !== 'local' || !this.password) return next(); // Added check for password existence
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
   if (!userPassword) return false; // Handle cases where password might not be selected
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  return resetToken;
};

const User = mongoose.model('User', userSchema);
export default User;
