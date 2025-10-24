// client/src/pages/TransportDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Star, Check, X as XIcon, Award, Calendar, Bus, List, Tag } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import DataService, { getImageUrl } from '../components/services/DataService';
import BookingModal from '../components/BookingModal';
import bgCar from '../assets/bgCar.jpg'; // Reusing car background

// Helper to format currency
const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
};

const TransportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: serviceData, loading, error } = useApi(() => DataService.fetchTransportById(id), [id]); // Assuming fetchTransportById exists
  const service = serviceData?.data;

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mainImage, setMainImage] = useState('');

  useEffect(() => {
    if (service && service.images && service.images.length > 0) {
      setMainImage(service.images[0]);
    }
  }, [service]);

  const handleBookTransport = () => {
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !service) {
    return <div className="text-center p-12 text-red-500">Error: {error?.message || 'Transport service not found.'}</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
       {/* Hero Section */}
      <div className="relative bg-cover bg-center text-white h-64" style={{ backgroundImage: `url(${bgCar})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div>
            <button onClick={() => navigate('/transport')} className="flex items-center gap-2 mb-4 text-white/80 hover:text-white font-medium">
              <ArrowLeft size={18} /> Back to transport list
            </button>
            <h1 className="text-4xl font-bold drop-shadow-lg">{service.vehicleType} {service.name ? `(${service.name})` : ''}</h1>
            <p className="text-lg text-white/90 drop-shadow-md mt-1">{service.capacity}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
              {/* Image Gallery */}
              <div className="h-96 w-full mb-4 rounded-lg overflow-hidden bg-gray-200">
                <img src={getImageUrl(mainImage)} alt={service.vehicleType} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
              </div>
              {service.images && service.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {service.images.map((img, index) => (
                    <div key={index} className={`h-20 rounded-md overflow-hidden cursor-pointer border-2 ${mainImage === img ? 'border-blue-600' : 'border-transparent'}`} onClick={() => setMainImage(img)}>
                      <img src={getImageUrl(img)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="mt-6 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2>
                <p className="text-gray-600 leading-relaxed">{service.description || 'No description provided.'}</p>
              </div>

              {/* Amenities */}
              {service.amenities && service.amenities.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {service.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-gray-700">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Table */}
              {service.pricing && service.pricing.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Pricing Guide</h2>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Destination</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Day Tour ({service.pricing[0].dayTourTime || 'N/A'} hrs)</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Overnight</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">3D2N</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Drop & Pick</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {service.pricing.map((priceRow, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 font-medium text-gray-900">{priceRow.destination} {priceRow.region ? `(${priceRow.region})` : ''}</td>
                            <td className="px-4 py-2">{formatPrice(priceRow.dayTourPrice)}</td>
                            <td className="px-4 py-2">{formatPrice(priceRow.ovnPrice)}</td>
                            <td className="px-4 py-2">{formatPrice(priceRow.threeDayTwoNightPrice)}</td>
                            <td className="px-4 py-2">{formatPrice(priceRow.dropAndPickPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Box */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 bg-white rounded-xl shadow-lg p-6 border">
               <div className="flex items-center gap-2 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bus className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{service.vehicleType} {service.name ? `(${service.name})` : ''}</h1>
                    <p className="text-gray-600 flex items-center gap-1"><Users size={16} /> {service.capacity}</p>
                  </div>
               </div>

              <p className="text-gray-600 mb-6">
                Ready to book this service? Select your dates and provide payment details. Pricing depends on the destination and duration.
              </p>
              <button
                onClick={handleBookTransport}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400"
                disabled={!service.isAvailable}
              >
                {service.isAvailable ? 'Book Now' : 'Currently Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showBookingModal && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          item={service} // Pass the service object
          itemType="transport" // Set itemType to transport
        />
      )}
    </div>
  );
};

export default TransportDetails;