// client/src/pages/customer/CustomerDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar, Clock, Car, MapPin, Star, MessageSquare, Settings, User, Heart, Award, Upload, Menu, X, ChevronRight, Eye, Check, FileText, Link as LinkIcon, Hash, Package, DollarSign, ImageIcon, Paperclip, AlertTriangle, Info, CreditCard, Bus // <-- Imported Bus
} from 'lucide-react';
import { useAuth } from '@/components/Login.jsx';
import { useApi } from '@/hooks/useApi.jsx';
import DataService, { getImageUrl, SERVER_URL } from '@/components/services/DataService.jsx';
import AccountSettings from '@/pages/shared/AccountSettings.jsx';
import bgTour from '@/assets/bgTour.jpg';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useLocation, Link } from 'react-router-dom';
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
    if (typeof price !== 'number' || isNaN(price)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
};

// --- STATUS BADGE (UPDATED) ---
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
// --- END STATUS BADGE ---


// --- Helper Components ---
const InfoBlock = ({ title, icon: Icon, children }) => (
  <div className="bg-gray-50 p-4 rounded-lg border">
    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2"><Icon size={18} /> {title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between text-sm py-1">
    <span className="text-gray-600 flex items-center gap-1.5 mb-1 sm:mb-0 whitespace-nowrap">{Icon && <Icon size={14} className="flex-shrink-0"/>} {label}:</span>
    <span className="font-medium text-gray-800 text-left sm:text-right break-words">{value || 'N/A'}</span>
  </div>
);

// COMPONENT TO HANDLE SECURE IMAGES (Payment Proofs)
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
              className="w-full h-auto max-h-40 rounded-lg object-contain border mt-2"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x200/fecaca/991b1b?text=Error'; }}
          />
      </a>
    </div>
  );
};

// Secure Attachment Link Component (For Booking Notes)
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

