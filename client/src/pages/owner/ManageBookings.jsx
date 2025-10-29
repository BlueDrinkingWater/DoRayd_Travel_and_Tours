// client/src/pages/owner/ManageBookings.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../../hooks/useApi';
import DataService, { getImageUrl } from '../../components/services/DataService';
import { useAuth } from '../../components/Login';
import { useSocket } from '../../hooks/useSocket';
import { X, Check, Eye, Trash2, Filter, Search, ChevronDown, ChevronUp, Car, MapPin, DollarSign, User, FileText, Info, Paperclip, CreditCard, Hash, Phone, Calendar as CalendarIcon, Package, Bus } from 'lucide-react'; // <-- Imported Bus
import { useSecureImage } from '../../hooks/useSecureImage.jsx';

// --- Helper Functions ---
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
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            throw new Error("Invalid date value");
        }
        // Adding timeZone option to mitigate potential off-by-one day errors
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    } catch (e) {
        console.error("formatDateOnly Error:", e.message, "Input:", dateString);
        return 'Invalid Date';
    }
};

// --- STATUS BADGE (SHARED) ---
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


// --- SECURE IMAGE COMPONENTS (SHARED) ---
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

const InfoRow = ({ label, value, icon: Icon, isNote = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between text-sm py-1">
    <span className="text-gray-600 flex items-center gap-1.5 mb-1 sm:mb-0 whitespace-nowrap">{Icon && <Icon size={14} className="flex-shrink-0"/>} {label}:</span>
    <span className={`font-medium text-gray-800 text-left sm:text-right ${isNote ? 'whitespace-pre-wrap w-full sm:w-auto' : 'break-words'}`}>{value || 'N/A'}</span>
  </div>
);
// --- END Sub-Components ---


// --- BOOKING DETAIL MODAL ---
const BookingDetailModal = ({ booking, onClose, onUpdate }) => {
  const [selectedBooking, setSelectedBooking] = useState(booking);
  const [adminNotes, setAdminNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  // State for setting payment due date
  const [paymentDueDuration, setPaymentDueDuration] = useState(48);
  const [paymentDueUnit, setPaymentDueUnit] = useState('hours');

  // Sync state if prop changes
  useEffect(() => {
    setSelectedBooking(booking);
    setAdminNotes('');
    setAttachment(null);
    setPaymentDueDuration(48);
    setPaymentDueUnit('hours');
  }, [booking]);

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

      // Only add payment due info if confirming a downpayment booking
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

      const result = await DataService.updateBookingStatus(selectedBooking._id, formData);
      if (result.success) {
        alert(`Booking status updated to ${newStatus} successfully!`);
        onUpdate(); // Refetch all bookings
        onClose(); // Close modal
      } else {
        throw new Error(result.message || 'Failed to update status.');
      }
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
        const result = await DataService.cancelBooking(selectedBooking._id, formData);
        if (result.success) {
          alert('Booking cancelled successfully!');
          onUpdate(); // Refetch all bookings
          onClose(); // Close modal
        } else {
          throw new Error(result.message || 'Failed to cancel booking.');
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {selectedBooking.bookingReference}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              <InfoBlock title="Booking Summary" icon={FileText}>
                <InfoRow label="Name" value={`${selectedBooking.firstName} ${selectedBooking.lastName}`} icon={User} />
                <InfoRow label="Address" value={selectedBooking.address} icon={MapPin} />
                <InfoRow label="Email" value={selectedBooking.email} icon={Info} />
                <InfoRow label="Phone" value={selectedBooking.phone} icon={Phone} />
                <hr className="my-2"/>
                <InfoRow label="Service" value={selectedBooking.itemName} icon={selectedBooking.itemType === 'car' ? Car : (selectedBooking.itemType === 'tour' ? MapPin : Bus)} />
                <InfoRow label="Start Date/Time" value={formatDateTime(selectedBooking.startDate)} icon={CalendarIcon} />
                <InfoRow label="End Date" value={formatDateOnly(selectedBooking.endDate)} icon={CalendarIcon} />
                 
                {/* <-- UPDATED: Logic to handle car vs tour/transport --> */}
                 {selectedBooking.itemType === 'car' ? (
                    <>
                      <InfoRow label="Delivery Method" value={selectedBooking.deliveryMethod} icon={Car} />
                      <InfoRow label="Location" value={selectedBooking.deliveryMethod === 'pickup' ? selectedBooking.pickupLocation : selectedBooking.dropoffLocation} icon={MapPin} />
                    </>
                 ) : (
                   <InfoRow label="Number of Guests" value={selectedBooking.numberOfGuests} icon={User} />
                 )}
                <InfoRow label="Special Requests" value={selectedBooking.specialRequests} isNote={true} />
                <hr className="my-2"/>
                <InfoRow label="Payment Option" value={selectedBooking.paymentOption} icon={CreditCard} />
                {selectedBooking.promotionTitle && <InfoRow label="Discount Applied" value={selectedBooking.promotionTitle} icon={Tag} /> }
                {selectedBooking.originalPrice && <InfoRow label="Original Price" value={formatPrice(selectedBooking.originalPrice)} /> }
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
                    <input type="file" onChange={(e) => setAttachment(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    {attachment && <button onClick={() => { setAttachment(null); const input = document.querySelector('input[type="file"]'); if(input) input.value = ''; }}><X size={16} className="text-red-500"/></button>}
                  </div>
                  {attachment && <span className="text-xs text-gray-500 italic mt-1 block">File: {attachment.name}</span>}
                </div>

                {/* Due Date Setter: Show only when moving to 'confirmed' and it's a 'downpayment' */}
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
              
               {/* --- === ACTION BUTTONS (MODIFIED) === --- */}
               <div className="mt-6 space-y-3">
                   {selectedBooking.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => handleStatusUpdate('confirmed')} disabled={updating || (selectedBooking.paymentOption === 'downpayment' && !paymentDueDuration)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><Check size={16} /> Confirm</button>
                      <button onClick={() => handleStatusUpdate('rejected')} disabled={updating || !adminNotes.trim()} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Reject *</button>
                      <button onClick={() => handleCancelBooking()} disabled={updating || !adminNotes.trim()} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Cancel Booking *</button>
                    </div>
                   )}
                   {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'fully_paid') && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => handleStatusUpdate('completed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"><Check size={16} /> Mark Completed</button>
                      {/* --- ADDED REJECT BUTTON HERE --- */}
                      <button onClick={() => handleStatusUpdate('rejected')} disabled={updating || !adminNotes.trim()} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Reject *</button>
                      {/* --- CANCEL BUTTON ALREADY EXISTED --- */}
                      <button onClick={() => handleCancelBooking()} disabled={updating || !adminNotes.trim()} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Cancel Booking *</button>
                    </div>
                   )}
                   {(selectedBooking.status === 'rejected' || selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
                     <p className="text-sm text-center text-gray-500 italic py-4">No further actions available for this booking status.</p>
                   )}
                   <p className="text-xs text-gray-500 text-center">* Note required for Reject/Cancel actions.</p>
                </div>
                {/* --- === END ACTION BUTTONS (MODIFIED) === --- */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const ManageBookings = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    itemType: '',
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Debounce search term
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // API call
  const { data: bookingsData, loading, error, refetch } = useApi(
    () => DataService.fetchAllBookings(filters),
    [filters] // Refetch when filters change
  );
  
  const bookings = bookingsData?.data?.bookings || [];
  const totalBookings = bookingsData?.data?.totalBookings || 0;
  const totalPages = Math.ceil(totalBookings / filters.limit);

  // Real-time updates
  useEffect(() => {
    if (socket) {
      const handleBookingUpdate = (data) => {
        console.log('Socket event received:', data.type);
        refetch(); // Refetch data on any booking update
      };
      
      socket.on('new-booking', handleBookingUpdate);
      socket.on('booking-updated', handleBookingUpdate);
      socket.on('bookings-updated-by-system', handleBookingUpdate); // Listen for job updates

      return () => {
        socket.off('new-booking', handleBookingUpdate);
        socket.off('booking-updated', handleBookingUpdate);
        socket.off('bookings-updated-by-system', handleBookingUpdate);
      };
    }
  }, [socket, refetch]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sort: column,
      order: prev.sort === column && prev.order === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };
  
  const SortIcon = ({ column }) => {
    if (filters.sort !== column) return null;
    return filters.order === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Manage Bookings</h1>
      
      {/* Filter Bar */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border rounded-lg"
            />
          </div>
          <div>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <select name="itemType" value={filters.itemType} onChange={handleFilterChange} className="w-full p-2 border rounded-lg bg-white">
              <option value="">All Service Types</option>
              <option value="car">Car</option>
              <option value="tour">Tour</option>
              <option value="transport">Transport</option> {/* <-- ADDED */}
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                {/* --- ADDED THIS HEADER --- */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                   <span className="flex items-center gap-1">Booked On <SortIcon column="createdAt" /></span>
                </th>
                {/* --- END OF ADDED HEADER --- */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('startDate')}>
                  <span className="flex items-center gap-1">Start Date <SortIcon column="startDate" /></span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('totalPrice')}>
                   <span className="flex items-center gap-1">Total <SortIcon column="totalPrice" /></span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                   <span className="flex items-center gap-1">Status <SortIcon column="status" /></span>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* --- UPDATED colSpan to 8 --- */}
              {loading && <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading bookings...</td></tr>}
              {error && <tr><td colSpan="8" className="text-center py-8 text-red-500">{error.message || 'Failed to load data.'}</td></tr>}
              {!loading && bookings.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-gray-500">No bookings found matching criteria.</td></tr>}
              
              {!loading && bookings.map(booking => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                        {/* <-- UPDATED ICON LOGIC --> */}
                        {booking.itemType === 'car' && <Car className="h-5 w-5 text-blue-500" />}
                        {booking.itemType === 'tour' && <MapPin className="h-5 w-5 text-green-500" />}
                        {booking.itemType === 'transport' && <Bus className="h-5 w-5 text-indigo-500" />}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.itemName}</div>
                        <div className="text-xs text-gray-500">{booking.bookingReference}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.firstName} {booking.lastName}</div>
                    <div className="text-xs text-gray-500">{booking.email}</div>
                  </td>
                  {/* --- ADDED THIS CELL --- */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateTime(booking.createdAt)}</td>
                  {/* --- END OF ADDED CELL --- */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateOnly(booking.startDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatPrice(booking.totalPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${booking.amountPaid >= booking.totalPrice ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {formatPrice(booking.amountPaid)} Paid
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(booking.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedBooking(booking)} className="text-blue-600 hover:text-blue-800" title="View Details">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex justify-between items-center border-t">
            <span className="text-sm text-gray-700">Page {filters.page} of {totalPages}</span>
            <div className="space-x-1">
              <button onClick={() => handlePageChange(filters.page - 1)} disabled={filters.page === 1} className="px-3 py-1 border rounded-md text-sm disabled:opacity-50">Previous</button>
              <button onClick={() => handlePageChange(filters.page + 1)} disabled={filters.page === totalPages} className="px-3 py-1 border rounded-md text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={refetch} // Pass the refetch function to the modal
        />
      )}
    </div>
  );
};

export default ManageBookings;