// client/src/pages/customer/CustomerDashboard.jsx

import React, { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../../components/Login';
import { useNavigate } from 'react-router-dom';
import DataService, { getImageUrl } from '../../components/services/DataService';
import { useApi } from '../../hooks/useApi';
import {
  User, Bell, Settings, LogOut, Package, CreditCard, ChevronDown, Clock, X,
  Car, MapPin, Info, HelpCircle, AlertTriangle, Upload, Bus // <-- ADDED Bus ICON
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { formatPrice, formatDate } from '../../utils/helpers'; // Assuming you have this helper, based on ManageBookings.jsx
import { useSocket } from '../../hooks/useSocket';

// Helper function for status colors
const getStatusClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
    case 'fully_paid':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Main CustomerDashboard Component
const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bookings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = [
    { id: 'bookings', label: 'My Bookings', icon: Package, component: BookingsTab },
    { id: 'notifications', label: 'Notifications', icon: Bell, component: NotificationsTab },
    { id: 'settings', label: 'Account Settings', icon: Settings, component: AccountSettingsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading user data...</p>
      </div>
    );
  }

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsSidebarOpen(false); // Close sidebar on tab selection
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
      <span className="flex-1">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <nav
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col`}
      >
        <div className="flex items-center justify-center px-6 py-4 border-b">
          <span className="text-xl font-bold text-blue-600">My Dashboard</span>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map(tab => (
            <TabButton key={tab.id} {...tab} />
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
        <div className="p-4 border-t">
          <p className="text-sm text-gray-600">Welcome,</p>
          <p className="font-semibold text-gray-800 truncate">{user.firstName} {user.lastName}</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white shadow-md sticky top-0 z-20">
          <span className="text-xl font-bold text-blue-600">My Dashboard</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 hover:text-gray-900">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>}
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {ActiveComponent && <ActiveComponent user={user} />}
        </div>
      </main>
    </div>
  );
};

// --- BookingsTab ---
// This is the component that needs the main fixes.
const BookingsTab = () => {
  const { data: bookingsData, loading, error, setData } = useApi(DataService.getMyBookings);
  const bookings = bookingsData || [];
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [bookingToPay, setBookingToPay] = useState(null);
  const { socket } = useSocket(); // Use socket for real-time updates
  const navigate = useNavigate(); // Added useNavigate

  useEffect(() => {
    // Listen for updates from the server (e.g., admin confirms a booking)
    const handleBookingUpdate = (updatedBooking) => {
      setData(prevData =>
        prevData.map(b => (b._id === updatedBooking._id ? updatedBooking : b))
      );
      // If the currently selected booking is updated, update that state too
      if (selectedBooking && selectedBooking._id === updatedBooking._id) {
        setSelectedBooking(updatedBooking);
      }
    };

    if (socket) {
      socket.on('booking-updated', handleBookingUpdate);
    }

    return () => {
      if (socket) {
        socket.off('booking-updated', handleBookingUpdate);
      }
    };
  }, [socket, setData, selectedBooking]);

  const openDetailModal = (booking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedBooking(null);
  };

  const openPaymentModal = (booking) => {
    setBookingToPay(booking);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setBookingToPay(null);
  };

  const handlePaymentSuccess = (updatedBooking) => {
    setData(prevData =>
      prevData.map(b => (b._id === updatedBooking._id ? updatedBooking : b))
    );
    closePaymentModal();
  };

  // *** ADDED: Helper to get item icon ***
  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'car':
        return <Car className="w-5 h-5 text-blue-600" />;
      case 'tour':
        return <MapPin className="w-5 h-5 text-green-600" />;
      case 'transport':
        return <Bus className="w-5 h-5 text-indigo-600" />; // <-- Added case
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  // *** ADDED: Helper to get item display name ***
  const getItemDisplayName = (booking) => {
    if (!booking.itemId) return booking.itemName || 'Deleted Item'; // Fallback for deleted items
    switch (booking.itemType) {
      case 'car':
        return `${booking.itemId.brand} ${booking.itemId.model}`;
      case 'tour':
        return booking.itemId.title;
      case 'transport':
        // Use vehicleType and name from the populated itemId
        return `${booking.itemId.vehicleType} ${booking.itemId.name ? `(${booking.itemId.name})` : ''}`;
      default:
        return booking.itemName; // Fallback to the stored name
    }
  };


  if (loading) return <div>Loading your bookings...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (bookings.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-lg shadow">
        <Package className="w-16 h-16 mx-auto text-gray-400" />
        <h3 className="mt-4 text-xl font-semibold text-gray-700">No Bookings Found</h3>
        <p className="mt-2 text-gray-500">You haven't made any bookings yet.</p>
        <button
          onClick={() => navigate('/cars')}
          className="mt-6 px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
        >
          Browse Services
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map(booking => (
          <div key={booking._id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getStatusClass(booking.status).replace('text', 'bg')}`}>
                    {getItemIcon(booking.itemType)}
                  </span>
                  <div>
                    <span
                      title={booking.bookingReference}
                      className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusClass(booking.status)}`}
                    >
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <img
                  src={getImageUrl(booking.itemId?.images?.[0] || 'default.jpg')}
                  alt="Item"
                  className="w-16 h-16 object-cover rounded-md shadow-sm"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
                />
              </div>

              {/* *** MODIFIED: Item Name Display *** */}
              <h3 className="text-lg font-semibold text-gray-900 truncate" title={getItemDisplayName(booking)}>
                {getItemDisplayName(booking)}
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">Ref: {booking.bookingReference}</p>

              <div className="space-y-2 text-sm mb-4">
                <p className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{formatDate(booking.startDate)} at {booking.time}</span>
                </p>
                {booking.itemType === 'car' && (
                  <p className="flex justify-between">
                    <span className="text-gray-600">End Date:</span>
                    <span className="font-medium">{formatDate(booking.endDate)}</span>
                  </p>
                )}
                 {booking.itemType === 'transport' && (
                  <p className="flex justify-between">
                    <span className="text-gray-600">Destination:</span>
                    <span className="font-medium truncate" title={booking.transportDestination}>{booking.transportDestination}</span>
                  </p>
                )}
              </div>

              {/* --- MODIFIED: Price Display Logic --- */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                {booking.itemType === 'transport' && booking.status === 'pending' && booking.totalPrice === 0 ? (
                  <p className="text-sm font-semibold text-center text-blue-600">
                    Total Price: <span className="text-gray-700">Pending Quote</span>
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="flex justify-between text-sm font-semibold text-gray-700">
                      <span>Total Price:</span>
                      <span className="text-blue-600">{formatPrice(booking.totalPrice)}</span>
                    </p>
                    <p className="flex justify-between text-sm text-gray-500">
                      <span>Amount Paid:</span>
                      <span className="text-green-600 font-medium">{formatPrice(booking.amountPaid)}</span>
                    </p>
                    {booking.totalPrice > booking.amountPaid && booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                      <p className="flex justify-between text-sm font-semibold text-red-600 pt-1 border-t">
                        <span>Balance Due:</span>
                        <span>{formatPrice(booking.totalPrice - booking.amountPaid)}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* --- END MODIFIED Price Display Logic --- */}
              
            </div>

            <div className="p-4 bg-gray-50 border-t grid grid-cols-2 gap-3">
              <button
                onClick={() => openDetailModal(booking)}
                className="w-full bg-white text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 border border-gray-300 transition"
              >
                View Details
              </button>

              {/* --- MODIFIED: "Add Payment" Button Logic --- */}
              {(
                (booking.status === 'confirmed' && booking.paymentOption === 'downpayment' && booking.totalPrice > booking.amountPaid) ||
                (booking.status === 'confirmed' && booking.itemType === 'transport' && booking.totalPrice > booking.amountPaid)
              ) ? (
                <button
                  onClick={() => openPaymentModal(booking)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Add Payment
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                  title={
                    booking.status !== 'confirmed' ? 'Booking not yet confirmed' :
                    booking.totalPrice <= booking.amountPaid ? 'Booking already fully paid' :
                    'Payment not required'
                  }
                >
                  Add Payment
                </button>
              )}
              {/* --- END MODIFIED "Add Payment" Button Logic --- */}

            </div>
          </div>
        ))}
      </div>

      {isDetailModalOpen && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          booking={bookingToPay}
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};


// --- NotificationsTab ---
const NotificationsTab = ({ user }) => {
  const { data: notificationsData, loading, error, setData } = useApi(() => DataService.getNotifications(user._id));
  const notifications = notificationsData?.data || [];
  const navigate = useNavigate();

  const handleNotificationClick = async (notification) => {
    // Navigate to the link
    if (notification.link) {
      navigate(notification.link);
    }
    // Mark as read if not already
    if (!notification.read) {
      try {
        const result = await DataService.markNotificationAsRead(notification._id);
        if (result.success) {
          setData(prevData => ({
            ...prevData,
            data: prevData.data.map(n => n._id === notification._id ? { ...n, read: true } : n)
          }));
        }
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
     try {
       const result = await DataService.markAllNotificationsAsRead();
       if(result.success) {
         setData(prevData => ({
            ...prevData,
            data: prevData.data.map(n => ({ ...n, read: true }))
         }));
       }
     } catch(err) {
       console.error("Failed to mark all as read:", err);
     }
  };

  if (loading) return <div>Loading notifications...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
           <button
             onClick={handleMarkAllAsRead}
             className="text-sm font-medium text-blue-600 hover:text-blue-800"
           >
             Mark All as Read
           </button>
        )}
      </div>
       {notifications.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg shadow">
            <Bell className="w-16 h-16 mx-auto text-gray-400" />
            <h3 className="mt-4 text-xl font-semibold text-gray-700">No Notifications</h3>
            <p className="mt-2 text-gray-500">You're all caught up!</p>
          </div>
       ) : (
         <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {notifications.map(notification => (
                <li
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-5 flex items-start gap-4 transition-colors ${notification.link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  {!notification.read && (
                    <span className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5" title="Unread"></span>
                  )}
                  <div className={`flex-1 ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                    <p className={`text-sm ${notification.read ? '' : 'font-semibold'}`}>
                      {notification.message}
                    </p>
                    <span className="text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
         </div>
       )}
    </div>
  );
};


