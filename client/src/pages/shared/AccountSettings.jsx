import React, { useState, useRef } from 'react';
import { useAuth } from '../../components/Login.jsx';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import { User, Edit, Save, X, Key, Shield, AlertTriangle, Upload, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSecureImage } from '../../hooks/useSecureImage.jsx';

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

    const { secureUrl: profilePicUrl, loading: profilePicLoading } = useSecureImage(user?.profilePicture);

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
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Profile Information</h2>
                <Message type={profileMessage.type} text={profileMessage.text} />
                <div className="flex items-center gap-6 mt-4">
                    <div className="relative">
                        {profilePicLoading ? (
                            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse border-4 border-white shadow-md flex items-center justify-center text-sm">Loading...</div>
                        ) : (
                            <img
                                src={profilePicUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random&color=fff`}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                            />
                        )}
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
                            <input name="firstName" value={profileData.firstName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" placeholder="First Name" />
                            <input name="lastName" value={profileData.lastName} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" placeholder="Last Name" />
                            <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" placeholder="Email Address"/>
                            <input
                                type="tel"
                                name="phone"
                                value={profileData.phone}
                                onChange={handleProfileChange}
                                disabled={!isEditing}
                                className="w-full p-2 border rounded-md disabled:bg-gray-100"
                                placeholder="09171234567"
                                maxLength="11"
                                pattern="\d{11}"
                                title="Phone number must be 11 digits"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                             <textarea name="address" value={profileData.address} onChange={handleProfileChange} disabled={!isEditing} className="w-full p-2 border rounded-md disabled:bg-gray-100" placeholder="Your Address" rows="3"></textarea>
                        </div>
                        <div className="flex justify-end gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={() => { setIsEditing(false); setProfileMessage({ type: '', text: '' }); }} className="px-4 py-2 bg-gray-200 rounded-md text-sm font-semibold">Cancel</button>
                                    <button onClick={handleProfileSave} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Save Changes</button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Edit Profile</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Change Password</h2>
                <Message type={passwordMessage.type} text={passwordMessage.text} />
                <form onSubmit={handlePasswordSave} className="space-y-4 mt-4">
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Current Password" required className="w-full p-2 border rounded-md pr-10" />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" required className="w-full p-2 border rounded-md pr-10" />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <input type={showPasswords ? "text" : "password"} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm New Password" required className="w-full p-2 border rounded-md pr-10" />
                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold">Update Password</button>
                    </div>
                </form>
            </div>

            {user?.role === 'customer' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
                    <p className="text-sm text-gray-600 mb-4">Deleting your account is a permanent action and cannot be undone. All your booking history and reviews will be removed.</p>
                    <div className="flex justify-end">
                        <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold">Delete My Account</button>
                    </div>
                </div>
            )}

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
                            className="w-full p-2 border border-gray-300 rounded-md mt-4 focus:ring-red-500 focus:border-red-500"
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
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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