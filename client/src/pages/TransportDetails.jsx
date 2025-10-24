// client/src/pages/TransportDetails.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import DataService, { getImageUrl } from '../components/services/DataService'; // Import DataService and getImageUrl
import BookingModal from '../components/BookingModal';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { formatPrice } from '../utils/helpers';

const TransportDetails = () => {
  const { id } = useParams();

  // --- Start of Fix ---

  // 1. Get the 'execute' function from useApi.
  const {
    data: serviceData, // This will be { success: true, ... } OR { success: false, ... }
    loading,
    error: hookError, // This catches JS/network errors
    execute: fetchService,
  } = useApi(() => DataService.fetchTransportById(id), [], { immediate: false }); // Pass ID via closure

  // 2. Use useEffect to call execute once the 'id' is available.
  useEffect(() => {
    if (id) {
      // We don't need a .catch() because DataService doesn't throw
      fetchService(id);
    }
  }, [id, fetchService]);

  // 3. Get the actual service object and the *real* error
  const service = serviceData?.data; // Correctly access the service object
  // The real error is EITHER an error from the hook OR a { success: false } response
  const realError = hookError || (serviceData?.success === false ? serviceData.message : null);

  // --- End of Fix ---

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleBookingSubmit = async (bookingData) => {
    try {
      const response = await DataService.createBooking(bookingData);
      if (!response.success) throw new Error(response.message);

      toast.success(
        response.message || 'Booking request sent! We will contact you shortly.'
      );
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to submit booking request.');
    }
  };

  const nextImage = () => {
    if (!service || !service.images || service.images.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === service.images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    if (!service || !service.images || service.images.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? service.images.length - 1 : prevIndex - 1
    );
  };

  // --- Updated Loading/Error Checks ---
  if (loading) return <div className="container mx-auto p-4 pt-24 text-center">Loading...</div>;

  // Now we check for the realError
  if (realError)
    return <div className="container mx-auto p-4 pt-24 text-red-500">Error: {String(realError)}</div>;

  // This check is still valid, in case loading is done but data is missing
  if (!service) return <div className="container mx-auto p-4 pt-24 text-center">Service not found.</div>;
  // ---

  const mainImage =
    service.images && service.images.length > 0
      ? getImageUrl(service.images[currentImageIndex]) // Use getImageUrl
      : 'https://via.placeholder.com/800x600.png?text=No+Image+Available';

  return (
    <div className="container mx-auto p-4 pt-24">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Gallery */}
          <div className="relative">
            <img
              src={mainImage}
              alt={service.name}
              className="w-full h-96 object-cover"
            />
            {service.images && service.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Service Details */}
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-2">
              {service.name || 'Transport Service'}
            </h1>
            <p className="text-xl text-gray-600 mb-4">{service.vehicleType}</p>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Capacity</h3>
              <p className="text-gray-700">{service.capacity}</p>
            </div>

            {service.amenities && service.amenities.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Amenities</h3>
                <ul className="flex flex-wrap gap-2">
                  {service.amenities.map((amenity, index) => (
                    <li
                      key={index}
                      className="flex items-center text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {service.description && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {service.description}
                </p>
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition duration-300"
            >
              Book Now
            </button>
          </div>
        </div>

        {/* --- Pricing Table (No changes needed here) --- */}
        {service.pricing && service.pricing.length > 0 && (
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Pricing Guide
            </h2>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day Tour
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overnight (OVN)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      3 Days / 2 Nights
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Drop & Pick
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {service.pricing.map((priceRow, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {priceRow.destination}
                        </div>
                        {priceRow.region && (
                          <div className="text-xs text-gray-500">
                            {priceRow.region}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>{formatPrice(priceRow.dayTourPrice)}</div>
                        {priceRow.dayTourTime && (
                          <div className="text-xs text-gray-500">
                            ({priceRow.dayTourTime} hrs)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPrice(priceRow.ovnPrice)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPrice(priceRow.threeDayTwoNightPrice)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPrice(priceRow.dropAndPickPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              *All inclusions (Diesel, Driver, Driver's Meal, Driver's Fee, Toll
              Fee) are included in the price. Parking fee is not included.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              *Prices are indicative and subject to final quote upon booking
              request.
            </p>
          </div>
        )}
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSubmit}
        item={service}
        itemType="transport"
      />
    </div>
  );
};

export default TransportDetails;