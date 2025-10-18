import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import EmailService from '../utils/emailServices.js';
import crypto from 'crypto';
import { createNotification } from './notificationController.js';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { validationResult } from 'express-validator';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = new User({
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'customer'
    });
    await user.save();

    const io = req.app.get('io');
    if (io) {
      const notificationMessage = `New customer registered: ${user.firstName} ${user.lastName}`;
      await createNotification(
        io,
        { roles: ['admin', 'employee'] },
        notificationMessage,
        { admin: '/owner/customer-management', employee: '/employee/customer-management' }
      );
    }

    res.status(201).json({ success: true, message: 'Registration successful! Please log in to continue.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login user
export const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user || user.authProvider !== 'local' || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or social login user.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated.' });
        }

        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        user.password = undefined;
        
        const cookieOptions = {
            httpOnly: true,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        };

        res.cookie('token', token, cookieOptions);

        res.json({ success: true, user });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// ADD THIS ENTIRE FUNCTION
export const logout = (req, res) => {
  res.cookie('token', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Lax',
  });
  res.status(200).json({ success: true, message: 'User logged out' });
};

// Social Login - Google
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, given_name: firstName, family_name: lastName, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {
      if (user.authProvider !== 'google') {
        return res.status(400).json({ success: false, message: 'This email is already registered with a different login method.' });
        }
      if (user.role !== 'customer') {
        return res.status(403).json({ success: false, message: 'This email is registered as staff. Please use the staff login.' });
      }
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = new User({
        firstName,
        lastName,
        email,
        googleId,
        role: 'customer',
        authProvider: 'google',
        isActive: true,
      });
      await user.save();
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    user.password = undefined;
    
const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
};
    res.cookie('token', token, cookieOptions);
    res.json({ success: true, user });

  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed. Please try again or use another login method.' });
  }
};

// Social Login - Facebook
export const facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const { data } = await axios({
      url: 'https://graph.facebook.com/me',
      method: 'get',
      params: {
        fields: 'id,first_name,last_name,email',
        access_token: accessToken,
      },
    });

    const { email, first_name: firstName, last_name: lastName, id: facebookId } = data;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Your Facebook account does not have a public email address. Please use another method.' });
    }
    
    let user = await User.findOne({ email });
    
    if (user) {
      if (user.authProvider !== 'facebook') {
        return res.status(400).json({ success: false, message: 'This email is already registered with a different login method.' });
        }
      if (user.role !== 'customer') {
        return res.status(403).json({ success: false, message: 'This email is registered as staff. Please use the staff login.' });
      }
      if (!user.facebookId) {
        user.facebookId = facebookId;
        user.authProvider = 'facebook';
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = new User({
        firstName,
        lastName,
        email,
        facebookId,
        role: 'customer',
        authProvider: 'facebook',
        isActive: true,
      });
      await user.save();
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    user.password = undefined;

    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };

    res.cookie('token', token, cookieOptions);
    res.json({ success: true, user });

  } catch (error) {
    console.error('Facebook Login Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Facebook authentication failed. Please try again or use another login method.' });
  }
};

// Get current user profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Forgot Password - Step 1: Send reset token
export const forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No user with that email address exists.' });
        }
        
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        await EmailService.sendPasswordReset(user.email, resetURL);
        
        res.json({ success: true, message: 'Password reset instructions have been sent to your email!' });
    } catch (error) {
        if (req.body.email) {
            try {
                const user = await User.findOne({ email: req.body.email });
                if (user) {
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;
                    await user.save({ validateBeforeSave: false });
                }
            } catch (cleanupError) {}
        }
        res.status(500).json({ success: false, message: 'Unable to send password reset email. Please try again later or contact support.' });
    }
};

// Reset Password - Step 2: Update password with token
export const resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
        }
        
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        user.password = password;
        user.authProvider = 'local';
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Your password has been reset successfully. You may now log in.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred while resetting your password.' });
    }
};

// Change Password for logged in user
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Invalid input.' });
        }
        
        const user = await User.findById(req.user.id).select('+password');

        if (!user || user.authProvider !== 'local' || !(await user.correctPassword(currentPassword, user.password))) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};