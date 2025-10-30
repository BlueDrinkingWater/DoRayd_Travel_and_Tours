import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import DataService from '../../components/services/DataService';
import { useAuth } from '../../components/Login';
import { useSocket } from '../../hooks/useSocket';
import { X, Check, Eye, Trash2, Search, ChevronDown, ChevronUp, Car, MapPin, DollarSign, User, FileText, Info, Paperclip, CreditCard, Hash, Phone, Calendar as CalendarIcon, Package, Bus, Tag, MessageSquare } from 'lucide-react';
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; // For attachments

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

// --- STATUS BADGE ---
const getStatusBadge = (status) => {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Declined' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed (Paid)' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
};

// --- Secure Attachment Component ---
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

const InfoRow = ({ label, value, icon: Icon, isNote = false, isStatus = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between text-sm py-1">
    <span className="text-gray-600 flex items-center gap-1.5 mb-1 sm:mb-0 whitespace-nowrap">{Icon && <Icon size={14} className="flex-shrink-0" />} {label}:</span>
    {isStatus ? value : <span className={`font-medium text-gray-800 text-left sm:text-right ${isNote ? 'whitespace-pre-wrap w-full sm:w-auto' : 'break-words'}`}>{value || 'N/A'}</span>}
  </div>
);

// --- Refund Detail Modal ---
const RefundDetailModal = ({ refundRequest, onClose, onUpdate }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    if ((newStatus === 'declined') && !adminNotes.trim()) {
      alert('Please provide a note/reason for declining the request.');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('adminNotes', adminNotes.trim() || `Request status set to ${newStatus}.`);
      
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const result = await DataService.updateRefundStatus(refundRequest._id, formData);
      if (result.success) {
        alert(`Refund request updated to ${newStatus} successfully!`);
        onUpdate(); // Refetch all requests
        onClose();  // Close modal
      } else {
        throw new Error(result.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating refund status:', error);
      alert(`Failed to update status: ${error.message || 'Please try again.'}`);
    } finally {
      setUpdating(false);
    }
  };

  if (!refundRequest) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Refund Request Details</h2>
              <p className="text-gray-600 flex items-center gap-2"><Hash size={16} /> {refundRequest.bookingReference}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <InfoBlock title="Request Summary" icon={FileText}>
                <InfoRow label="Submitter" value={refundRequest.submitterName} icon={User} />
                <InfoRow label="Email" value={refundRequest.submitterEmail} icon={Info} />
                <InfoRow label="Phone" value={refundRequest.submitterPhone} icon={Phone} />
                <hr className="my-2" />
                <InfoRow label="Service" value={refundRequest.itemName} icon={refundRequest.itemType === 'car' ? Car : (refundRequest.itemType === 'tour' ? MapPin : Bus)} />
                <InfoRow label="Booking Date" value={formatDateTime(refundRequest.bookingStartDate)} icon={CalendarIcon} />
                <InfoRow label="Reason" value={refundRequest.reason} isNote={true} icon={MessageSquare} />
              </InfoBlock>

              <InfoBlock title="Refund Calculation" icon={DollarSign}>
                <InfoRow label="Booking Price" value={formatPrice(refundRequest.bookingTotalPrice)} />
                <InfoRow label="Refund Policy" value={refundRequest.refundPolicy} isStatus={
                    <span className={`font-medium capitalize px-2 py-0.5 rounded-full ${
                        refundRequest.refundPolicy === 'full' ? 'bg-green-100 text-green-800' :
                        refundRequest.refundPolicy === 'half' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {refundRequest.refundPolicy}
                    </span>
                } />
                <div className="flex justify-between items-center mt-4 pt-2 border-t">
                  <span className="font-semibold text-gray-900">Calculated Refund:</span>
                  <span className="font-bold text-lg text-blue-600">{formatPrice(refundRequest.calculatedRefundAmount)}</span>
                </div>
              </InfoBlock>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <InfoBlock title="Communication Log" icon={Info}>
                <InfoRow label="Current Status" value={getStatusBadge(refundRequest.status)} isStatus={true} />
                {refundRequest.notes && refundRequest.notes.length > 0 ? (
                  refundRequest.notes.slice().reverse().map((note, index) => (
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

              <InfoBlock title="Admin Actions" icon={FileText}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Note / Reason *</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Required for declining, optional for others..." />
                
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attach Proof of Refund (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input type="file" onChange={(e) => setAttachment(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    {attachment && <button onClick={() => { setAttachment(null); const input = document.querySelector('input[type="file"]'); if(input) input.value = ''; }}><X size={16} className="text-red-500" /></button>}
                  </div>
                  {attachment && <span className="text-xs text-gray-500 italic mt-1 block">File: {attachment.name}</span>}
                </div>
              </InfoBlock>
              
              <div className="mt-6 space-y-3">
                {refundRequest.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => handleStatusUpdate('approved')} disabled={updating} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-400"><Check size={16} /> Approve</button>
                    <button onClick={() => handleStatusUpdate('declined')} disabled={updating || !adminNotes.trim()} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><X size={16} /> Decline *</button>
                  </div>
                )}
                {refundRequest.status === 'approved' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleStatusUpdate('confirmed')} disabled={updating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"><Check size={16} /> Confirm Refund Sent</button>
                  </div>
                )}
                {(refundRequest.status === 'declined' || refundRequest.status === 'confirmed') && (
                  <p className="text-sm text-center text-gray-500 italic py-4">No further actions available for this request.</p>
                )}
                <p className="text-xs text-gray-500 text-center">* Note required for Decline action.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const ManageRefunds = () => {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 500); // 500ms delay
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // API call
  const { data: refundsData, loading, error, refetch } = useApi(
    () => DataService.fetchAllRefunds(filters),
    [filters] // Refetch when filters change
  );
  
  const requests = refundsData?.data || [];

  // Real-time updates
  const { socket } = useSocket();
  useEffect(() => {
    if (socket) {
      const handleRefundUpdate = () => {
        refetch();
      };
      // Listen for a new general event you can create, e.g., 'refund-update'
      socket.on('new-refund-request', handleRefundUpdate);
      socket.on('refund-updated', handleRefundUpdate);

      return () => {
        socket.off('new-refund-request', handleRefundUpdate);
        socket.off('refund-updated', handleRefundUpdate);
      };
    }
  }, [socket, refetch]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Manage Refund Requests</h1>
      
      {/* Filter Bar */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="confirmed">Confirmed (Paid)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading requests...</td></tr>}
              {error && <tr><td colSpan="7" className="text-center py-8 text-red-500">{error.message || 'Failed to load data.'}</td></tr>}
              {!loading && requests.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-500">No refund requests found.</td></tr>}
              
              {!loading && requests.map(req => (
                <tr key={req._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                        {req.itemType === 'car' && <Car className="h-5 w-5 text-blue-500" />}
                        {req.itemType === 'tour' && <MapPin className="h-5 w-5 text-green-500" />}
                        {req.itemType === 'transport' && <Bus className="h-5 w-5 text-indigo-500" />}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{req.itemName}</div>
                        <div className="text-xs text-gray-500">{req.bookingReference}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{req.submitterName}</div>
                    <div className="text-xs text-gray-500">{req.submitterEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateTime(req.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatPrice(req.calculatedRefundAmount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                        req.refundPolicy === 'full' ? 'bg-green-100 text-green-800' :
                        req.refundPolicy === 'half' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {req.refundPolicy}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setSelectedRequest(req)} className="text-blue-600 hover:text-blue-800" title="View Details">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedRequest && (
        <RefundDetailModal
          refundRequest={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={refetch} // Pass the refetch function to the modal
        />
      )}
    </div>
  );
};

export default ManageRefunds;