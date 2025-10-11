import React, { useState, useRef } from 'react';
import { useAuth } from '../../components/Login.jsx';
import DataService, { SERVER_URL } from '../../components/services/DataService.jsx';
import { User, Edit, Save, X, Key, Shield, AlertTriangle, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountSettings = () => {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();
    
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
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
            const response = await DataService.updateUserProfile(profileData);
            if (response.success) {
                await refreshUser();
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

        try {
            const response = await DataService.uploadProfilePicture(file);
            if (response.success) {
                await refreshUser();
                setProfileMessage({ type: 'success', text: 'Profile picture updated!' });
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.message || 'Failed to upload picture.' });
        }
    };
    
    const handleDeleteAccount = async () => {
        if (window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
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
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Profile Information Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Information</h2>
                <Message type={profileMessage.type} text={profileMessage.text} />
                <div className="flex items-center gap-6 mt-4">
                    <div className="relative">
                        <img 
                            src={user?.profilePicture ? `${SERVER_URL}${user.profilePicture}` : `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random&color=fff`} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                        />
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full border-2 border-white"
                        >
                            <Upload size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePictureUpload} className="hidden" accept="image/*" />
                    </div>
                    <div className="flex-grow space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="firstName" value={profileData.firstName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" />
                            <input name="lastName" value={profileData.lastName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" />
                            <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" />
                            <input name="phone" value={profileData.phone} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" />
                        </div>
                        <div className="flex justify-end gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 rounded-md text-sm font-semibold">Cancel</button>
                                    <button onClick={handleProfileSave} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Save Changes</button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Edit Profile</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Change Password</h2>
                <Message type={passwordMessage.type} text={passwordMessage.text} />
                <form onSubmit={handlePasswordSave} className="space-y-4 mt-4">
                    <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full p-2 border rounded-md" />
                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" required className="w-full p-2 border rounded-md" />
                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full p-2 border rounded-md" />
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Update Password</button>
                    </div>
                </form>
            </div>
            
            {/* Delete Account Section (Customers only) */}
            {user?.role === 'customer' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
                    <Message type={deleteMessage.type} text={deleteMessage.text} />
                    <p className="text-sm text-gray-600 mb-4">Deleting your account is a permanent action and cannot be undone. All your booking history and reviews will be removed.</p>
                    <div className="flex justify-end">
                        <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold">Delete My Account</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSettings;