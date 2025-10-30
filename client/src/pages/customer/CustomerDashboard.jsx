import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Clock, Car, MapPin, Star, MessageSquare, Settings, User, Heart, Award, Upload, Menu, X, ChevronRight, Eye, Check, FileText, Link as LinkIcon, Hash, Package, DollarSign, ImageIcon, Paperclip, Bus
} from 'lucide-react';
import { useAuth } from '@/components/Login.jsx';
import { useApi } from '@/hooks/useApi.jsx';
import DataService, { getImageUrl, SERVER_URL } from '@/components/services/DataService.jsx';
import AccountSettings from '@/pages/shared/AccountSettings.jsx';
import bgTour from '@/assets/bgTour.jpg';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useLocation, Link } from 'react-router-dom'; // <-- IMPORTED Link
import { useSecureImage } from '@/hooks/useSecureImage.jsx'; 

// --- Helper Functions ---
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
};
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
const formatPrice = (price) => {
    if (typeof price !== 'number') return '₱0.00';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
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

const PaymentProofImage = ({ paymentProofUrl }) => {
  const { secureUrl, loading } = useSecureImage(paymentProofUrl);
  
  if (!paymentProofUrl) {
    return <p className="text-sm text-gray-500 mt-2">No proof uploaded.</p>;
  }
  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-500">Loading payment proof...</div>;
  }
  if (!secureUrl) {
    return <p className="text-sm text-red-500 text-center py-4">Secure Image Access Failed. (Login Required/Auth Error)</p>;
  }
  
  return (
    <div className="mt-2">
      <h4 className="text-sm font-semibold">Proof Image:</h4>
      <a href={secureUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img
              src={secureUrl}
              alt="Payment Proof"
              className="w-full h-auto rounded-lg object-contain border"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x200/fecaca/991b1b?text=Error'; }}
          />
      </a>
    </div>
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
            download={originalName} // Suggests the original filename for download
        >
            <Paperclip size={14} /> {originalName || 'View Attachment'}
        </a>
    );
};

// Full Booking Detail Modal
const BookingDetailModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                                {booking.payments.map((payment, index) => (
                                    <div key={index} className="mt-4 border-t pt-4">
                                        <h4 className="text-sm font-semibold">Payment {index + 1}</h4>
                                        <InfoRow label="System Pay Code" value={payment.paymentReference} />
                                        <InfoRow label="Bank Reference" value={payment.manualPaymentReference || 'N/A'} />
                                        <InfoRow label="Amount Paid" value={formatPrice(payment.amount)} />
                                        <PaymentProofImage paymentProofUrl={payment.paymentProof} />
                                    </div>
                                ))}
                            </InfoBlock>
                             <InfoBlock title="Admin Notes" icon={FileText}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold">Current Status:</span>
                                    {getStatusBadge(booking.status)}
                                </div>
                                {booking.notes && booking.notes.length > 0 ? (
                                    booking.notes.map((note, index) => (
                                        <div key={index} className="text-sm text-gray-600 bg-gray-100 p-3 rounded-md mt-2">
                                            <p className="whitespace-pre-wrap">{note.note}</p>
                                            
                                            {/* --- ADDED ATTACHMENT LINK --- */}
                                            {note.attachment && (
                                              <div className="mt-2">
                                                <SecureAttachmentLink
                                                  attachmentPath={note.attachment}
                                                  originalName={note.attachmentOriginalName}
                                                />
                                              </div>
                                            )}
                                            {/* --- END ADDED BLOCK --- */}
                                            
                                            <p className="text-xs text-gray-500 mt-1 italic">
                                                Note from Admin on {formatDateTime(note.date)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No notes from admin.</p>
                                )}
                            </InfoBlock>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NEW REUSABLE COMPONENT ---
// This component displays the lists of services (Cars, Tours, Transport) for selection
const BookingSelector = ({ carBookings, tourBookings, transportBookings, onSelectBooking, selectedBookingId }) => {
  
  const renderBookingList = (bookings, Icon, colorClass) => (
    <div className="space-y-3">
      {bookings.map(booking => (
        <button
          type="button"
          key={booking._id}
          onClick={() => onSelectBooking(booking)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
            selectedBookingId === booking._id
              ? `border-${colorClass}-500 bg-${colorClass}-50 ring-2 ring-${colorClass}-200`
              : 'border-gray-200 bg-white hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 text-${colorClass}-600 flex-shrink-0`} />
            <div>
              <p className="font-semibold text-gray-900">{booking.itemName}</p>
              <p className="text-sm text-gray-500">
                {booking.bookingReference} | Completed: {formatDate(booking.endDate || booking.startDate)}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {carBookings.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Car className="text-blue-600" /> Cars</h3>
          {renderBookingList(carBookings, Car, 'blue')}
        </section>
      )}
      {tourBookings.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><MapPin className="text-green-600" /> Tours</h3>
          {renderBookingList(tourBookings, MapPin, 'green')}
        </section>
      )}
      {transportBookings.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Bus className="text-purple-600" /> Transport</h3>
          {renderBookingList(transportBookings, Bus, 'purple')}
        </section>
      )}
    </div>
  );
};
// --- END NEW COMPONENT ---


const CustomerDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname.includes('my-bookings') ? 'bookings' : 'overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

    const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useApi(() => DataService.fetchUserBookings(), [user, location]);
    const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useApi(() => DataService.getMyReviews(), [user]);
    const { data: feedbackData, loading: feedbackLoading, refetch: refetchFeedback } = useApi(() => DataService.getMyFeedback(), [user]);
    const { data: publicFeedbackData, loading: publicFeedbackLoading } = useApi(() => DataService.getPublicFeedback(), []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabFromQuery = params.get('tab');
        
        const validTabIds = [
            'overview', 'bookings', 'reviews', 'feedback', 
            'leave-review', 'leave-feedback', 'public-feedback', 'settings'
        ];

        if (tabFromQuery && validTabIds.includes(tabFromQuery)) {
            setActiveTab(tabFromQuery);
        } else if (location.pathname.includes('my-bookings') && !tabFromQuery) {
            setActiveTab('bookings');
        } else {
            setActiveTab('overview');
        }
    }, 
    [location.search, location.pathname]);
    const bookings = bookingsData?.data || [];
    const myReviews = reviewsData?.data || [];
    const myFeedback = feedbackData?.data || [];
    const publicFeedback = publicFeedbackData?.data || [];

    const completedBookings = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);
    const reviewedBookingIds = useMemo(() => new Set(myReviews.map(r => String(r.booking))), [myReviews]);
    const feedbackBookingIds = useMemo(() => new Set(myFeedback.map(f => String(f.booking))), [myFeedback]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'bookings', label: 'My Bookings', icon: Calendar },
        { id: 'reviews', label: 'My Reviews', icon: Star },
        { id: 'feedback', label: 'My Feedback', icon: MessageSquare },
        { id: 'leave-review', label: 'Leave Review', icon: Award },
        { id: 'leave-feedback', label: 'Leave Feedback', icon: Heart },
        { id: 'public-feedback', label: 'Customer Feedback', icon: MessageSquare },
        { id: 'settings', label: 'Account Settings', icon: Settings }
    ];

    const stats = [
        { title: 'Total Bookings', value: bookings.length, icon: Calendar },
        { title: 'Completed', value: completedBookings.length, icon: Clock },
        { title: 'My Reviews', value: myReviews.length, icon: Star },
        { title: 'My Feedback', value: myFeedback.length, icon: MessageSquare }
    ];
    
    const handleAddPayment = (booking) => {
        setSelectedBooking(booking);
        setShowAddPaymentModal(true);
    };

    if (bookingsLoading) {
        return <div className="flex justify-center items-center min-h-screen bg-gray-50">Loading...</div>;
    }

    return (
        <div className="relative min-h-screen bg-gray-100" style={{ backgroundImage: `url(${bgTour})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
             <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>
             <div className="relative flex w-full min-h-screen">
                {/* Sidebar */}
                <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-black/30 backdrop-blur-lg text-white transition-all duration-300 flex flex-col shadow-2xl z-20 flex-shrink-0`}>
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            {sidebarOpen && (
                                <div>
                                    <h2 className="text-xl font-bold">DoRayd</h2>
                                    <p className="text-white/70 text-xs">Travel & Tours</p>
                                </div>
                            )}
                            <button 
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* User Info */}
                    {sidebarOpen && (
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                                <div>
                                    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                                    <p className="text-white/70 text-sm">Customer</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-white/90 text-blue-600'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <Icon size={20} />
                                    {sidebarOpen && <span className="font-medium">{tab.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    {sidebarOpen && (
                        <div className="p-4 border-t border-white/10">
                            <p className="text-white/70 text-xs text-center">© 2024 DoRayd Tours</p>
                        </div>
                    )}
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto z-10">
                    {/* Top Bar */}
                    <div className="bg-black/10 backdrop-blur-lg text-white px-8 py-4 sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h1>
                                <p className="text-white/80 text-sm">Welcome back, {user?.firstName}!</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8">
                        {activeTab === 'overview' && (
                            <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    {stats.map((stat, index) => (
                                        <StatCard key={index} {...stat} />
                                    ))}
                                </div>
                                <OverviewTab bookings={bookings} onBookingSelect={setSelectedBooking} />
                            </>
                        )}
                        {activeTab === 'bookings' && <BookingsTab bookings={bookings} onBookingSelect={setSelectedBooking} onAddPayment={handleAddPayment}/>}
                        {activeTab === 'reviews' && <MyReviewsTab reviews={myReviews} />}
                        {activeTab === 'feedback' && <MyFeedbackTab feedback={myFeedback} />}
                        {activeTab === 'leave-review' && (
                            <LeaveReviewTab 
                                bookings={completedBookings} 
                                reviewedBookingIds={reviewedBookingIds}
                                onReviewSubmit={refetchReviews}
                            />
                        )}
                        {activeTab === 'leave-feedback' && (
                            <LeaveFeedbackTab 
                                bookings={completedBookings} 
                                feedbackBookingIds={feedbackBookingIds}
                                onFeedbackSubmit={refetchFeedback}
                            />
                        )}
                        {activeTab === 'public-feedback' && <PublicFeedbackTab feedback={publicFeedback} />}
                        {activeTab === 'settings' && <AccountSettings />}
                    </div>
                </main>
            </div>
            
            {selectedBooking && !showAddPaymentModal && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                />
            )}

            {showAddPaymentModal && selectedBooking && (
                <AddPaymentModal
                    booking={selectedBooking}
                    onClose={() => setShowAddPaymentModal(false)}
                    onPaymentSuccess={() => {
                        setShowAddPaymentModal(false);
                        refetchBookings();
                    }}
                />
            )}
        </div>
    );
};

// --- Other components remain unchanged ---
// StatCard
const StatCard = ({ title, value }) => (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
);

// OverviewTab
const OverviewTab = ({ bookings, onBookingSelect }) => {
    
    const events = useMemo(() => bookings.map(booking => ({
        id: booking._id,
        title: booking.itemName,
        start: new Date(booking.startDate),
        end: booking.endDate ? new Date(booking.endDate) : new Date(booking.startDate),
        allDay: true,
        backgroundColor: getStatusColorForCalendar(booking.status),
        borderColor: getStatusColorForCalendar(booking.status)
    })), [bookings]);

    const handleEventClick = (clickInfo) => {
        const booking = bookings.find(b => b._id === clickInfo.event.id);
        if (booking) {
            onBookingSelect(booking);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-gray-900">My Booking Calendar</h2>
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next',
                        center: 'title',
                        right: 'today'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    dayMaxEvents={true}
                />
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Recent Bookings</h2>
                <div className="space-y-4">
                    {bookings.slice(0, 5).map(booking => (
                        <div key={booking._id} className="p-4 bg-white/50 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{booking.itemName}</p>
                                    <p className="text-sm text-gray-500">{booking.bookingReference}</p>
                                    <p className="text-sm text-gray-500">{new Date(booking.startDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {bookings.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p>No bookings yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// BookingsTab
const BookingsTab = ({ bookings, onBookingSelect, onAddPayment }) => (
    <div className="space-y-4">
        {bookings.length > 0 ? bookings.map(booking => (
            <div key={booking._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-md">
                            {booking.itemType === 'car' ?
                                <Car className="w-6 h-6 text-white" /> :
                            (booking.itemType === 'transport' ?
                                <Bus className="w-6 h-6 text-white" /> :
                                <MapPin className="w-6 h-6 text-white" />)
                            }
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">{booking.itemName}</h3>
                            {booking.payments && booking.payments[0] && booking.payments[0].paymentReference &&
                                <p className="text-gray-600">Payment Ref: {booking.payments[0].paymentReference}</p>
                            }
                            <p className="text-gray-600">
                                {new Date(booking.startDate).toLocaleDateString()}
                                {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                            </p>
                            {booking.paymentOption === 'downpayment' && booking.totalPrice > booking.amountPaid ? (
                                <p className="font-semibold text-lg mt-2 text-red-600">
                                    Remaining Balance: {formatPrice(booking.totalPrice - booking.amountPaid)}
                                </p>
                            ) : (
                                <p className="font-semibold text-lg mt-2 text-blue-600">{formatPrice(booking.totalPrice)}</p>
                            )}
                        </div>
                    </div>
                     <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-2 text-sm rounded-lg font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                        </span>
                        <button
                            onClick={() => onBookingSelect(booking)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 mt-2"
                        >
                            <Eye size={14} /> View Details
                        </button>
                        {booking.paymentOption === 'downpayment' && booking.totalPrice > booking.amountPaid && (
                            <button
                                onClick={() => onAddPayment(booking)}
                                className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 mt-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                disabled={booking.status !== 'confirmed'}
                            >
                                <Upload size={14} /> Add Payment
                            </button>
                        )}
                        
                        {/* --- THIS IS THE NEW BUTTON --- */}
                        {['pending', 'confirmed'].includes(booking.status) && (
                            <Link
                                to="/refund-request"
                                className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 mt-2"
                            >
                                <DollarSign size={14} /> Request Refund
                            </Link>
                        )}
                        {/* --- END OF NEW BUTTON --- */}
                        
                    </div>
                </div>
            </div>
        )) : (
            <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">You have no bookings yet.</p>
            </div>
        )}
    </div>
);

// MyReviewsTab
const MyReviewsTab = ({ reviews }) => (
    <div className="space-y-4">
        {reviews.length > 0 ? reviews.map(review => (
            <div key={review._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {review.item?.title || `${review.item?.brand} ${review.item?.model}` || review.itemName}
                        </h3>
                        <div className="flex items-center gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {review.isApproved ? 'Approved' : 'Pending'}
                    </span>
                </div>
                <p className="text-gray-700 bg-white/50 p-4 rounded-lg">{review.comment}</p>
                <p className="text-sm text-gray-500 mt-3">
                    {new Date(review.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>
        )) : (
            <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">You haven't submitted any reviews yet.</p>
            </div>
        )}
    </div>
);

// MyFeedbackTab
const MyFeedbackTab = ({ feedback }) => (
    <div className="space-y-6">
        {feedback.length > 0 ? feedback.map(item => (
            <div key={item._id} className="bg-white/80 backdrop-blur-md p-8 border border-white/20 rounded-xl hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                            ))}
                        </div>
                        <span className="font-semibold text-gray-800">({item.rating}/5)</span>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        item.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {item.isApproved ? 'Approved' : 'Pending'}
                    </span>
                </div>
                <p className="text-gray-800 leading-relaxed mb-4 bg-white/50 p-4 rounded-lg">"{item.comment}"</p>
                {item.image && (
                    <div className="mt-4">
                        <img src={getImageUrl(item.image)} alt="Feedback attachment" className="max-w-xs rounded-lg border shadow-md" />
                    </div>
                )}
                <p className="text-sm text-gray-500 mt-4">
                    Submitted on {new Date(item.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>
        )) : (
            <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
                <p className="text-gray-500 text-lg">You haven't submitted any feedback yet.</p>
            </div>
        )}
    </div>
);

// --- REDESIGNED LeaveReviewTab ---
const LeaveReviewTab = ({ bookings, reviewedBookingIds, onReviewSubmit }) => {
    const [selectedBooking, setSelectedBooking] = useState(null); // Use the full booking object
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filter bookings available for review
    const availableBookings = useMemo(() => 
        bookings.filter(b => b.status === 'completed' && !reviewedBookingIds.has(String(b._id))),
        [bookings, reviewedBookingIds]
    );

    // Separate them by type
    const carBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'car'), 
        [availableBookings]
    );
    const tourBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'tour'), 
        [availableBookings]
    );
    const transportBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'transport'), 
        [availableBookings]
    );

    const handleSelectBooking = (booking) => {
        setSelectedBooking(booking);
        // Clear old form data
        setRating(0);
        setComment('');
        setIsAnonymous(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBooking || !rating || !comment.trim()) {
            alert('Please select a booking, provide a rating, and write a comment.');
            return;
        }

        setSubmitting(true);
        const reviewData = {
            bookingId: selectedBooking._id,
            rating,
            comment: comment.trim(),
            isAnonymous
        };

        try {
            const response = await DataService.submitReview(reviewData);
            
            if (response.success) {
                alert('Review submitted successfully! It will be visible after admin approval.');
                setSelectedBooking(null); // Deselect booking
                onReviewSubmit(); // Refetch reviews
            } else {
                alert('Failed to submit review: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting review: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20">
                        <label className="block text-lg font-semibold text-gray-900 mb-4">
                            Step 1: Select a completed service to review
                        </label>
                        <BookingSelector 
                            carBookings={carBookings}
                            tourBookings={tourBookings}
                            transportBookings={transportBookings}
                            onSelectBooking={handleSelectBooking}
                            selectedBookingId={selectedBooking ? selectedBooking._id : null}
                        />
                    </div>

                    {/* This section only appears after a booking is selected */}
                    {selectedBooking && (
                        <>
                            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <label className="block text-lg font-semibold text-gray-900 mb-4">
                                    Step 2: Rate your experience for <span className="text-blue-600">{selectedBooking.itemName}</span>
                                </label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="p-1 hover:scale-110 transition-transform"
                                        >
                                            <Star 
                                                className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <label className="block text-lg font-semibold text-gray-900 mb-4">
                                    Step 3: Write your review *
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Share your experience with this service..."
                                    maxLength={1000}
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">{comment.length}/1000 characters</p>
                            </div>

                            <div className="flex items-center bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <input
                                    type="checkbox"
                                    id="anonymous-review"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="anonymous-review" className="ml-2 text-sm text-gray-700">
                                    Submit anonymously
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-1/3 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-all font-medium"
                                >
                                    Change Service
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-2/3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            ) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed bookings available for review.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to leave a review!</p>
                </div>
            )}
        </div>
    );
};

// --- REDESIGNED LeaveFeedbackTab ---
const LeaveFeedbackTab = ({ bookings, feedbackBookingIds, onFeedbackSubmit }) => {
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filter bookings available for feedback
    const availableBookings = useMemo(() => 
        bookings.filter(b => b.status === 'completed' && !feedbackBookingIds.has(String(b._id))),
        [bookings, feedbackBookingIds]
    );

    // Separate them by type
    const carBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'car'), 
        [availableBookings]
    );
    const tourBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'tour'), 
        [availableBookings]
    );
    const transportBookings = useMemo(() => 
        availableBookings.filter(b => b.itemType === 'transport'), 
        [availableBookings]
    );

    const handleSelectBooking = (booking) => {
        setSelectedBooking(booking);
        // Clear old form data
        setRating(0);
        setComment('');
        setIsAnonymous(false);
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBooking || !rating || !comment.trim()) {
            alert('Please select a booking, provide a rating, and write your feedback.');
            return;
        }

        setSubmitting(true);
        // Feedback uses FormData for image uploads
        const formData = new FormData();
        formData.append('bookingId', selectedBooking._id);
        formData.append('rating', rating);
        formData.append('comment', comment.trim());
        formData.append('isAnonymous', isAnonymous);
        // Note: Image upload for feedback is not currently implemented in this form
        // but the backend (DataService.submitFeedback) supports it.

        try {
            const response = await DataService.submitFeedback(formData);
            
            if (response.success) {
                alert('Feedback submitted successfully! It will be visible after admin approval.');
                setSelectedBooking(null);
                onFeedbackSubmit();
            } else {
                alert('Failed to submit feedback: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting feedback: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <p className="text-white/80 mb-6">Share your overall experience with DoRayd Travel & Tours for one of your completed services.</p>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20">
                        <label className="block text-lg font-semibold text-gray-900 mb-4">
                            Step 1: Select a service to give feedback on
                        </label>
                        <BookingSelector 
                            carBookings={carBookings}
                            tourBookings={tourBookings}
                            transportBookings={transportBookings}
                            onSelectBooking={handleSelectBooking}
                            selectedBookingId={selectedBooking ? selectedBooking._id : null}
                        />
                    </div>

                    {selectedBooking && (
                        <>
                            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <label className="block text-lg font-semibold text-gray-900 mb-4">
                                    Step 2: Rate your overall experience with <span className="text-green-600">{selectedBooking.itemName}</span>
                                </label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="p-1 hover:scale-110 transition-transform"
                                        >
                                            <Star 
                                                className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                                </div>
                            </div>

                            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <label className="block text-lg font-semibold text-gray-900 mb-4">
                                    Step 3: Write your feedback *
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Tell us about your overall experience with our service..."
                                    maxLength={1000}
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-2">{comment.length}/1000 characters</p>
                            </div>

                            <div className="flex items-center bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/20 animate-in fade-in">
                                <input
                                    type="checkbox"
                                    id="anonymous-feedback"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <label htmlFor="anonymous-feedback" className="ml-2 text-sm text-gray-700">
                                    Submit anonymously
                                </label>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-1/3 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-all font-medium"
                                >
                                    Change Service
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-2/3 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            ) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed bookings available for feedback.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to share your experience!</p>
                </div>
            )}
        </div>
    );
};
// --- END REDESIGNED TABS ---


// PublicFeedbackTab
const PublicFeedbackTab = ({ feedback }) => (
    <div>
        <p className="text-white/80 mb-8">See what our customers are saying about DoRayd Travel & Tours</p>
        
        <div className="space-y-8">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="bg-white/80 backdrop-blur-md p-8 border border-white/20 rounded-xl hover:shadow-lg transition-all">
                    <div className="flex items-start gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                                <p className="font-bold text-lg text-gray-900">
                                    {item.isAnonymous ? 'Anonymous Customer' : `${item.user?.firstName} ${item.user?.lastName}`}
                                </p>
                                <div className="flex items-center gap-1 mt-2 sm:mt-0">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4 bg-white/50 p-4 rounded-lg">"{item.comment}"</p>
                            {item.image && (
                                <div className="mb-4">
                                    <img 
                                        src={getImageUrl(item.image)} 
                                        alt="Feedback attachment" 
                                        className="max-w-xs rounded-lg border shadow-md hover:shadow-lg transition-shadow" 
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Calendar className="w-4 h-4" />
                                {new Date(item.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                                <span className="mx-2">•</span>
                                <MapPin className="w-4 h-4" />
                                <span className="capitalize">{item.serviceType} Service</span>
                            </div>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-700">No public feedback available yet.</h3>
                    <p className="text-gray-500 mt-2">Be the first to share your experience!</p>
                </div>
            )}
        </div>
    </div>
);

// Helper function to get status color (ensure this is defined or imported)
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-gray-100 text-gray-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// Helper function to get status color for calendar (ensure this is defined or imported)
const getStatusColorForCalendar = (status) => {
    switch (status) {
        case 'pending': return '#FBBF24';
        case 'confirmed': return '#34D399';
        case 'completed': return '#60A5FA';
        case 'cancelled': return '#9CA3AF';
        case 'rejected': return '#F87171';
        default: return '#A1A1AA';
    }
}

// AddPaymentModal component (unchanged)
const AddPaymentModal = ({ booking, onClose, onPaymentSuccess }) => {
    const [amount, setAmount] = useState('');
    const [paymentProof, setPaymentProof] = useState(null);
    const [manualPaymentReference, setManualPaymentReference] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [paymentQR, setPaymentQR] = useState('');
    const [qrLoading, setQrLoading] = useState(true);

    const remainingBalance = booking.totalPrice - booking.amountPaid;

    useEffect(() => {
        const fetchQR = async () => {
            try {
                setQrLoading(true);
                const qrResponse = await DataService.fetchContent('paymentQR');
                if (qrResponse.success && qrResponse.data.content) {
                    const qrContent = qrResponse.data.content;
                    setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
                }
            } catch (error) {
                console.warn('QR code not found.');
            } finally {
                setQrLoading(false);
            }
        };
        fetchQR();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!amount || !paymentProof || !manualPaymentReference) {
            setError('Please enter the amount, upload a payment proof and provide a reference number.');
            return;
        }
        if (parseFloat(amount) !== remainingBalance) {
            setError(`The amount must be the exact remaining balance of ${formatPrice(remainingBalance)}.`);
            return;
        }


        setSubmitting(true);
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('paymentProof', paymentProof);
        formData.append('manualPaymentReference', manualPaymentReference);

        try {
            const response = await DataService.addPaymentProof(booking._id, formData);
            if (response.success) {
                alert('Payment added successfully!');
                onPaymentSuccess();
            } else {
                throw new Error(response.message);
            }
        } catch (err) {
            setError(err.message || 'Failed to add payment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Add Payment</h3>
                        <button onClick={onClose}><X /></button>
                    </div>
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}
                    <div className="mb-4">
                        <p>Remaining Balance: <span className="font-bold text-red-600">{formatPrice(remainingBalance)}</span></p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center">
                            {qrLoading ? <p>Loading QR...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR Code" className="w-48 h-48 object-contain mb-4 border rounded-md" /> : <p className="text-sm text-gray-500 mb-4">QR code not available.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-2 border rounded mt-1"
                                required
                                max={remainingBalance}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Bank Reference</label>
                            <input
                                type="text"
                                value={manualPaymentReference}
                                onChange={(e) => setManualPaymentReference(e.target.value)}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Proof</label>
                            <input
                                type="file"
                                onChange={(e) => setPaymentProof(e.target.files[0])}
                                className="w-full p-2 border rounded mt-1"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
                                {submitting ? 'Submitting...' : 'Add Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


export default CustomerDashboard;