import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useApi } from '../../hooks/useApi';
import DataService, { getImageUrl } from '../../components/services/DataService';
import { X, Eye, Calendar, Clock, User, Car, MapPin, Check, FileText, Link as LinkIcon, Hash, Package, DollarSign, Image as ImageIcon } from 'lucide-react';

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

// --- MODALS AND SUB-COMPONENTS ---

// Modal for displaying events on a specific day
const DayEventsModal = ({ date, events, onClose, onEventSelect }) => {
  if (!date || events.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={20} />
            Bookings for {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 divide-y divide-gray-200">
          {events.map(event => (
            <div key={event.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: event.backgroundColor }}></div>
                  <div>
                    <p className="font-semibold text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Clock size={14} /> {new Date(event.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      <span className="capitalize flex items-center gap-1.5">
                        {event.extendedProps.itemType === 'car' ? <Car size={14} /> : <MapPin size={14} />}
                        {event.extendedProps.item}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onEventSelect(event.id)}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
                >
                  <Eye size={14} /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Full Booking Detail Modal
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


// --- Main Calendar Component ---
const BookingCalendar = () => {
  const { data: bookingsData, loading, refetch: fetchBookings } = useApi(DataService.fetchAllBookings);
  const bookings = useMemo(() => bookingsData?.data || [], [bookingsData]);

  const [modalState, setModalState] = useState({ isOpen: false, date: null, events: [] });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilters, setStatusFilters] = useState(['pending', 'confirmed']);

  const handleFilterChange = (status) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredBookings = useMemo(() => {
    if (statusFilters.length === 0) return [];
    return bookings.filter(b => statusFilters.includes(b.status));
  }, [bookings, statusFilters]);

  const getStatusStyle = (status) => {
    const styles = {
      pending: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
      confirmed: { backgroundColor: '#34D399', borderColor: '#34D399' },
      cancelled: { backgroundColor: '#9CA3AF', borderColor: '#6B7280' },
      completed: { backgroundColor: '#60A5FA', borderColor: '#3B82F6' },
      rejected: { backgroundColor: '#F87171', borderColor: '#EF4444' },
    };
    return styles[status] || { backgroundColor: '#A1A1AA', borderColor: '#71717A' };
  };
  
  const events = useMemo(() => filteredBookings.map(booking => {
    // Ensure dates are valid before creating event
    const startDate = new Date(booking.startDate);
    const endDate = booking.endDate ? new Date(booking.endDate) : null;
    if (isNaN(startDate.getTime())) return null; // Skip invalid entries

    return {
        id: booking._id,
        title: `${booking.bookingReference}`,
        start: startDate,
        end: endDate,
        allDay: !!endDate && booking.startDate.split('T')[0] !== booking.endDate.split('T')[0],
        ...getStatusStyle(booking.status),
        extendedProps: {
          item: booking.itemName,
          itemType: booking.itemType,
          status: booking.status,
          customer: `${booking.firstName} ${booking.lastName}`
        }
    };
  }).filter(Boolean), [filteredBookings]); // Filter out null (invalid) events

  const handleDateClick = (arg) => {
    // FIX: Ensure date objects are valid before comparison
    const clickedDate = new Date(arg.dateStr);
    clickedDate.setHours(0,0,0,0);

    const dayEvents = events.filter(event => {
        const eventStart = new Date(event.start);
        eventStart.setHours(0,0,0,0);
        
        // Handle events without an end date (e.g., single-day tours)
        if (!event.end) {
            return eventStart.getTime() === clickedDate.getTime();
        }

        const eventEnd = new Date(event.end);
        eventEnd.setHours(0,0,0,0);

        return clickedDate >= eventStart && clickedDate < eventEnd;
    });

    if (dayEvents.length > 0) {
      // Use setTimeout to avoid flushSync warning
      setTimeout(() => {
        setModalState({ isOpen: true, date: arg.date, events: dayEvents });
      }, 0);
    }
  };

  const handleEventClick = (clickInfo) => {
    // Use setTimeout to avoid flushSync warning
    setTimeout(() => {
        handleViewBookingDetails(clickInfo.event.id);
    }, 0);
  };
  
  const handleViewBookingDetails = (bookingId) => {
    const booking = bookings.find(b => b._id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setModalState({ isOpen: false, date: null, events: [] }); // Close day modal if open
    }
  };

  const eventContent = (eventInfo) => (
    <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-ellipsis px-1 py-0.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: eventInfo.backgroundColor }}></span>
      <span className="text-xs font-medium text-gray-800">{eventInfo.event.title}</span>
    </div>
  );

  const filtersOptions = [
    { label: 'Pending', value: 'pending', color: 'yellow-400' },
    { label: 'Confirmed', value: 'confirmed', color: 'green-400' },
    { label: 'Completed', value: 'completed', color: 'blue-400' },
    { label: 'Cancelled', value: 'cancelled', color: 'gray-400' },
    { label: 'Rejected', value: 'rejected', color: 'red-400' },
  ];

  if (loading) return <div className="text-center p-8">Loading Calendar...</div>;

  return (
    <>
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-800">Booking Calendar</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm font-semibold">Show:</span>
                {filtersOptions.map(filter => (
                    <label key={filter.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={statusFilters.includes(filter.value)}
                            onChange={() => handleFilterChange(filter.value)}
                            className={`form-checkbox h-4 w-4 rounded text-${filter.color} focus:ring-${filter.color}`}
                            style={{ color: getStatusStyle(filter.value).backgroundColor }}
                        />
                        <span className="capitalize">{filter.label}</span>
                    </label>
                ))}
            </div>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          events={events}
          editable={false}
          selectable={true}
          dayMaxEvents={true}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={eventContent}
          eventDisplay="block"
          eventClassNames="border-none rounded-md hover:opacity-80 transition-opacity cursor-pointer bg-gray-100"
        />
      </div>

      {modalState.isOpen && (
        <DayEventsModal
            date={modalState.date}
            events={modalState.events}
            onClose={() => setModalState({ isOpen: false, date: null, events: [] })}
            onEventSelect={handleViewBookingDetails}
        />
      )}
      
      {selectedBooking && (
          <BookingDetailModal
            booking={selectedBooking} 
            onClose={() => setSelectedBooking(null)} 
            onUpdate={() => {
              fetchBookings();
              setSelectedBooking(null);
            }}
          />
      )}
    </>
  );
};

export default BookingCalendar;