// client/src/pages/owner/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, FileText, Settings, MessageSquare, Users,
    Car, MapPin, LogOut, Menu, X, Bell, User, Star, HelpCircle, Tag, QrCode, Activity, Clock, Eye, Check, Link as LinkIcon, Hash, Package, DollarSign, Image as ImageIcon, Paperclip, CreditCard, Info, Bus,
    Phone
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import BookingCalendar from './BookingCalendar';
import { useSocket } from '../../hooks/useSocket.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import adBG from '../../assets/adBG.jpg';
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; 

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatPrice = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
};
const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
};
const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getStatusBadge = (status) => {
    const config = {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
        confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed (Awaiting Balance)' },
        fully_paid: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Fully Paid' },
        rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
        completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
        cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
};

const PaymentProofImage = ({ paymentProofUrl }) => {
    const { secureUrl, loading } = useSecureImage(paymentProofUrl);
    if (!paymentProofUrl) {
        return <p className="text-sm text-gray-500 mt-2">No proof uploaded.</p>;
    }
    if (loading) {
        return <div className="text-center py-4 text-sm text-gray-500">Loading payment proof...</div>;
    }
    if (!secureUrl) {
        return <p className="text-sm text-red-500 text-center py-4">Secure Image Access Failed.</p>;
    }
    return (
        <a href={secureUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
            <img
                src={secureUrl}
                alt="Payment Proof"
                className="w-full h-auto max-h-40 rounded-lg object-contain border mt-2"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x200/fecaca/991b1b?text=Error+Loading'; }}
            />
        </a>
    );
};

const SecureAttachmentLink = ({ attachmentPath, originalName }) => {
    const { secureUrl, loading } = useSecureImage(attachmentPath);
    if (loading) return <span className="text-xs text-gray-500 italic">Loading attachment...</span>;
    if (!secureUrl) return <span className="text-xs text-red-500 italic">Error loading attachment</span>;
    return (
        <a
            href={secureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
            download={originalName}
        >
            <Paperclip size={14} /> {originalName || 'View Attachment'}
        </a>
    );
};
// --- Sub-Components (InfoBlock, InfoRow) ---
const InfoBlock = ({ title, icon: Icon, children }) => (
    <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Icon size={18} /> {title}</h3>
        <div className="space-y-2">{children}</div>
    </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between text-sm py-1">
        <span className="text-gray-600 flex items-center gap-1.5 mb-1 sm:mb-0 whitespace-nowrap">{Icon && <Icon size={14} className="flex-shrink-0" />} {label}:</span>
        <span className="font-medium text-gray-800 text-left sm:text-right break-words">{value || 'N/A'}</span>
    </div>
);

const BookingDetailModal = ({ booking: initialBooking, onClose, onUpdate }) => {
    const [selectedBooking, setSelectedBooking] = useState(initialBooking); 
    const [adminNotes, setAdminNotes] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [paymentDueDuration, setPaymentDueDuration] = useState(48);
    const [paymentDueUnit, setPaymentDueUnit] = useState('hours');

    useEffect(() => {
        setSelectedBooking(initialBooking);
        setAdminNotes('');
        setAttachment(null);
        setPaymentDueDuration(48);
        setPaymentDueUnit('hours');
    }, [initialBooking]);

    const handleStatusUpdate = async (newStatus) => {
        if ((newStatus === 'rejected' || newStatus === 'cancelled') && !adminNotes.trim()) {
            alert('Please provide a note/reason for rejecting or cancelling.');
            return;
        }

        setUpdating(true);
        try {
            const formData = new FormData();
            formData.append('status', newStatus);
            formData.append('adminNotes', adminNotes.trim());

            if (newStatus === 'confirmed' && selectedBooking?.paymentOption === 'downpayment') {
                const duration = parseInt(paymentDueDuration, 10);
                if (isNaN(duration) || duration <= 0) {
                    throw new Error("Invalid payment due duration. Please enter a positive number.");
                }
                formData.append('paymentDueDuration', duration);
                formData.append('paymentDueUnit', paymentDueUnit);
            }

            if (attachment) {
                formData.append('attachment', attachment);
            }

            await DataService.updateBookingStatus(selectedBooking._id, formData);

            alert(`Booking status updated to ${newStatus} successfully!`);
            onUpdate(); 
            onClose(); 
        } catch (error) {
            console.error('Error updating booking status:', error);
            alert(`Failed to update booking status: ${error.message || 'Please try again.'}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!adminNotes.trim()) {
            alert('Please provide a reason for cancellation in the notes.');
            return;
        }
        if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            setUpdating(true);
            try {
                const formData = new FormData();
                formData.append('adminNotes', adminNotes.trim());
                if (attachment) {
                    formData.append('attachment', attachment);
                }
                await DataService.cancelBooking(selectedBooking._id, formData);

                alert('Booking cancelled successfully!');
                onUpdate(); 
                onClose(); 
            } catch (error) {
                console.error('Error cancelling booking:', error);
                alert(`Failed to cancel booking: ${error.message || 'Please try again.'}`);
            } finally {
                setUpdating(false);
            }
        }
    };
    if (!selectedBooking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col">
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                            <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {selectedBooking.bookingReference}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <InfoBlock title="Booking Summary" icon={FileText}>
                                <InfoRow label="Name" value={`${selectedBooking.firstName} ${selectedBooking.lastName}`} icon={User} />
                                <InfoRow label="Address" value={selectedBooking.address} icon={MapPin} />
                                <InfoRow label="Email" value={selectedBooking.email} icon={MessageSquare} />
                                <InfoRow label="Phone" value={selectedBooking.phone} icon={Phone} />
                                <hr className="my-2" />
                                <InfoRow label="Service" value={selectedBooking.itemName} icon={selectedBooking.itemType === 'car' ? Car : Package} />
                                <InfoRow label="Start Date/Time" value={formatDateTime(selectedBooking.startDate)} icon={Calendar} />
                                <InfoRow label="End Date" value={formatDateOnly(selectedBooking.endDate)} icon={Calendar} />
                                {selectedBooking.itemType === 'car' ? (
                                    <>
                                        <InfoRow label="Delivery Method" value={selectedBooking.deliveryMethod} icon={Car} />
                                        <InfoRow label="Location" value={selectedBooking.deliveryMethod === 'pickup' ? selectedBooking.pickupLocation : selectedBooking.dropoffLocation} icon={MapPin} />
                                    </>
                                ) : (
                                    <InfoRow label="Number of Guests" value={selectedBooking.numberOfGuests} icon={Users} />
                                )}
                                <InfoRow label="Special Requests" value={selectedBooking.specialRequests} />
                                <hr className="my-2" />
                                <InfoRow label="Payment Option" value={selectedBooking.paymentOption} icon={CreditCard} />
                                {selectedBooking.promotionTitle && <InfoRow label="Discount Applied" value={selectedBooking.promotionTitle} icon={Tag} />}
                                {selectedBooking.originalPrice && <InfoRow label="Original Price" value={formatPrice(selectedBooking.originalPrice)} />}
                                <div className="flex justify-between items-center mt-4 pt-2 border-t">
                                    <span className="font-semibold text-gray-900">Final Price:</span>
                                    <span className="font-bold text-lg text-blue-600">{formatPrice(selectedBooking.totalPrice)}</span>
                                </div>
                            </InfoBlock>

                            <InfoBlock title="Communication Log" icon={Info}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold">Current Status:</span>
                                    {getStatusBadge(selectedBooking.status)}
                                </div>
                                {selectedBooking.notes && selectedBooking.notes.length > 0 ? (
                                    selectedBooking.notes.slice().reverse().map((note, index) => (
                                        <div key={index} className="text-sm text-gray-700 bg-gray-100 p-3 rounded-md mt-2 border-l-4 border-gray-300">
                                            <p className="whitespace-pre-wrap">{note.note}</p>
                                            {note.attachment && (
                                                <div className="mt-2">
                                                    <SecureAttachmentLink
                                                        attachmentPath={note.attachment}
                                                        originalName={note.attachmentOriginalName}
                                                    />
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1 italic">
                                                By {note.author?.firstName || 'Staff'} on {formatDateTime(note.date)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No notes added yet.</p>
                                )}
                            </InfoBlock>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <InfoBlock title="Payment Details" icon={DollarSign}>
                                {selectedBooking.payments.map((payment, index) => (
                                    <div key={index} className="pb-4 border-b last:border-b-0">
                                        <p className="font-semibold mb-2">Payment {index + 1} ({formatDateTime(payment.paymentDate)})</p>
                                        <InfoRow label="System Pay Code" value={payment.paymentReference} />
                                        <InfoRow label="Bank Reference" value={payment.manualPaymentReference || 'N/A'} />
                                        <InfoRow label="Amount Paid" value={formatPrice(payment.amount)} />
                                        <PaymentProofImage paymentProofUrl={payment.paymentProof} />
                                    </div>
                                ))}
                                <div className="flex justify-between items-center text-green-700 mt-4 pt-4 border-t">
                                    <span className="text-lg font-semibold">Total Paid:</span>
                                    <span className="text-2xl font-bold">{formatPrice(selectedBooking.amountPaid)}</span>
                                </div>
                                {selectedBooking.totalPrice > selectedBooking.amountPaid && (
                                    <div className="text-center text-sm text-red-600 mt-2 font-semibold">
                                        Remaining Balance: {formatPrice(selectedBooking.totalPrice - selectedBooking.amountPaid)}
                                    </div>
                                )}
                                {selectedBooking.paymentDueDate && selectedBooking.status === 'confirmed' && (
                                    <div className="text-center text-sm text-orange-600 mt-2 font-semibold bg-orange-50 p-2 rounded border border-orange-200">
                                        Payment Due By: {formatDateTime(selectedBooking.paymentDueDate)}
                                    </div>
                                )}
                            </InfoBlock>

                            <InfoBlock title="Admin Actions" icon={FileText}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Add Note / Status Change Reason *</label>
                                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Add notes for the customer (required for Reject/Cancel)..." />
                                <div className="mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="file" onChange={(e) => setAttachment(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                        {attachment && <button onClick={() => { setAttachment(null); const input = document.querySelector('input[type="file"]'); if (input) input.value = ''; }}><X size={16} className="text-red-500" /></button>}
                                    </div>
                                    {attachment && <span className="text-xs text-gray-500 italic mt-1 block">File: {attachment.name}</span>}
                                </div>

                                {selectedBooking.status === 'pending' && selectedBooking.paymentOption === 'downpayment' && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm font-medium text-blue-800 mb-2">Set Payment Due Date (Required for Confirmation)</p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={paymentDueDuration}
                                                onChange={(e) => setPaymentDueDuration(e.target.value)}
                                                className="w-20 p-2 border rounded-md"
                                                required
                                            />
                                            <select
                                                value={paymentDueUnit}
                                                onChange={(e) => setPaymentDueUnit(e.target.value)}
                                                className="p-2 border rounded-md bg-white"
                                            >
                                                <option value="hours">Hours</option>
                                                <option value="days">Days</option>
                                            </select>
                                            <span className="text-sm text-gray-600">after confirmation</span>
                                        </div>
                                    </div>
                                )}
                            </InfoBlock>

                            <div className="mt-6 space-y-3">
                                {selectedBooking.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleStatusUpdate('confirmed')} disabled={updating || (selectedBooking.paymentOption === 'downpayment' && !paymentDueDuration)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><Check size={16} /> Confirm</button>
                                        <button onClick={() => handleStatusUpdate('rejected')} disabled={updating || !adminNotes.trim()} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Reject *</button>
                                    </div>
                                )}
                                {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'fully_paid') && (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleStatusUpdate('completed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"><Check size={16} /> Mark Completed</button>
                                        <button onClick={() => handleCancelBooking()} disabled={updating || !adminNotes.trim()} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Cancel Booking *</button>
                                    </div>
                                )}
                                {(selectedBooking.status === 'rejected' || selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
                                    <p className="text-sm text-center text-gray-500 italic py-4">No further actions available for this booking status.</p>
                                )}
                                <p className="text-xs text-gray-500 text-center">* Note required for Reject/Cancel actions.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { socket } = useSocket();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);

    const isDashboardPage = location.pathname === '/owner' || location.pathname === '/owner/dashboard';
    const { data: dashboardData, loading, error, refetch: fetchDashboardData } = useApi(() => DataService.fetchDashboardAnalytics(), [], { immediate: isDashboardPage });
    const { data: activityLogData, loading: activityLogLoading, refetch: fetchActivityLogs } = useApi(() => DataService.fetchActivityLogs(), [], { immediate: isDashboardPage });

    const navigation = [
        { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
        { name: 'Manage Cars', href: '/owner/manage-cars', icon: Car },
        { name: 'Manage Tours', href: '/owner/manage-tours', icon: MapPin },
        { name: 'Manage Transport', href: '/owner/manage-transport', icon: Bus, permission: 'transport' }, 
        { name: 'Manage Bookings', href: '/owner/manage-bookings', icon: Calendar },
        { name: 'Manage Refunds', href: '/owner/manage-refunds', icon: DollarSign },
        { name: 'Manage Reviews', href: '/owner/manage-reviews', icon: Star },
        { name: 'Manage Feedback', href: '/owner/manage-feedback', icon: MessageSquare },
        { name: 'Manage FAQs', href: '/owner/manage-faqs', icon: HelpCircle },
        { name: 'Manage Promotions', href: '/owner/manage-promotions', icon: Tag },
        { name: 'Manage QR Code', href: '/owner/manage-qr-code', icon: QrCode },
        { name: 'Reports', href: '/owner/reports', icon: FileText },
        { name: 'Content Management', href: '/owner/content-management', icon: Settings },
        { name: 'Messages', href: '/owner/messages', icon: MessageSquare },
        { name: 'Employee Management', href: '/owner/employee-management', icon: Users },
        { name: 'Customer Management', href: '/owner/customer-management', icon: Users },
        { name: 'Account Settings', href: '/owner/account-settings', icon: Settings },
    ];

    // --- Real-time Updates ---
    useEffect(() => {
        if (isDashboardPage && socket) {
            const handleRealtimeUpdate = (data) => {
                console.log("Real-time update received:", data.type);
                fetchDashboardData();
                fetchActivityLogs();
            };
            // Listen to all relevant update events
            socket.on('new-booking', handleRealtimeUpdate);
            socket.on('booking-updated', handleRealtimeUpdate);
            socket.on('bookings-updated-by-system', handleRealtimeUpdate); // Listen for job updates
            socket.on('activity-log-update', handleRealtimeUpdate);

            return () => {
                socket.off('new-booking', handleRealtimeUpdate);
                socket.off('booking-updated', handleRealtimeUpdate);
                socket.off('bookings-updated-by-system', handleRealtimeUpdate);
                socket.off('activity-log-update', handleRealtimeUpdate);
            };
        }
    }, [isDashboardPage, socket, fetchDashboardData, fetchActivityLogs]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // --- Main Dashboard View ---
    const renderDashboardView = () => (
        <div className="space-y-8">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.firstName}! Here's a real-time overview of your business.</p>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error.message}</div>}

            {loading ? <p className="text-center py-8 text-gray-500">Loading statistics...</p> : dashboardData && dashboardData.data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <StatCard title="Total Cars" value={dashboardData.data.summary.totalCars || 0} color="blue" />
                    <StatCard title="Total Tours" value={dashboardData.data.summary.totalTours || 0} color="purple" />
                    <StatCard title="Total Bookings" value={dashboardData.data.summary.totalBookings || 0} color="green" />
                    <StatCard title="Pending Bookings" value={dashboardData.data.summary.pendingBookings || 0} color="yellow" />
                    <StatCard title="Total Messages" value={dashboardData.data.summary.totalMessages || 0} color="pink" />
                    <StatCard title="New Messages" value={dashboardData.data.summary.newMessages || 0} color="red" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="text-blue-600" /> Booking Calendar
                    </h2>
                    <BookingCalendar />
                </div>
                <div>
                    <ActivityLogTracker logs={activityLogData?.data || []} loading={activityLogLoading} />
                </div>
            </div>

            {dashboardData && dashboardData.data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <RecentActivityList
                        title="Recent Bookings"
                        items={dashboardData.data.recentBookings}
                        type="booking"
                        onItemClick={(item) => setSelectedBooking(item)}
                    />
                    <RecentActivityList
                        title="Recent Messages"
                        items={dashboardData.data.recentMessages}
                        type="message"
                        onItemClick={(item) => navigate('/owner/messages', { state: { selectedMessageId: item._id } })}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="relative min-h-screen bg-gray-100" style={{ backgroundImage: `url(${adBG})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>
            <div className="relative flex h-full min-h-screen">
                <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-black/30 backdrop-blur-lg text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}>
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            {sidebarOpen && (
                                <div>
                                    <h2 className="text-xl font-bold">DoRayd</h2>
                                    <p className="text-white/70 text-xs">Admin Portal</p>
                                </div>
                            )}
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto py-4">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.href);
                            return (
                                <Link key={item.name} to={item.href} className={`flex items-center gap-3 px-6 py-3 transition-all ${isActive ? 'bg-white/90 text-blue-600' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                                    <Icon size={20} className={!sidebarOpen ? 'mx-auto' : ''} />
                                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-white/10">
                        {sidebarOpen && (
                            <div className="mb-2">
                                <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-gray-300">{user?.role}</p>
                            </div>
                        )}
                        <button onClick={handleLogout} className={`w-full text-left flex items-center text-sm text-red-400 hover:bg-red-500/20 p-2 rounded-lg ${!sidebarOpen ? 'justify-center' : ''}`}>
                            <LogOut className={`w-4 h-4 ${sidebarOpen ? 'mr-2' : ''}`} /> {sidebarOpen && 'Sign Out'}
                        </button>
                    </div>
                </aside>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="flex justify-between items-center p-4 bg-white/10 backdrop-blur-lg border-b border-white/20 text-white z-10">
                        <div className="flex items-center">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-4"><Menu size={24} /></button>
                            <h1 className="text-xl font-semibold">{navigation.find(t => location.pathname.startsWith(t.href))?.name || 'Dashboard'}</h1>
                        </div>
                        {/* Optional: Add header elements like notifications or user profile here if needed */}
                    </header>

                    <main className="flex-1 overflow-y-auto p-6">
                        {isDashboardPage ? renderDashboardView() : <Outlet />}
                    </main>
                </div>
            </div>
            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onUpdate={() => {
                        fetchDashboardData(); // Refetch dashboard data which includes recent bookings
                    }}
                />
            )}
        </div>
    );
};


// --- Re-styled Components ---
const StatCard = ({ title, value, color }) => {
    const colorMap = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        yellow: 'from-yellow-500 to-orange-500',
        pink: 'from-pink-500 to-rose-500',
        red: 'from-red-500 to-red-600'
    };
    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            {/* ICON DIV REMOVED */}
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
        </div>
    );
};
const RecentActivityList = ({ title, items, type, onItemClick }) => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-blue-50/50">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto"> {/* Added scroll */}
            {items && items.length > 0 ? items.map(item => (
                <div
                    key={item._id}
                    className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onItemClick(item)}
                >
                    <div>
                        <p className="font-semibold text-gray-900">{type === 'booking' ? item.bookingReference : item.subject}</p>
                        <p className="text-gray-600 text-sm">{type === 'booking' ? `${item.firstName} ${item.lastName}` : item.name}</p> {/* Use firstName/lastName for guest bookings */}
                    </div>
                    <div className="text-right">
                        {type === 'booking' && (
                            <>
                                <p className="font-bold text-blue-600 text-sm">{formatPrice(item.totalPrice)}</p>
                                {/* Use getStatusBadge for consistency */}
                                <div className="mt-1">{getStatusBadge(item.status)}</div>
                            </>
                        )}
                        {type === 'message' && getStatusBadge(item.status)} {/* Show status for messages */}
                        <p className="text-gray-500 text-xs mt-1">{formatDate(item.createdAt)}</p> {/* Smaller text */}
                    </div>
                </div>
            )) : <p className="text-center text-gray-500 py-8">No recent activity.</p>}
        </div>
    </div>
);
const ActivityLogTracker = ({ logs, loading }) => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 flex flex-col max-h-[700px]"> {/* Adjusted max height */}
        <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-purple-50/50">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-purple-600" /> Employee Activity Log
            </h3>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto flex-grow"> {/* Added flex-grow */}
            {loading ? <p className="text-center text-gray-500 py-8">Loading activities...</p> :
                logs.length > 0 ? logs.map(log => (
                    <Link to={log.link || '#'} key={log._id} className="block hover:bg-white/50 p-3 rounded-xl transition-all border-b last:border-b-0">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                <User size={16} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{log.employee?.firstName} {log.employee?.lastName || 'Unknown'}</p>
                                <p className="text-xs text-gray-600">{log.action.replace(/_/g, ' ').toLowerCase()} - {log.details}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </Link>
                )) : <p className="text-center text-gray-500 py-8">No employee activity recorded yet.</p>}
        </div>
    </div>
);

export default AdminDashboard;