// Full Booking Detail Modal
const BookingDetailModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                            <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {booking.bookingReference}</p>
                        </div>
                        <button onClick={onClose}><X /></button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                           <InfoBlock title="Customer Information" icon={User}>
                                <InfoRow label="Name" value={`${booking.firstName} ${booking.lastName}`} />
                                <InfoRow label="Email" value={booking.email} />
                                <InfoRow label="Phone" value={booking.phone} />
                                <InfoRow label="Address" value={booking.address} />
                            </InfoBlock>
                            <InfoBlock title="Booking Details" icon={Calendar}>
                                {/* <-- UPDATED ICON --> */}
                                <InfoRow label="Service Type" value={booking.itemType} icon={booking.itemType === 'car' ? Car : booking.itemType === 'tour' ? Package : Bus} />
                                <InfoRow label="Service Name" value={booking.itemName} />
                                <InfoRow label="Pickup/Start" value={formatDateTime(booking.startDate)} icon={Clock} />
                                {booking.endDate && <InfoRow label="Return Date" value={formatDate(booking.endDate)} />}
                                {/* <-- UPDATED DETAILS LOGIC --> */}
                                {booking.itemType === 'car' && <InfoRow label="Delivery Method" value={booking.deliveryMethod} />}
                                {booking.itemType === 'car' && booking.deliveryMethod === 'pickup' && <InfoRow label="Pickup Location" value={booking.pickupLocation} />}
                                {booking.itemType === 'car' && booking.deliveryMethod === 'dropoff' && <InfoRow label="Dropoff Location" value={booking.dropoffLocation} />}
                                {booking.itemType === 'tour' || booking.itemType === 'transport' ? <InfoRow label="Guests/Passengers" value={booking.numberOfGuests} /> : null }
                                <InfoRow label="Special Requests" value={booking.specialRequests} />
                            </InfoBlock>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <InfoBlock title="Payment Details" icon={DollarSign}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-800">Total Amount Due:</span>
                                    <span className="text-2xl font-bold text-blue-600">{formatPrice(booking.totalPrice)}</span>
                                </div>
                                {booking.payments.map((payment, index) => (
                                    <div key={index} className="mt-4 border-t pt-4">
                                        <h4 className="text-sm font-semibold">Payment {index + 1} ({formatDateTime(payment.paymentDate)})</h4>
                                        <InfoRow label="System Pay Code" value={payment.paymentReference} />
                                        <InfoRow label="Bank Reference" value={payment.manualPaymentReference || 'N/A'} />
                                        <InfoRow label="Amount Paid" value={formatPrice(payment.amount)} />
                                        <PaymentProofImage paymentProofUrl={payment.paymentProof} />
                                    </div>
                                ))}
                                 <div className="flex justify-between items-center text-green-700 mt-4 pt-4 border-t">
                                    <span className="text-lg font-semibold">Total Paid:</span>
                                    <span className="text-2xl font-bold">{formatPrice(booking.amountPaid)}</span>
                                </div>
                                {booking.totalPrice > booking.amountPaid && (
                                    <div className="text-center text-sm text-red-600 mt-2 font-semibold">
                                        Remaining Balance: {formatPrice(booking.totalPrice - booking.amountPaid)}
                                    </div>
                                )}
                                {booking.paymentDueDate && booking.status === 'confirmed' && (
                                    <div className="text-center text-sm text-orange-600 mt-2 font-semibold bg-orange-50 p-2 rounded border border-orange-200">
                                        Payment Due By: {formatDateTime(booking.paymentDueDate)}
                                    </div>
                                )}
                            </InfoBlock>
                             <InfoBlock title="Admin Notes" icon={FileText}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold">Current Status:</span>
                                    {getStatusBadge(booking.status)}
                                </div>
                                {booking.notes && booking.notes.length > 0 ? (
                                    booking.notes.slice().reverse().map((note, index) => (
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
                                                Note from Admin on {formatDateTime(note.date)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No notes from admin.</p>
                                )}
                            </InfoBlock>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add Payment Modal
const AddPaymentModal = ({ booking, onClose, onPaymentSuccess }) => {
    const [amount, setAmount] = useState(booking.totalPrice - booking.amountPaid);
    const [paymentProof, setPaymentProof] = useState(null);
    const [manualPaymentReference, setManualPaymentReference] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [paymentQR, setPaymentQR] = useState('');
    const [qrLoading, setQrLoading] = useState(true);

    const remainingBalance = booking.totalPrice - booking.amountPaid;

    useEffect(() => {
        // Set default amount to remaining balance
        setAmount(remainingBalance.toFixed(2));
        
        // Fetch QR Code
        setQrLoading(true);
        DataService.fetchContent('paymentQR')
            .then(qrResponse => {
                if (qrResponse.success && qrResponse.data.content) {
                    const qrContent = qrResponse.data.content;
                    setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
                }
            })
            .catch(err => console.warn('QR code not found or failed to load.'))
            .finally(() => setQrLoading(false));
    }, [booking, remainingBalance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!paymentProof || !manualPaymentReference || !amount) {
            return setError('Please fill in all fields: Amount, Bank Reference, and Payment Proof.');
        }

        const paidAmount = parseFloat(amount);
        if (isNaN(paidAmount) || paidAmount <= 0) {
            return setError('Invalid amount entered.');
        }
        
        if (Math.abs(paidAmount - remainingBalance) > 0.01) {
             return setError(`Amount must be exactly the remaining balance of ${formatPrice(remainingBalance)}.`);
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('amount', paidAmount);
            formData.append('paymentProof', paymentProof);
            formData.append('manualPaymentReference', manualPaymentReference);

            const result = await DataService.addPaymentProof(booking._id, formData);
            if (result.success) {
                alert('Payment submitted successfully! Admin will verify and update your booking status.');
                onPaymentSuccess();
            } else {
                throw new Error(result.message || 'Failed to submit payment.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[80] p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Add Payment</h2>
                            <p className="text-gray-600">Booking: {booking.bookingReference}</p>
                        </div>
                        <button onClick={onClose}><X /></button>
                    </div>
                </div>

                <form id="paymentForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-grow">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}
                    
                    <div className="flex flex-col items-center mb-4">
                        {qrLoading ? <p className="text-sm text-gray-500">Loading QR Code...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR Code" className="w-48 h-48 object-contain mb-4 border rounded-md shadow-sm" /> : <p className="text-sm text-gray-500 mb-4">Payment QR code not available.</p>}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Balance</label>
                            <input
                                type="text"
                                readOnly
                                value={formatPrice(remainingBalance)}
                                className="w-full p-2 border rounded-md bg-gray-100 font-bold text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder={remainingBalance.toFixed(2)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Reference Number *</label>
                            <input
                                type="text"
                                value={manualPaymentReference}
                                onChange={(e) => setManualPaymentReference(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder="e.g., from your bank receipt"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Proof *</label>
                            <input
                                type="file"
                                onChange={(e) => setPaymentProof(e.target.files[0])}
                                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                accept="image/*"
                                required
                            />
                            {paymentProof && <span className="text-xs text-gray-500 italic mt-1 block">File: {paymentProof.name}</span>}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t sticky bottom-0 bg-white z-10">
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                        <button type="submit" form="paymentForm" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium hover:bg-blue-700 transition-colors">
                            {submitting ? 'Submitting...' : 'Submit Payment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// StatCard
const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
         {Icon && (
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                 <Icon size={20} />
             </div>
         )}
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
);

// Helper function to get status color for calendar
const getStatusColorForCalendar = (status) => {
    switch (status) {
        case 'pending': return '#FBBF24'; // yellow-400
        case 'confirmed': return '#34D399'; // green-400
        case 'fully_paid': return '#2DD4BF'; // teal-400
        case 'completed': return '#60A5FA'; // blue-400
        case 'cancelled': return '#9CA3AF'; // gray-400
        case 'rejected': return '#F87171'; // red-400
        default: return '#A1A1AA'; // zinc-400
    }
};

// OverviewTab
const OverviewTab = ({ bookings, onBookingSelect }) => {
     const events = useMemo(() => bookings.map(booking => ({
        id: booking._id,
        title: booking.itemName,
        start: new Date(booking.startDate),
        end: booking.endDate && !isNaN(new Date(booking.endDate)) ? new Date(booking.endDate) : new Date(booking.startDate),
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
                <div className="text-gray-800">
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
                        events={events}
                        eventClick={handleEventClick}
                        dayMaxEvents={true}
                        eventDisplay="block"
                        eventTimeFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short'
                        }}
                    />
                </div>
            </div>
             <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Recent Bookings</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {bookings.slice(0, 5).map(booking => (
                        <div key={booking._id} className="p-4 bg-white/50 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">{booking.itemName}</p>
                                    <p className="text-sm text-gray-500">{booking.bookingReference}</p>
                                    <p className="text-sm text-gray-500">{formatDate(booking.startDate)}</p>
                                </div>
                                {getStatusBadge(booking.status)}
                            </div>
                             <button
                                 onClick={() => onBookingSelect(booking)}
                                 className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
                             >
                                 <Eye size={12} /> View Details
                             </button>
                        </div>
                    ))}
                    {bookings.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p>No recent bookings</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// BookingsTab
const BookingsTab = ({ bookings, onBookingSelect, onAddPayment }) => {
    return (
     <div className="space-y-4">
        {bookings.length > 0 ? bookings.map(booking => (
            <div key={booking._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-md flex-shrink-0 mt-1">
                             {/* <-- UPDATED ICON --> */}
                             {booking.itemType === 'car' ? <Car className="w-6 h-6 text-white" /> :
                              booking.itemType === 'tour' ? <MapPin className="w-6 h-6 text-white" /> :
                              <Bus className="w-6 h-6 text-white" />
                             }
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-semibold text-lg text-gray-900">{booking.itemName}</h3>
                            <p className="text-sm text-gray-500">Ref: {booking.bookingReference}</p>
                            <p className="text-sm text-gray-600 mt-1">
                                {formatDate(booking.startDate)}
                                {booking.endDate && booking.startDate?.split('T')[0] !== booking.endDate?.split('T')[0] && ` - ${formatDate(booking.endDate)}`}
                            </p>
                             <p className="font-semibold text-lg mt-2 text-blue-600">{formatPrice(booking.totalPrice)}</p>
                             {booking.paymentOption === 'downpayment' && booking.totalPrice > booking.amountPaid && (
                                <p className="font-semibold text-sm mt-1 text-red-600">
                                    Remaining: {formatPrice(booking.totalPrice - booking.amountPaid)}
                                </p>
                             )}
                        </div>
                    </div>
                     <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0 flex-shrink-0">
                        {getStatusBadge(booking.status)}
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
                                title={booking.status !== 'confirmed' ? "Can only add payment to confirmed bookings" : "Pay Remaining Balance"}
                            >
                                <Upload size={14} /> Add Payment
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )) : (
            <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">You have no bookings yet.</p>
                <Link to="/cars" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Book a Car</Link>
                <Link to="/tours" className="mt-4 ml-2 inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">Book a Tour</Link>
                {/* <-- ADDED TRANSPORT LINK --> */}
                <Link to="/transport" className="mt-4 ml-2 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Book Transport</Link>
            </div>
        )}
    </div>
);
};

// MyReviewsTab
const MyReviewsTab = ({ reviews }) => {
    return (
        <div className="space-y-4">
            {reviews.length > 0 ? reviews.map(review => (
                <div key={review._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            {/* Correctly display item name based on populated 'item' field */}
                            <h3 className="font-semibold text-lg text-gray-900">
                              {review.item ? (review.itemType === 'car' ? `${review.item.brand} ${review.item.model}` : review.item.title || review.item.vehicleType) : 'Service Name Unavailable'}
                            </h3>
                            <p className="text-sm text-gray-500">Booking: {review.booking?.bookingReference || 'N/A'}</p>
                        </div>
                         <div className={`text-sm px-3 py-1 rounded-full ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {review.isApproved ? 'Approved' : 'Pending'}
                         </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={20} className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
                        ))}
                    </div>
                    <p className="text-gray-700 mt-3 whitespace-pre-wrap">{review.comment}</p>
                    <p className="text-xs text-gray-500 mt-3 text-right">Submitted on {formatDate(review.createdAt)}</p>
                </div>
            )) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">You have not submitted any reviews.</p>
                </div>
            )}
        </div>
    );
};

// MyFeedbackTab
const MyFeedbackTab = ({ feedback }) => {
    return (
        <div className="space-y-4">
            {feedback.length > 0 ? feedback.map(fb => (
                <div key={fb._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">{fb.subject}</h3>
                            <p className="text-sm text-gray-500">Type: {fb.type}</p>
                        </div>
                         <div className={`text-sm px-3 py-1 rounded-full ${fb.isPublic ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {fb.isPublic ? 'Public' : 'Private'}
                         </div>
                    </div>
                    <p className="text-gray-700 mt-3 whitespace-pre-wrap">{fb.message}</p>
                    {fb.image && (
                         <div className="mt-4">
                            <h4 className="text-sm font-semibold">Attached Image:</h4>
                            <img src={getImageUrl(fb.image)} alt="Feedback attachment" className="w-full h-auto max-h-48 object-contain border rounded-lg mt-2"/>
                         </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3 text-right">Submitted on {formatDate(fb.createdAt)}</p>
                </div>
            )) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">You have not submitted any feedback.</p>
                </div>
            )}
        </div>
    );
};

// LeaveReviewTab
const LeaveReviewTab = ({ bookings, reviewedBookingIds, onReviewSubmit }) => {
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const availableBookings = bookings.filter(b => b.status === 'completed' && !reviewedBookingIds.has(String(b._id)));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!selectedBookingId || rating === 0 || !comment.trim()) {
            return setError('Please select a booking, provide a rating (1-5), and write a comment.');
        }

        const booking = bookings.find(b => b._id === selectedBookingId);
        if (!booking || !booking.itemId) { // Ensure itemId exists
            return setError('Selected booking or associated service not found.');
        }

        setSubmitting(true);
        try {
            const reviewData = {
                bookingId: booking._id,       // Corrected field name
                itemId: booking.itemId._id, // Send the item ID itself
                itemType: booking.itemType,
                rating,
                comment,
            };
            const result = await DataService.submitReview(reviewData);
            if (result.success) {
                setSuccess('Review submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                onReviewSubmit(); // Refetch reviews
            } else {
                throw new Error(result.message || 'Failed to submit review.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-white/20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Leave a Review</h2>
            {availableBookings.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                     <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                     <p>You have no completed bookings available to review.</p>
                 </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Completed Booking *</label>
                        <select
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-white"
                            required
                        >
                            <option value="">-- Select a booking to review --</option>
                            {availableBookings.map(b => (
                                <option key={b._id} value={b._id}>
                                    {b.itemName} (Ref: {b.bookingReference}) - Completed {formatDate(b.endDate || b.startDate)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
                        <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                                <button type="button" key={i} onClick={() => setRating(i + 1)}>
                                    <Star
                                        size={28}
                                        className={`cursor-pointer transition-colors ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Comment *</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="5"
                            className="w-full p-3 border rounded-lg"
                            placeholder="Share your experience..."
                            required
                        ></textarea>
                    </div>

                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium hover:bg-blue-700 transition-colors"
                        >
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

// LeaveFeedbackTab
const LeaveFeedbackTab = ({ bookings, feedbackBookingIds, onFeedbackSubmit }) => {
    const [type, setType] = useState('Suggestion');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [image, setImage] = useState(null);
    const [bookingId, setBookingId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const availableBookings = bookings.filter(b => b.status === 'completed' && !feedbackBookingIds.has(String(b._id)));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!type || !subject.trim() || !message.trim()) {
            return setError('Please select a type, provide a subject, and write a message.');
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('type', type);
            formData.append('subject', subject);
            formData.append('message', message);
            formData.append('isPublic', isPublic);
            if (bookingId) {
                formData.append('bookingId', bookingId); // Corrected field name
            }
            if (image) {
                formData.append('image', image);
            }

            const result = await DataService.submitFeedback(formData);
            if (result.success) {
                setSuccess('Feedback submitted successfully! Thank you for your input.');
                setType('Suggestion');
                setSubject('');
                setMessage('');
                setIsPublic(false);
                setImage(null);
                setBookingId('');
                if (document.querySelector('input[type="file"]')) {
                    document.querySelector('input[type="file"]').value = ''; // Reset file input
                }
                onFeedbackSubmit(); // Refetch feedback
            } else {
                throw new Error(result.message || 'Failed to submit feedback.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };


     return (
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-white/20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Leave Feedback</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Type *</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-white"
                            required
                        >
                            <option value="Suggestion">Suggestion</option>
                            <option value="Complaint">Complaint</option>
                            <option value="Compliment">Compliment</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Related Booking (Optional)</label>
                        <select
                            value={bookingId}
                            onChange={(e) => setBookingId(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-white"
                        >
                            <option value="">-- None --</option>
                            {availableBookings.map(b => (
                                <option key={b._id} value={b._id}>
                                    {b.itemName} (Ref: {b.bookingReference})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                        placeholder="A brief summary"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows="5"
                        className="w-full p-3 border rounded-lg"
                        placeholder="Share your feedback in detail..."
                        required
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attach Image (Optional)</label>
                    <input
                        type="file"
                        onChange={(e) => setImage(e.target.files[0])}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                        accept="image/*"
                    />
                     {image && <span className="text-xs text-gray-500 italic mt-1 block">File: {image.name}</span>}
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isPublic"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                        Allow this feedback to be displayed publicly (your name will be hidden).
                    </label>
                </div>

                <div className="text-right">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium hover:bg-blue-700 transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// PublicFeedbackTab
const PublicFeedbackTab = ({ feedback }) => {
    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {feedback.length > 0 ? feedback.map(fb => (
                <div key={fb._id} className="bg-white/80 backdrop-blur-md p-6 border border-white/20 rounded-xl">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg text-gray-900">{fb.subject}</h3>
                        <div className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800 capitalize">
                            {fb.type}
                        </div>
                    </div>
                    <p className="text-gray-700 mt-3 whitespace-pre-wrap">{fb.message}</p>
                    {fb.image && (
                         <div className="mt-4">
                            <h4 className="text-sm font-semibold">Attached Image:</h4>
                            <img src={getImageUrl(fb.image)} alt="Feedback attachment" className="w-full h-auto max-h-48 object-contain border rounded-lg mt-2"/>
                         </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3 text-right">Submitted on {formatDate(fb.createdAt)}</p>
                </div>
            )) : (
                <div className="bg-white/80 backdrop-blur-md text-center py-16 rounded-xl border border-white/20">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No public feedback available yet.</p>
                </div>
            )}
        </div>
    );
};

// Main Component
const CustomerDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname.includes('my-bookings') ? 'bookings' : 'overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

    // --- API Hooks ---
    const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useApi(() => DataService.fetchUserBookings(), [user, location]);
    const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useApi(() => DataService.getMyReviews(), [user]);
    const { data: feedbackData, loading: feedbackLoading, refetch: refetchFeedback } = useApi(() => DataService.getMyFeedback(), [user]);
    const { data: publicFeedbackData, loading: publicFeedbackLoading } = useApi(() => DataService.getPublicFeedback(), []);

    // --- Memoized Data ---
    const bookings = bookingsData?.data || [];
    const myReviews = reviewsData?.data || [];
    const myFeedback = feedbackData?.data || [];
    const publicFeedback = publicFeedbackData?.data || [];

    const completedBookings = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);
    const reviewedBookingIds = useMemo(() => new Set(myReviews.map(r => String(r.booking))), [myReviews]);
    const feedbackBookingIds = useMemo(() => new Set(myFeedback.map(f => String(f.booking))), [myFeedback]);

    // --- Navigation Tabs ---
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

    // --- Stats for Overview ---
    const stats = [
        { title: 'Total Bookings', value: bookings.length, icon: Calendar },
        { title: 'Completed', value: completedBookings.length, icon: Clock },
        { title: 'My Reviews', value: myReviews.length, icon: Star },
        { title: 'My Feedback', value: myFeedback.length, icon: MessageSquare }
    ];

    // --- Event Handlers ---
    const handleAddPayment = (booking) => {
        setSelectedBooking(booking);
        setShowAddPaymentModal(true);
    };

    // --- Loading State ---
    if (bookingsLoading || reviewsLoading || feedbackLoading || publicFeedbackLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                 <p className="ml-4 text-gray-700">Loading Dashboard...</p>
            </div>
        );
    }


    // --- JSX Rendering ---
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
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0">
                                     {user?.profilePicture ? (
                                         <img src={getImageUrl(user.profilePicture)} alt="Profile" className="w-full h-full object-cover" />
                                     ) : (
                                         <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                                     )}
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
                                    } ${!sidebarOpen ? 'justify-center' : ''}`}
                                >
                                    <Icon size={20} className={!sidebarOpen ? 'mx-auto' : ''} />
                                    {sidebarOpen && <span className="font-medium">{tab.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    {sidebarOpen && (
                        <div className="p-4 border-t border-white/10">
                            <p className="text-white/70 text-xs text-center">© {new Date().getFullYear()} DoRayd Tours</p>
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

            {/* Modals */}
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

export default CustomerDashboard;