// --- AccountSettingsTab ---
const AccountSettingsTab = ({ user }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const handleProfileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsProfileSubmitting(true);
    setProfileMessage({ type: '', text: '' });
    try {
      const result = await DataService.updateProfile(user._id, formData);
      if (result.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Optionally update auth context user if you have a setter
      } else {
        setProfileMessage({ type: 'error', text: result.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    
    setIsPasswordSubmitting(true);
    setPasswordMessage({ type: '', text: '' });
    
    try {
      const result = await DataService.changePassword({
        currentPassword,
        newPassword,
      });
      if (result.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: result.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const Message = ({ message }) => {
    if (!message.text) return null;
    const isError = message.type === 'error';
    return (
      <div className={`p-3 rounded-md text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {message.text}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
      
      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Information</h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Message message={profileMessage} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleProfileChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleProfileChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleProfileChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleProfileChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea name="address" value={formData.address} onChange={handleProfileChange} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={isProfileSubmitting}
              className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Message message={passwordMessage} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isPasswordSubmitting ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- BookingDetailModal ---
const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  if (!booking) return null;
  const { itemId, itemType } = booking;

  // Re-usable helper to get display name
  const getItemDisplayName = (booking) => {
    if (!booking.itemId) return booking.itemName || 'Deleted Item';
    switch (booking.itemType) {
      case 'car':
        return `${booking.itemId.brand} ${booking.itemId.model}`;
      case 'tour':
        return booking.itemId.title;
      case 'transport':
        return `${booking.itemId.vehicleType} ${booking.itemId.name ? `(${booking.itemId.name})` : ''}`;
      default:
        return booking.itemName;
    }
  };

  const DetailRow = ({ label, value, className = '' }) => (
    value ? (
      <div className={`flex justify-between text-sm ${className}`}>
        <span className="text-gray-600">{label}:</span>
        <span className="font-medium text-gray-800 text-right">{value}</span>
      </div>
    ) : null
  );

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "ease-in duration-200", leaveFrom: "opacity-100", leaveTo: "opacity-0" }}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0 scale-95", enterTo: "opacity-100 scale-100", leave: "ease-in duration-200", leaveFrom: "opacity-100 scale-100", leaveTo: "opacity-0 scale-95" }}>
              <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Dialog.Title className="text-xl font-bold text-gray-900">{getItemDisplayName(booking)}</Dialog.Title>
                      <p className="text-sm text-gray-500">Ref: {booking.bookingReference}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>

                  <div className="space-y-4">
                    {/* Status */}
                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <DetailRow label="Status" value={booking.status.replace('_', ' ').toUpperCase()} className="font-semibold text-base" />
                    </div>
                    
                    {/* Booking Details */}
                    <div className="p-4 rounded-lg bg-gray-50 border space-y-2">
                      <h4 className="font-semibold text-gray-800 mb-2">Booking Details</h4>
                      <DetailRow label="Start Date" value={`${formatDate(booking.startDate)} at ${booking.time}`} />
                      {itemType === 'car' && <DetailRow label="End Date" value={formatDate(booking.endDate)} />}
                      {itemType === 'car' && <DetailRow label="Total Days" value={booking.numberOfDays} />}
                      {(itemType === 'tour' || itemType === 'transport') && <DetailRow label="Guests/Passengers" value={booking.numberOfGuests} />}
                      {itemType === 'car' && <DetailRow label="Delivery" value={booking.deliveryMethod} />}
                      {itemType === 'car' && booking.deliveryMethod === 'pickup' && <DetailRow label="Pickup Location" value={booking.pickupLocation} />}
                      {itemType === 'car' && booking.deliveryMethod === 'dropoff' && <DetailRow label="Dropoff Location" value={booking.dropoffLocation} />}
                      {itemType === 'transport' && <DetailRow label="Destination" value={booking.transportDestination} />}
                      {itemType === 'transport' && <DetailRow label="Service Type" value={booking.transportServiceType} />}
                      {booking.specialRequests && <DetailRow label="Special Requests" value={booking.specialRequests} />}
                    </div>

                    {/* Payment Details */}
                    <div className="p-4 rounded-lg bg-gray-50 border space-y-2">
                       <h4 className="font-semibold text-gray-800 mb-2">Payment Details</h4>
                       {/* --- MODIFIED: Price Display Logic --- */}
                       {booking.itemType === 'transport' && booking.status === 'pending' && booking.totalPrice === 0 ? (
                          <p className="text-sm font-semibold text-center text-blue-600">
                            Total Price: <span className="text-gray-700">Pending Quote</span>
                          </p>
                        ) : (
                          <>
                            <DetailRow label="Total Price" value={formatPrice(booking.totalPrice)} className="font-semibold" />
                            <DetailRow label="Amount Paid" value={formatPrice(booking.amountPaid)} className="text-green-600" />
                            {booking.totalPrice > booking.amountPaid && booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                              <DetailRow label="Balance Due" value={formatPrice(booking.totalPrice - booking.amountPaid)} className="font-semibold text-red-600" />
                            )}
                          </>
                        )}
                        {/* --- END MODIFIED Price Display Logic --- */}
                        <DetailRow label="Payment Option" value={booking.paymentOption} />
                        {booking.paymentDueDate && <DetailRow label="Payment Due" value={formatDate(booking.paymentDueDate)} className="text-red-600" />}
                    </div>

                    {/* Admin Notes */}
                    {booking.notes && booking.notes.length > 0 && (
                      <div className="p-4 rounded-lg bg-gray-50 border space-y-3">
                         <h4 className="font-semibold text-gray-800 mb-2">Notes from our Team</h4>
                         {booking.notes.slice().reverse().map((note, index) => (
                           <div key={index} className="text-sm border-b pb-2 last:border-b-0">
                             <p className="text-gray-700">{note.note}</p>
                             <p className="text-xs text-gray-400 mt-1">On {formatDate(note.date)}</p>
                           </div>
                         ))}
                      </div>
                    )}

                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t text-right">
                  <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


// --- PaymentModal ---
const PaymentModal = ({ booking, isOpen, onClose, onSuccess }) => {
  const [paymentProof, setPaymentProof] = useState(null);
  const [manualPaymentReference, setManualPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentQR, setPaymentQR] = useState('');
  const [qrLoading, setQrLoading] = useState(true);

  const remainingBalance = booking.totalPrice - booking.amountPaid;

  // Fetch Payment QR Code
  useEffect(() => {
    if (isOpen) {
        setQrLoading(true);
        DataService.fetchContent('paymentQR')
            .then(qrResponse => {
                if (qrResponse.success && qrResponse.data.content) {
                    setPaymentQR(getImageUrl(qrResponse.data.content));
                }
            })
            .catch(err => setError('Failed to load payment QR code.'))
            .finally(() => setQrLoading(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentProof || !manualPaymentReference) {
      setError('Both payment proof and bank reference are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('amount', remainingBalance);
    formData.append('paymentProof', paymentProof);
    formData.append('manualPaymentReference', manualPaymentReference);

    try {
      const result = await DataService.addPayment(booking._id, formData);
      if (result.success) {
        onSuccess(result.data); // Pass updated booking back
      } else {
        setError(result.message || 'Failed to add payment.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "ease-in duration-200", leaveFrom: "opacity-100", leaveTo: "opacity-0" }}>
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} {...{ enter: "ease-out duration-300", enterFrom: "opacity-0 scale-95", enterTo: "opacity-100 scale-100", leave: "ease-in duration-200", leaveFrom: "opacity-100 scale-100", leaveTo: "opacity-0 scale-95" }}>
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Dialog.Title className="text-xl font-bold text-gray-900">Add Payment</Dialog.Title>
                      <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>

                    {error && (
                      <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                      </div>
                    )}
                    
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                      <p className="text-sm text-gray-600">You are paying the remaining balance for:</p>
                      <p className="font-semibold text-gray-800">{booking.itemName}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">{formatPrice(remainingBalance)}</p>
                      <p className="text-xs text-gray-500">Total: {formatPrice(booking.totalPrice)} - Paid: {formatPrice(booking.amountPaid)}</p>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-center mb-3">
                          {qrLoading ? <p className="text-sm text-gray-500">Loading QR...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR" className="max-w-[150px] max-h-[150px] border rounded-md shadow-sm" /> : <p className="text-sm text-red-500">QR code not available.</p>}
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-700">Bank Transaction Reference *</label>
                         <input
                           type="text"
                           value={manualPaymentReference}
                           onChange={(e) => setManualPaymentReference(e.target.value)}
                           required
                           className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                           placeholder="Enter reference from your receipt"
                         />
                       </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Upload Payment Proof *</label> 
                        <input
                          type="file"
                          name="paymentProof"
                          onChange={(e) => setPaymentProof(e.target.files[0])}
                          accept="image/*"
                          required
                          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                         {paymentProof && <span className="text-xs text-green-600 italic">File selected: {paymentProof.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                     <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 disabled:bg-green-400"
                    >
                      {submitting ? 'Submitting...' : 'Submit Payment'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};


export default CustomerDashboard;