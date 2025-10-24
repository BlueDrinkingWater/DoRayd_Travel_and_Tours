import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, Clock, Calendar, Users, MapPin, Phone, Mail, FileText, Image as ImageIcon, Link as LinkIcon, Hash, Car, Package, DollarSign, Tag, Paperclip, Info, User, CreditCard } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; // Import the secure image hook

// --- NEW COMPONENT TO HANDLE SECURE IMAGES (Payment Proofs) ---
const PaymentProofImage = ({ paymentProofUrl }) => {
  const { secureUrl, loading } = useSecureImage(paymentProofUrl);

  if (!paymentProofUrl) {
    return <p className="text-sm text-gray-500 mt-2">No proof uploaded.</p>;
  }

  if (loading) {
    return <div className="text-center py-4 text-sm text-gray-500">Loading payment proof...</div>;
  }

  if (!secureUrl) {
    // Provide a more informative fallback or error message
    return <p className="text-sm text-red-500 text-center py-4">Secure Image Access Failed. (Login Required/Auth Error)</p>;
  }

  return (
    <a href={secureUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
      <img
          src={secureUrl}
          alt="Payment Proof"
          className="w-full h-auto max-h-40 rounded-lg object-contain border mt-2"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x200/fecaca/991b1b?text=Error+Loading'; }} // More specific error placeholder
      />
    </a>
  );
};
// --- END NEW COMPONENT ---

// --- NEW Secure Attachment Link Component (For Booking Notes) ---
const SecureAttachmentLink = ({ attachmentPath, originalName }) => {
    const { secureUrl, loading } = useSecureImage(attachmentPath);

    if (loading) return <span className="text-xs text-gray-500 italic">Loading attachment...</span>;
    // Provide a more informative error message
    if (!secureUrl) return <span className="text-xs text-red-500 italic">Error loading attachment (Auth Error?)</span>;

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
// --- END Secure Attachment Link Component ---

// Helper to format date and time together
const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

// Helper to format date only
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
     try {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return 'Invalid Date';
    }
};

// Helper to format time only
const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        if (isNaN(date.getTime())) return 'Invalid Time';
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        return 'Invalid Time';
    }
};

// Helper to format currency
const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '₱0.00'; // Added NaN check
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
};

// **MODIFIED:** Updated getStatusBadge to include 'fully_paid'
const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed (Awaiting Balance)' }, // Updated label
      fully_paid: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Fully Paid' }, // Added
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
};


const ManageBookings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [updating, setUpdating] = useState(false);
  // **NEW:** State for payment due date inputs
  const [paymentDueDuration, setPaymentDueDuration] = useState(48); // Default 48
  const [paymentDueUnit, setPaymentDueUnit] = useState('hours'); // Default hours

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // API call hook
  const { data: bookingsData, loading, error, refetch: fetchBookings } = useApi(
    () => DataService.fetchAllBookings({ search: debouncedSearchTerm, status: filterStatus }),
    [debouncedSearchTerm, filterStatus]
  );
  const bookings = bookingsData?.data || [];

  // **MODIFIED:** Handle status update (passes due date info if confirming downpayment)
  const handleStatusUpdate = async (bookingId, newStatus) => {
    // Basic validation for notes if required by status change logic
    if ((newStatus === 'rejected' || newStatus === 'cancelled') && !adminNotes.trim()) {
        alert('Please provide a note/reason for rejecting or cancelling.');
        return;
    }

    setUpdating(true);
    try {
        // Prepare data using FormData for potential file uploads
        const formData = new FormData();
        formData.append('status', newStatus);
        formData.append('adminNotes', adminNotes.trim()); // Send trimmed notes

        // **NEW:** Append payment due info ONLY when confirming a downpayment booking
        if (newStatus === 'confirmed' && selectedBooking?.paymentOption === 'downpayment') {
            const duration = parseInt(paymentDueDuration, 10);
            if (isNaN(duration) || duration <= 0) {
                 throw new Error("Invalid payment due duration. Please enter a positive number.");
            }
            formData.append('paymentDueDuration', duration);
            formData.append('paymentDueUnit', paymentDueUnit);
        }

        // Append attachment if selected
        if (attachment) {
            formData.append('attachment', attachment);
        }

        // Call DataService with FormData
        await DataService.updateBookingStatus(bookingId, formData);

        alert(`Booking status updated to ${newStatus} successfully!`);
        setShowModal(false); // Close modal on success
        fetchBookings(); // Refresh the list
    } catch (error) {
        console.error('Error updating booking status:', error);
        // Display a more specific error message from the backend if available
        alert(`Failed to update booking status: ${error.message || 'Please try again.'}`);
    } finally {
        setUpdating(false);
    }
  };


  // Handle booking cancellation (uses PATCH request via DataService)
  const handleCancelBooking = async (bookingId) => {
     if (!adminNotes.trim()) {
        alert('Please provide a reason for cancellation in the notes.');
        return;
      }
    if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      setUpdating(true);
      try {
        // DataService.cancelBooking expects FormData
        const formData = new FormData();
        formData.append('adminNotes', adminNotes.trim());
        if (attachment) {
            formData.append('attachment', attachment);
        }
        await DataService.cancelBooking(bookingId, formData);

        alert('Booking cancelled successfully!');
        setShowModal(false); // Close modal
        fetchBookings(); // Refresh list
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert(`Failed to cancel booking: ${error.message || 'Please try again.'}`);
      } finally {
        setUpdating(false);
      }
    }
  };

  // Function to open the modal and set initial states
  const viewBooking = (booking) => {
    setSelectedBooking(booking);
    setAdminNotes(''); // Clear notes field when opening
    setAttachment(null); // Clear attachment field
    // Reset due date inputs to defaults when opening
    setPaymentDueDuration(48);
    setPaymentDueUnit('hours');
    setShowModal(true);
  };


  // --- JSX Rendering ---
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <p className="text-gray-600">Review and manage all customer bookings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
         <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search by ref, payment ID, name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                </div>
            </div>
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed (Awaiting Balance)</option>
                <option value="fully_paid">Fully Paid</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-500">Loading bookings...</p></div>
      ) : error ? (
         <div className="text-center py-12 text-red-600 bg-red-50 p-6 rounded-lg border border-red-200">
             <p className="font-semibold">Error loading bookings:</p>
             <p>{error.message || 'Could not fetch data.'}</p>
         </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{booking.bookingReference}</div>
                      <div className="text-sm text-gray-500">{formatDateTime(booking.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{booking.firstName} {booking.lastName}</div>
                      <div className="text-sm text-gray-500">{booking.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{booking.itemType === 'car' ? 'Car Rental' : 'Tour Package'}</div>
                      <div className="text-sm text-gray-500">{booking.itemName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(booking.startDate)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{formatPrice(booking.totalPrice)}</td>
                    <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4"><button onClick={() => viewBooking(booking)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors"><Eye size={14} /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && ( <div className="text-center py-12 text-gray-500"><Calendar size={48} className="mx-auto mb-2" /><p>No bookings found matching the current filters.</p></div> )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          {/* Modal Content - Adjusted max-h */}
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col"> {/* Use flex-col */}
             {/* Modal Header */}
             <div className="p-6 border-b sticky top-0 bg-white z-10">
                 <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                      <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {selectedBooking.bookingReference}</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                 </div>
             </div>

             {/* Modal Body - Scrollable */}
             <div className="p-6 overflow-y-auto flex-grow">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Customer and Booking Info */}
                    <div className="space-y-6">
                      <InfoBlock title="Booking Summary" icon={FileText}>
                        <InfoRow label="Name" value={`${selectedBooking.firstName} ${selectedBooking.lastName}`} icon={User} />
                        <InfoRow label="Address" value={selectedBooking.address} icon={MapPin} />
                        <InfoRow label="Email" value={selectedBooking.email} icon={Mail} />
                        <InfoRow label="Phone" value={selectedBooking.phone} icon={Phone} />
                        <hr className="my-2"/>
                        <InfoRow label="Service" value={selectedBooking.itemName} icon={selectedBooking.itemType === 'car' ? Car : Package} />
                        <InfoRow label="Start Date/Time" value={formatDateTime(selectedBooking.startDate)} icon={Calendar} />
                        <InfoRow label="End Date" value={formatDate(selectedBooking.endDate)} icon={Calendar} />
                        {/* <InfoRow label="Time" value={formatTime(selectedBooking.time)} icon={Clock} /> */}
                         {selectedBooking.itemType === 'car' ? (
                            <>
                              <InfoRow label="Delivery Method" value={selectedBooking.deliveryMethod} icon={Car} />
                              <InfoRow label="Location" value={selectedBooking.deliveryMethod === 'pickup' ? selectedBooking.pickupLocation : selectedBooking.dropoffLocation} icon={MapPin} />
                            </>
                         ) : (
                           <InfoRow label="Number of Guests" value={selectedBooking.numberOfGuests} icon={Users} />
                         )}
                        <InfoRow label="Special Requests" value={selectedBooking.specialRequests} />
                        <hr className="my-2"/>
                        <InfoRow label="Payment Option" value={selectedBooking.paymentOption} icon={CreditCard} />
                        {selectedBooking.promotionTitle && <InfoRow label="Discount Applied" value={selectedBooking.promotionTitle} icon={Tag} /> }
                        {selectedBooking.originalPrice && <InfoRow label="Original Price" value={formatPrice(selectedBooking.originalPrice)} /> }
                        <div className="flex justify-between items-center mt-4 pt-2 border-t">
                          <span className="font-semibold text-gray-900">Final Price:</span>
                          <span className="font-bold text-lg text-blue-600">{formatPrice(selectedBooking.totalPrice)}</span>
                        </div>
                      </InfoBlock>

                      {/* Communication Log Block */}
                      <InfoBlock title="Communication Log" icon={Info}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-semibold">Current Status:</span>
                            {getStatusBadge(selectedBooking.status)}
                        </div>
                        {selectedBooking.notes && selectedBooking.notes.length > 0 ? (
                            selectedBooking.notes.slice().reverse().map((note, index) => ( // Show newest first
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

                    {/* Right Column: Payment and Admin Actions */}
                    <div className="space-y-6">
                        {/* Payment Details */}
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

                      {/* Admin Actions */}
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

                        {/* **NEW:** Payment Due Date Input */}
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
                                        required // Make it visually required
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

                       {/* Action Buttons */}
                        <div className="mt-6 space-y-3">
                           {selectedBooking.status === 'pending' && (
                            <div className="flex gap-3">
                              <button onClick={() => handleStatusUpdate(selectedBooking._id, 'confirmed')} disabled={updating || (selectedBooking.paymentOption === 'downpayment' && !paymentDueDuration)} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><Check size={16} /> Confirm</button>
                              <button onClick={() => handleStatusUpdate(selectedBooking._id, 'rejected')} disabled={updating || !adminNotes.trim()} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Reject *</button>
                            </div>
                           )}
                           {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'fully_paid') && ( // Allow completion/cancellation for both
                            <div className="flex gap-3">
                              <button onClick={() => handleStatusUpdate(selectedBooking._id, 'completed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"><Check size={16} /> Mark Completed</button>
                              <button onClick={() => handleCancelBooking(selectedBooking._id)} disabled={updating || !adminNotes.trim()} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Cancel Booking *</button>
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
      )}
    </div>
  );
};

// Helper components for the modal
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

export default ManageBookings;