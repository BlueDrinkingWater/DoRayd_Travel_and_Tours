import React, { useEffect, useState } from 'react';
import DataService from '../components/services/DataService';
import { useAuth } from '../components/Login';
import { Car, MapPin, Calendar, Clock } from 'lucide-react';
import { useApi } from '../hooks/useApi';

const MyBookings = () => {
  const { user } = useAuth();
  const { data: bookingsData, loading, error } = useApi(() => DataService.fetchUserBookings(), [user]);
  const bookings = bookingsData?.data || [];

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>{status}</span>;
  };

  if (loading) return <div className="text-center p-12">Loading your bookings...</div>;
  if (error) return <div className="text-center p-12 text-red-500">Error: {error.message}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      {bookings.length === 0 ? (
        <p>You have no bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking._id} className="bg-white shadow-md rounded-lg p-4 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {booking.itemType === 'car' ? <Car className="text-blue-500" /> : <MapPin className="text-green-500" />}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold text-lg">{booking.itemId?.title || `${booking.itemId?.brand} ${booking.itemId?.model}`}</h2>
                  {getStatusBadge(booking.status)}
                </div>
                <p className="text-sm text-gray-500">Ref: {booking.bookingReference}</p>
                <div className="text-sm text-gray-700 mt-2 flex gap-4">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(booking.startDate).toLocaleDateString()}</span>
                  <span className="font-bold text-lg">₱{booking.totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;