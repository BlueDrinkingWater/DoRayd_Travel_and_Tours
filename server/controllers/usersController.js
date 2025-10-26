import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const updateUserProfile = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.address = address || user.address;

        await user.save({ validateBeforeSave: true });

        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        // Verify the file was actually uploaded to Cloudinary
        if (!req.file.filename || !req.file.path) {
            return res.status(500).json({ success: false, message: 'Upload to cloud storage failed.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // FIXED: Store only the public_id (filename) instead of the full URL with expiring signature
        user.profilePicture = req.file.filename; // Changed from req.file.path
        await user.save({ validateBeforeSave: false });

        res.json({ 
            success: true, 
            message: 'Profile picture uploaded successfully.', 
            data: { 
                profilePictureUrl: user.profilePicture,
                cloudinaryUrl: req.file.path // Optional: for debugging
            } 
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload profile picture.' });
    }
};

export const deleteUserAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await User.findByIdAndDelete(req.user.id);
        
        res.json({ success: true, message: 'Your account has been successfully deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: { $in: ['admin', 'employee'] } }).select('-password');
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createEmployee = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, position, permissions, role } = req.body;
        
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required.' });
        }
        
        const newRole = (role === 'admin' || role === 'employee') ? role : 'employee';

        const employee = new User({ 
            firstName, 
            lastName, 
            email, 
            password,
            phone, 
            position, 
            permissions, 
            role: newRole 
        });
        
        await employee.save();
        employee.password = undefined;
        res.status(201).json({ success: true, data: employee });
    } catch (error) {
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        // Handle duplicate key errors (e.g., email already exists)
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }
        // Handle all other errors
        res.status(400).json({ success: false, message: error.message || 'An unknown error occurred.' });
    }
};


export const updateEmployee = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        if (updateData.role && !['admin', 'employee'].includes(updateData.role)) {
            delete updateData.role;
        }
        
        const employee = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        const io = req.app.get('io');
        if (io) {
            io.to(employee._id.toString()).emit('permissions-updated');
        }
        
        res.json({ success: true, data: employee });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await User.findByIdAndDelete(req.params.id);
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ success: false, message: 'Server Error: Could not delete employee.' });
    }
};


export const changeEmployeePassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        user.password = password;
        await user.save();
        
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const resetCustomerPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'New password is required.' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = password; 
        await user.save();
        
        res.json({ success: true, message: 'Customer password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};