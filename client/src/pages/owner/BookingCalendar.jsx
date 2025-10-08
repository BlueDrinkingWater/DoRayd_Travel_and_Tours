import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import DataService from '../../components/services/DataService';
import { useSocket } from '../../hooks/useSocket';
import { useApi } from '../../hooks/useApi';

const BookingCalendar = () => {
  const { data: bookingsData, loading, refetch: fetchBookings } = useApi(DataService.fetchAllBookings);
  const bookings = bookingsData?.data || [];
  const { connected } = useSocket();

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#FBBF24', borderColor: '#F59E0B' };
      case 'confirmed': return { backgroundColor: '#34D399', borderColor: '#10B981' };
      case 'cancelled': return { backgroundColor: '#9CA3AF', borderColor: '#6B7280' };
      case 'completed': return { backgroundColor: '#60A5FA', borderColor: '#3B82F6' };
      case 'rejected': return { backgroundColor: '#F87171', borderColor: '#EF4444' };
      default: return { backgroundColor: '#A1A1AA', borderColor: '#71717A' };
    }
  };

  const events = bookings.map(booking => ({
    id: booking._id,
    title: `${booking.bookingReference} - ${booking.firstName}`,
    start: new Date(booking.startDate),
    end: booking.endDate ? new Date(booking.endDate) : new Date(new Date(booking.startDate).getTime() + 2 * 60 * 60 * 1000),
    ...getStatusStyle(booking.status),
    extendedProps: {
      item: booking.itemType,
      status: booking.status,
      customer: `${booking.firstName} ${booking.lastName}`
    }
  }));

  if (loading) return <div className="text-center p-8">Loading Calendar...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Booking Calendar</h2>
        <div className="text-sm text-gray-500">
          Socket Status: {connected ? <span className="text-green-500 font-semibold">Connected</span> : <span className="text-red-500 font-semibold">Disconnected</span>}
        </div>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        editable={false}
        selectable={true}
        dayMaxEvents={true}
        eventDisplay="block"
        eventClassNames="text-white p-1 text-xs rounded-lg border-2"
      />
    </div>
  );
};

export default BookingCalendar;