import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const optionalAuth = async (req, res, next) => {
  try {
    // FIX: Check for the token in cookies, not headers
    const token = req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user; // Set user if token is valid
      }
    }
  } catch (error) {
    // If token is invalid or expired, just proceed without a user
    console.log("Optional auth: Invalid token provided. Proceeding as guest.");
  }
  next(); // Always continue to the next middleware, whether a user was found or not
};