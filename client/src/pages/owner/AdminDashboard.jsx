import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, FileText, Settings, MessageSquare, Users,
    Car, MapPin, LogOut, Menu, X, Bell, User, Star, HelpCircle, Tag, QrCode, Activity, Clock, Eye, Check, Link as LinkIcon, Hash, Package, DollarSign, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import BookingCalendar from './BookingCalendar';
import { useSocket } from '../../hooks/useSocket.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import adBG from '../../assets/adBG.jpg';

// --- Helper Functions ---
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatPrice = (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
};
const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
};


// --- Sub-Components ---
const InfoBlock = ({ title, icon: Icon, children }) => (
  <div className="bg-gray-50 p-4 rounded-lg border">
    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Icon size={18} /> {title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600 flex items-center gap-1.5">{Icon && <Icon size={14} />} {label}:</span>
    <span className="font-medium text-gray-800 text-right">{value || 'N/A'}</span>
  </div>
);

const BookingDetailModal = ({ booking, onClose, onUpdate }) => {
    const [adminNotes, setAdminNotes] = useState(booking?.adminNotes || '');
    const [updating, setUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus) => {
        setUpdating(true);
        try {
            await DataService.updateBookingStatus(booking._id, newStatus, adminNotes);
            alert(`Booking ${newStatus} successfully!`);
            onUpdate(); // Refetch bookings
            onClose();
        } catch (error) {
            alert('Failed to update booking status.');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            setUpdating(true);
            try {
                await DataService.cancelBooking(booking._id, adminNotes);
                alert('Booking cancelled successfully!');
                onUpdate();
                onClose();
            } catch (error) {
                alert('Failed to cancel booking.');
            } finally {
                setUpdating(false);
            }
        }
    };

    if (!booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                            <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {booking.bookingReference}</p>
                        </div>
                        <button onClick={onClose}><X /></button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                           <InfoBlock title="Customer Information" icon={User}>
                                <InfoRow label="Name" value={`${booking.firstName} ${booking.lastName}`} />
                                <InfoRow label="Email" value={booking.email} />
                                <InfoRow label="Phone" value={booking.phone} />
                            </InfoBlock>
                            <InfoBlock title="Booking Details" icon={Calendar}>
                                <InfoRow label="Service Type" value={booking.itemType} icon={booking.itemType === 'car' ? Car : Package} />
                                <InfoRow label="Service Name" value={booking.itemName} />
                                <InfoRow label="Pickup/Start" value={formatDateTime(booking.startDate)} icon={Clock} />
                                {booking.endDate && <InfoRow label="Return Date" value={formatDate(booking.endDate)} />}
                            </InfoBlock>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <InfoBlock title="Payment Details" icon={ImageIcon}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800">Total Amount Due:</span>
                                    <span className="text-2xl font-bold text-blue-600">{formatPrice(booking.totalPrice)}</span>
                                </div>
                                {booking.paymentProofUrl ? (
                                    <a href={getImageUrl(booking.paymentProofUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 block">
                                        <img src={getImageUrl(booking.paymentProofUrl)} alt="Payment Proof" className="w-full h-auto rounded-lg object-contain border" />
                                    </a>
                                ) : <p className="text-sm text-gray-500 text-center py-8">No payment proof uploaded.</p>}
                            </InfoBlock>
                             <InfoBlock title="Admin Actions" icon={FileText}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold">Current Status:</span>
                                    {getStatusBadge(booking.status)}
                                </div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" className="w-full p-2 border rounded-lg" placeholder="Add notes for the customer..." />
                            </InfoBlock>
                             {booking.status === 'pending' && (
                                <div className="flex gap-3">
                                    <button onClick={() => handleStatusUpdate('confirmed')} disabled={updating} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><Check size={16} /> Confirm</button>
                                    <button onClick={() => handleStatusUpdate('rejected')} disabled={updating} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><X size={16} /> Reject</button>
                                </div>
                            )}
                            {booking.status === 'confirmed' && (
                                <div className="flex gap-3">
                                    <button onClick={() => handleStatusUpdate('completed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><Check size={16} /> Mark as Completed</button>
                                    <button onClick={handleCancel} disabled={updating} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><X size={16} /> Cancel Booking</button>
                                </div>
                            )}
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

    // --- Data Fetching Hooks ---
    const { data: dashboardData, loading, error, refetch: fetchDashboardData } = useApi(() => DataService.fetchDashboardAnalytics(), [], { immediate: isDashboardPage });
    const { data: activityLogData, loading: activityLogLoading, refetch: fetchActivityLogs } = useApi(() => DataService.fetchActivityLogs(), [], { immediate: isDashboardPage });

    const navigation = [
        { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
        { name: 'Manage Cars', href: '/owner/manage-cars', icon: Car },
        { name: 'Manage Tours', href: '/owner/manage-tours', icon: MapPin },
        { name: 'Manage Bookings', href: '/owner/manage-bookings', icon: Calendar },
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
            const handleRealtimeUpdate = () => {
                fetchDashboardData();
                fetchActivityLogs();
            };
            socket.on('new-booking', handleRealtimeUpdate);
            socket.on('activity-log-update', handleRealtimeUpdate);
            return () => {
                socket.off('new-booking', handleRealtimeUpdate);
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
                    <StatCard title="Total Cars" value={dashboardData.data.summary.totalCars || 0} icon={Car} color="blue" />
                    <StatCard title="Total Tours" value={dashboardData.data.summary.totalTours || 0} icon={MapPin} color="purple" />
                    <StatCard title="Total Bookings" value={dashboardData.data.summary.totalBookings || 0} icon={Calendar} color="green" />
                    <StatCard title="Pending Bookings" value={dashboardData.data.summary.pendingBookings || 0} icon={Clock} color="yellow" />
                    <StatCard title="Total Messages" value={dashboardData.data.summary.totalMessages || 0} icon={MessageSquare} color="pink" />
                    <StatCard title="New Messages" value={dashboardData.data.summary.newMessages || 0} icon={Bell} color="red" />
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
                </aside>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="flex justify-between items-center p-4 bg-white/10 backdrop-blur-lg border-b border-white/20 text-white z-10">
                        <div className="flex items-center">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-4"><Menu size={24} /></button>
                            <h1 className="text-xl font-semibold">{navigation.find(t => location.pathname.startsWith(t.href))?.name || 'Dashboard'}</h1>
                        </div>
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
                        fetchDashboardData();
                        setSelectedBooking(null);
                    }}
                />
            )}
        </div>
    );
};

// --- Re-styled Components ---
const StatCard = ({ title, value, icon: Icon, color }) => {
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
            <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="text-white" size={24} />
            </div>
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
        <div className="p-6 space-y-4">
            {items && items.length > 0 ? items.map(item => (
                <div
                    key={item._id}
                    className="flex justify-between items-center p-4 bg-white/50 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onItemClick(item)}
                >
                    <div>
                        <p className="font-semibold text-gray-900">{type === 'booking' ? item.bookingReference : item.subject}</p>
                        <p className="text-gray-600 text-sm">{type === 'booking' ? `${item.user?.firstName} ${item.user?.lastName}` : item.name}</p>
                    </div>
                    <div className="text-right">
                        {type === 'booking' && (
                            <>
                                {item.paymentOption === 'downpayment' && item.totalPrice > item.amountPaid ? (
                                    <p className="font-bold text-red-600">
                                        Remaining: {formatPrice(item.totalPrice - item.amountPaid)}
                                    </p>
                                ) : (
                                    <p className="font-bold text-blue-600">{formatPrice(item.totalPrice)}</p>
                                )}
                            </>
                        )}
                        <p className="text-gray-500 text-sm">{formatDate(item.createdAt)}</p>
                    </div>
                </div>
            )) : <p className="text-center text-gray-500 py-8">No recent activity.</p>}
        </div>
    </div>
);
const ActivityLogTracker = ({ logs, loading }) => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 flex flex-col max-h-[700px]">
        <div className="p-6 border-b bg-gradient-to-r from-slate-50 to-purple-50/50">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-purple-600" /> Employee Activity
            </h3>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto">
            {loading ? <p className="text-center text-gray-500 py-8">Loading activities...</p> : 
             logs.length > 0 ? logs.map(log => (
                <Link to={log.link || '#'} key={log._id} className="block hover:bg-white/50 p-3 rounded-xl transition-all">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <User size={18} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-900">{log.employee.firstName} {log.employee.lastName}</p>
                            <p className="text-sm text-gray-600">{log.action.replace(/_/g, ' ').toLowerCase()}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                </Link>
            )) : <p className="text-center text-gray-500 py-8">No employee activity yet.</p>}
        </div>
    </div>
);

export default AdminDashboard;