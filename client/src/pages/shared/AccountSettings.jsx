// client/src/pages/shared/AccountSettings.jsx

import React, { useState, useRef } from 'react';
import { useAuth } from '../../components/Login.jsx';
import DataService from '../../components/services/DataService.jsx'; // Removed getImageUrl as useSecureImage handles it
import { User, Edit, Save, X, Key, Shield, AlertTriangle, Upload, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; // Import the hook

const AccountSettings = () => {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    // --- MODIFICATION: Use the useSecureImage hook ---
    // The hook will fetch the temporary secure URL for the private profile picture
    const { secureUrl: profilePicUrl, loading: profilePicLoading } = useSecureImage(user?.profilePicture);
    // --- END MODIFICATION ---

    const fileInputRef = useRef(null);

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSave = async () => {
        setProfileMessage({ type: '', text: '' });
        try {
            if (profileData.phone && profileData.phone.length !== 11) {
                throw new Error("Phone number must be 11 digits.");
            }
            const response = await DataService.updateUserProfile(profileData);
            if (response.success) {
                await refreshUser(); // Refresh user data globally
                setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
                setIsEditing(false);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        try {
            const response = await DataService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            if (response.success) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password.' });
        }
    };

    const handlePictureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setProfileMessage({ type: '', text: ''}); // Clear previous messages
        try {
            const response = await DataService.uploadProfilePicture(file);
            if (response.success) {
                await refreshUser(); // This fetches the updated user data, including the new profilePicture path
                setProfileMessage({ type: 'success', text: 'Profile picture updated!' });
                // The useSecureImage hook will automatically refetch the secure URL when user.profilePicture changes
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to upload picture.' });
        }
    };
    
    const handleDeleteAccount = async () => {
        if (deleteConfirmation.toLowerCase() !== 'delete my account') {
            setDeleteMessage({ type: 'error', text: 'Please type "delete my account" exactly to confirm.' });
            return;
        }

        setDeleteMessage({ type: '', text: '' });
        try {
            const response = await DataService.deleteAccount();
            if (response.success) {
                alert('Your account has been successfully deleted.');
                logout();
                navigate('/');
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            setDeleteMessage({ type: 'error', text: error.message || 'Failed to delete account.' });
        }
    };

    const Message = ({ type, text }) => {
        if (!text) return null;
        const colors = {
            success: 'bg-green-100 text-green-800',
            error: 'bg-red-100 text-red-800',
        };
        return <div className={`p-3 rounded-md text-sm ${colors[type]}`}>{text}</div>;
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-6"> {/* Added padding for smaller screens */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Information</h2>
                {/* Profile Message moved inside the flex container for better layout */}
                <div className="flex flex-col md:flex-row items-center gap-6 mt-4">
                    <div className="relative flex-shrink-0">
                        {profilePicLoading ? (
                            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse border-4 border-white shadow-md flex items-center justify-center text-sm">Loading...</div>
                        ) : (
                            <img
                                // --- MODIFICATION: Use profilePicUrl from the hook ---
                                src={profilePicUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random&color=fff`}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                                // Add error handling for the fetched URL itself
                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random&color=fff`; }}
                            />
                            // --- END MODIFICATION ---
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                            aria-label="Upload profile picture"
                        >
                            <Upload size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePictureUpload} className="hidden" accept="image/*" />
                    </div>
                    <div className="flex-grow w-full space-y-4">
                        {/* Display message above the form fields */}
                         <Message type={profileMessage.type} text={profileMessage.text} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="firstName" value={profileData.firstName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="First Name" />
                            <input name="lastName" value={profileData.lastName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Last Name" />
                            <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email Address"/>
                            <input
                                type="tel"
                                name="phone"
                                value={profileData.phone || ''} // Ensure value is not null/undefined
                                onChange={handleProfileChange}
                                disabled={!isEditing}
                                className="w-full p-2 border rounded-md disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="09171234567"
                                maxLength="11"
                                pattern="\d{11}"
                                title="Phone number must be 11 digits"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                             <textarea name="address" value={profileData.address || ''} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Your Address" rows="3"></textarea>
                        </div>
                        <div className="flex justify-end gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={() => { setIsEditing(false); setProfileMessage({ type: '', text: '' }); setProfileData({firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || ''}); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-semibold transition-colors">Cancel</button>
                                    <button onClick={handleProfileSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors">Save Changes</button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-1"><Edit size={14}/> Edit Profile</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section (remains the same) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Change Password</h2>
                <Message type={passwordMessage.type} text={passwordMessage.text} />
                <form onSubmit={handlePasswordSave} className="space-y-4 mt-4">
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full p-2 border rounded-md pr-10 focus:ring-2 focus:ring-blue-500 outline-none" />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password (min. 8 characters)" required className="w-full p-2 border rounded-md pr-10 focus:ring-2 focus:ring-blue-500 outline-none" minLength="8"/>
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full p-2 border rounded-md pr-10 focus:ring-2 focus:ring-blue-500 outline-none" minLength="8"/>
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-1"><Key size={14}/> Update Password</button>
                    </div>
                </form>
            </div>

            {/* Danger Zone (remains the same) */}
             {user?.role === 'customer' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
                    <p className="text-sm text-gray-600 mb-4">Deleting your account is a permanent action and cannot be undone. All your booking history and reviews will be removed.</p>
                    <div className="flex justify-end">
                        <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition-colors">Delete My Account</button>
                    </div>
                </div>
            )}

            {/* Delete Modal (remains the same) */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                           <AlertTriangle className="w-10 h-10 text-red-500" />
                           <h3 className="text-xl font-bold text-red-600">Confirm Account Deletion</h3>
                        </div>
                        <p className="text-sm text-gray-700 mt-2 mb-4">
                            This action is irreversible. To proceed with deleting your account permanently, please type "<strong className="text-red-700">delete my account</strong>" in the box below.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md mt-4 focus:ring-red-500 focus:border-red-500 outline-none"
                            placeholder='Type "delete my account"'
                        />
                        <div className="mt-3">
                            <Message type={deleteMessage.type} text={deleteMessage.text} />
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmation('');
                                    setDeleteMessage({ type: '', text: '' });
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                disabled={deleteConfirmation.toLowerCase() !== 'delete my account'}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSettings;