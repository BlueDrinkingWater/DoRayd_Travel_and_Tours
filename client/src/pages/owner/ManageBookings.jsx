// client/src/pages/owner/ManageBookings.jsx

import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, Clock, Calendar, Users, MapPin, Phone, Mail, FileText, Image as ImageIcon, Link as LinkIcon, Hash, Car, Package, DollarSign, Tag, Paperclip } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import DataService, { getImageUrl } from '../../components/services/DataService';
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; 

const ManageBookings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  const { secureUrl: paymentProofUrl, loading: paymentProofLoading } = useSecureImage(selectedBooking?.paymentProof);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const { data: bookingsData, loading, error, refetch: fetchBookings } = useApi(
    () => DataService.fetchAllBookings({ search: debouncedSearchTerm, status: filterStatus }),
    [debouncedSearchTerm, filterStatus] 
  );
  
  const bookings = bookingsData?.data || [];

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdating(true);
    try {
      await DataService.updateBookingStatus(bookingId, newStatus, adminNotes, attachment);
      alert(`Booking ${newStatus} successfully!`);
      setShowModal(false);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking');
    } finally {
      setUpdating(false);
    }
  };
  
  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      setUpdating(true);
      try {
        await DataService.cancelBooking(bookingId, adminNotes, attachment);
        alert('Booking cancelled successfully!');
        setShowModal(false);
        fetchBookings();
      } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking');
      } finally {
        setUpdating(false);
      }
    }
  };

  const viewBooking = (booking) => {
    setSelectedBooking(booking);
    setAdminNotes('');
    setAttachment(null);
    setShowModal(true);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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
  
  const calculateRentalDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <p className="text-gray-600">Review and manage all customer bookings</p>
        </div>
      </div>

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
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                </div>
            </div>
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg"
            >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
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
                  <tr key={booking._id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4"><button onClick={() => viewBooking(booking)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Eye size={14} /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && ( <div className="text-center py-12 text-gray-500"><Calendar size={48} className="mx-auto mb-2" /><p>No bookings found.</p></div> )}
        </div>
      )}

      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                  <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {selectedBooking.bookingReference}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <InfoBlock title="Customer Information" icon={Users}>
                    <InfoRow label="Name" value={`${selectedBooking.firstName} ${selectedBooking.lastName}`} />
                    <InfoRow label="Email" value={selectedBooking.email} icon={Mail} />
                    <InfoRow label="Phone" value={selectedBooking.phone} icon={Phone} />
                  </InfoBlock>

                  <InfoBlock title="Booking Details" icon={Calendar}>
                    <InfoRow label="Service Type" value={selectedBooking.itemType} icon={selectedBooking.itemType === 'car' ? Car : Package} />
                    <InfoRow label="Service Name" value={selectedBooking.itemName} />
                    <InfoRow label="Pickup/Start" value={formatDateTime(selectedBooking.startDate)} icon={Clock} />
                    {selectedBooking.itemType === 'car' && (
                      <>
                        <InfoRow label="Return Date" value={formatDate(selectedBooking.endDate)} />
                        <InfoRow label="Rental Duration" value={`${calculateRentalDays(selectedBooking.startDate, selectedBooking.endDate)} days`} />
                      </>
                    )}
                  </InfoBlock>

                  <InfoBlock title="Location Details" icon={MapPin}>
                    <InfoRow label="Method" value={selectedBooking.deliveryMethod} />
                    {selectedBooking.deliveryMethod === 'pickup' ? (
                      <InfoRow label="Pickup Location" value={selectedBooking.pickupLocation} />
                    ) : (
                      <>
                        <InfoRow label="Drop-off Address" value={selectedBooking.dropoffLocation} />
                        {selectedBooking.dropoffCoordinates && (
                          <div className="mt-2">
                            <a 
                              href={`http://googleusercontent.com/maps/search/?api=1&query=${selectedBooking.dropoffCoordinates.lat},${selectedBooking.dropoffCoordinates.lng}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <LinkIcon size={14} /> View on Google Maps
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </InfoBlock>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <InfoBlock title="Payment Details" icon={ImageIcon}>
                    {selectedBooking.originalPrice && selectedBooking.originalPrice > selectedBooking.totalPrice ? (
                        <>
                            <InfoRow label="Original Price" value={formatPrice(selectedBooking.originalPrice)} />
                            <InfoRow label="Discount Applied" value={`- ${formatPrice(selectedBooking.discountApplied)}`} />
                            {selectedBooking.promotionTitle && <InfoRow label="Promotion" value={selectedBooking.promotionTitle} icon={Tag} />}
                            <hr className="my-2 border-gray-200"/>
                        </>
                    ) : null}
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">Total Amount Due:</span>
                        <span className="text-2xl font-bold text-blue-600">{formatPrice(selectedBooking.totalPrice)}</span>
                    </div>
                    <InfoRow label="Amount Paid" value={formatPrice(selectedBooking.amountPaid)} icon={DollarSign} />
                    <InfoRow label="Payment Reference" value={selectedBooking.paymentReference} icon={Hash} />
                    {/* --- SECURE IMAGE RETRIEVAL FOR PAYMENT PROOF --- */}
                    {selectedBooking.paymentProof ? (
                      paymentProofLoading ? (
                          <div className="w-full h-40 bg-gray-200 animate-pulse flex items-center justify-center text-xs text-gray-500 rounded-lg">Loading Proof...</div>
                      ) : (
                          <a href={paymentProofUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block">
                              <img 
                                  src={paymentProofUrl} 
                                  alt="Payment Proof" 
                                  className="w-full h-auto max-h-64 rounded-lg object-contain border" 
                                  onError={(e) => { 
                                      e.target.onerror = null; e.target.src = 'https://placehold.co/300x200/fecaca/991b1b?text=Error/Expired'; 
                                  }}
                              />
                          </a>
                      )
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">No payment proof uploaded.</p>
                    )}
                    {/* --- END SECURE IMAGE RETRIEVAL --- */}
                  </InfoBlock>

                  <InfoBlock title="Admin Actions" icon={FileText}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-semibold">Current Status:</span>
                        {getStatusBadge(selectedBooking.status)}
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" className="w-full p-2 border rounded-lg" placeholder="Add notes for the customer..." />
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attach File</label>
                      <div className="flex items-center gap-2">
                        <input type="file" onChange={(e) => setAttachment(e.target.files[0])} className="text-sm" />
                        {attachment && <button onClick={() => setAttachment(null)}><X size={16} className="text-red-500"/></button>}
                      </div>
                    </div>
                  </InfoBlock>

                  {selectedBooking.status === 'pending' && (
                    <div className="flex gap-3">
                      <button onClick={() => handleStatusUpdate(selectedBooking._id, 'confirmed')} disabled={updating} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><Check size={16} /> Confirm</button>
                      <button onClick={() => handleStatusUpdate(selectedBooking._id, 'rejected')} disabled={updating} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><X size={16} /> Reject</button>
                    </div>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <div className="flex gap-3">
                      <button onClick={() => handleStatusUpdate(selectedBooking._id, 'completed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><Check size={16} /> Mark as Completed</button>
                      <button onClick={() => handleCancelBooking(selectedBooking._id)} disabled={updating} className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><X size={16} /> Cancel Booking</button>
                    </div>
                  )}
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
  <div className="flex justify-between text-sm">
    <span className="text-gray-600 flex items-center gap-1.5">{Icon && <Icon size={14} />} {label}:</span>
    <span className="font-medium text-gray-800 text-right">{value || 'N/A'}</span>
  </div>
);

export default ManageBookings;