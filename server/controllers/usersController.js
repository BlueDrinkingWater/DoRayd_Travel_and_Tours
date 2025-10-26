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

        const publicId = req.file.filename;

        // Profile pictures are sensitive - set to authenticated access mode
        try {
            await cloudinary.api.update(publicId, {
                access_mode: 'authenticated',
                type: 'authenticated',
                resource_type: 'image',
            });
            console.log(`Profile picture ${publicId} set to authenticated access mode`);
        } catch (error) {
            console.error(`Error setting authenticated access for profile picture ${publicId}:`, error);
            // Continue anyway - the image is uploaded, just not with restricted access
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Store only the public_id (filename) instead of the full URL with expiring signature
        user.profilePicture = publicId;
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

        // Add logic here to handle related data if needed (e.g., anonymize bookings)

        await User.findByIdAndDelete(req.user.id);

        // Clear the auth cookie
        res.cookie('token', 'loggedout', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Lax',
        });

        res.json({ success: true, message: 'Your account has been successfully deleted.' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ success: false, message: 'Server Error during account deletion.' });
    }
};

// --- Employee Management ---
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: { $in: ['admin', 'employee'] } }).select('-password');
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createEmployee = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, position, permissions, role } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required.' });
        }
         if (password.length < 8) { // Add password length validation
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const newRole = (role === 'admin' || role === 'employee') ? role : 'employee';

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
        }

        const employee = new User({
            firstName,
            lastName,
            email,
            password, // Hashing happens in pre-save hook
            phone,
            position,
            permissions,
            role: newRole,
            authProvider: 'local' // Explicitly set for new employees
        });

        await employee.save();
        employee.password = undefined; // Remove password before sending back
        res.status(201).json({ success: true, data: employee });
    } catch (error) {
        console.error("Create employee error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(400).json({ success: false, message: error.message || 'An unknown error occurred.' });
    }
};


export const updateEmployee = async (req, res) => {
    try {
        // Separate password from other data
        const { password, ...updateData } = req.body;

        // Prevent changing role via this endpoint if needed, or validate
        if (updateData.role && !['admin', 'employee'].includes(updateData.role)) {
            // Keep existing role if invalid role is provided
            delete updateData.role;
            console.warn(`Attempt to set invalid role ignored for employee ${req.params.id}`);
        }

        const employee = await User.findById(req.params.id);
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Update standard fields
        employee.set(updateData);

        // Only update password if a new one is provided
        if (password) {
            if (password.length < 8) {
                 return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
            }
            employee.password = password; // Hashing will occur on save
            employee.authProvider = 'local'; // Ensure auth provider is local if password is set/reset
        }

        const updatedEmployee = await employee.save({ validateBeforeSave: true }); // Validate before saving

        // Emit permissions update event if permissions changed
        // Compare original permissions with updated ones (simple length check or deep compare)
        const originalPermissions = employee.permissions || [];
        const updatedPermissions = updatedEmployee.permissions || [];
        if (JSON.stringify(originalPermissions) !== JSON.stringify(updatedPermissions)) {
            const io = req.app.get('io');
            if (io) {
                io.to(updatedEmployee._id.toString()).emit('permissions-updated');
                 console.log(`Emitted permissions-updated event for user ${updatedEmployee._id}`);
            }
        }

        updatedEmployee.password = undefined; // Remove password before sending response
        res.json({ success: true, data: updatedEmployee });
    } catch (error) {
        console.error("Update employee error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
         // Handle potential duplicate key error if email is changed to an existing one
        if (error.code === 11000 && error.keyPattern?.email) {
            return res.status(400).json({ success: false, message: 'This email address is already in use.' });
        }
        res.status(400).json({ success: false, message: error.message || 'Failed to update employee.' });
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

// --- Customer Management ---
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const resetCustomerPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) { // Add length validation
            return res.status(400).json({ success: false, message: 'New password is required and must be at least 8 characters long.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'customer') { // Ensure it's a customer
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        user.password = password; // Hashing will happen on save
        user.authProvider = 'local'; // Switch auth provider if they reset password
        await user.save({ validateBeforeSave: true }); // Validate before saving

        res.json({ success: true, message: 'Customer password updated successfully' });
    } catch (error) {
         console.error("Reset customer password error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error while resetting password.' });
    }
};

// changeEmployeePassword seems redundant with updateEmployee, keeping it for now
export const changeEmployeePassword = async (req, res) => {
     try {
        const { password } = req.body;
         if (!password || password.length < 8) { // Add length validation
            return res.status(400).json({ success: false, message: 'New password is required and must be at least 8 characters long.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || !['admin', 'employee'].includes(user.role)) { // Ensure it's admin/employee
             return res.status(404).json({ success: false, message: 'Employee or Admin not found' });
        }

        user.password = password; // Hashing on save
        user.authProvider = 'local'; // Ensure auth provider is local
        await user.save({ validateBeforeSave: true }); // Validate

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error("Change employee password error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error while changing password.' });
    }
};
