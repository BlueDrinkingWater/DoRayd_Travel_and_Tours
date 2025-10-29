// client/src/pages/TransportDetails.jsx

import React, { useState, useEffect } from 'react'; // Keep useEffect
import { useParams, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import DataService, { getImageUrl } from '../components/services/DataService';
import BookingModal from '../components/BookingModal';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, CheckCircle, Tag, Star } from 'lucide-react'; // Added Star
import { formatPrice } from '../utils/helpers';
import { useApi as useApiHook } from '../hooks/useApi'; // Renamed for clarity within ReviewsSection if needed

// --- Reviews Section Component (Copied from CarDetails.jsx) ---
const ReviewsSection = ({ itemId }) => {
  // Using 'useApiHook' to avoid naming conflict if this component was inside TransportDetails
  const { data: reviewsData, loading: reviewsLoading } = useApiHook(() => DataService.fetchReviewsForItem(itemId), [itemId]);
  const reviews = reviewsData?.data || [];

  if (reviewsLoading) return <div className="text-center p-4">Loading reviews...</div>;

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold mb-6">Customer Reviews</h3>
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review._id} className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">
                    {review.isAnonymous ? 'Anonymous User' : `${review.user?.firstName} ${review.user?.lastName}`}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({review.rating}/5)</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          {/* Changed "this car" to "this service" */}
          <p className="text-gray-600">No reviews yet. Be the first to review this service!</p>
        </div>
      )}
    </div>
  );
};

const TransportDetails = () => {
  const { id } = useParams();

  // --- Start of Fix ---
  //
  // This is the correct way to use your existing useApi hook:
  // 1. Pass an apiFunction that checks if 'id' exists.
  // 2. Pass [id] as the dependencies array (the 2nd argument).
  // 3. Set immediate: true (in the 3rd argument).
  //
  // This tells useApi: "Run this function immediately, and re-run it *only* when 'id' changes."
  // This avoids the infinite loop without modifying useApi.jsx.
  //
  const {
    data: serviceData,
    loading,
    error: hookError,
  } = useApi(
    () => {
      // Only execute the fetch if 'id' is available
      if (id) {
        return DataService.fetchTransportById(id);
      }
      // Otherwise, return a resolved promise with null to avoid errors
      return Promise.resolve(null);
    },
    [id], // Dependencies array
    { immediate: true } // Options
  );

  // We no longer need the separate useEffect to call fetchService.
  // The hook handles fetching when 'id' changes.

  const service = serviceData?.data;
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
      prevIndex === 0 ? service.images.length - 1 : prevIndex + 1
    );
  };

  // --- Updated Loading/Error Checks ---
  if (loading && !serviceData) { // Show loading only on the initial load (when serviceData is null)
    return <div className="container mx-auto p-4 pt-24 text-center">Loading...</div>;
  }

  // Check for the realError
  if (realError) {
    return <div className="container mx-auto p-4 pt-24 text-red-500">Error: {String(realError)}</div>;
  }
  
  // This check is still valid. If 'id' was bad, serviceData might be { success: false }
  // or if 'id' was null, serviceData would be null, but loading would be false.
  if (!service) {
    return <div className="container mx-auto p-4 pt-24 text-center">Service not found.</div>;
  }
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

            {/* --- ADDED PROMOTION INFO BOX --- */}
            {service.promotion && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-700">
                            Special Offer: {service.promotion.title}!
                        </span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                        Get {service.promotion.discountType === 'percentage'
                            ? `${service.promotion.discountValue}% OFF`
                            : `₱${service.promotion.discountValue} OFF`} this service.
                        {service.promotion.discountType === 'percentage'
                            ? ' Prices in the table below reflect this discount.'
                            : ' This discount will be applied to your final price in the booking modal.'
                        }
                    </p>
                </div>
            )}
            {/* --- END OF ADDED BLOCK --- */}

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

        {/* --- Pricing Table (MODIFIED) --- */}
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
                  {service.pricing.map((priceRow, index) => {
                    
                    {/* --- ADDED PRICE CALCULATION LOGIC --- */}
                    const getDiscounted = (originalPrice) => {
                      // Only apply PERCENTAGE discounts to the price list
                      if (!service.promotion || service.promotion.discountType !== 'percentage' || !originalPrice) {
                        return { price: originalPrice, original: null };
                      }
                      const { discountValue } = service.promotion;
                      let discountedPrice = originalPrice - (originalPrice * (discountValue / 100));
                      return { price: Math.max(0, discountedPrice), original: originalPrice };
                    };

                    const dayTour = getDiscounted(priceRow.dayTourPrice);
                    const ovn = getDiscounted(priceRow.ovnPrice);
                    const threeDay = getDiscounted(priceRow.threeDayTwoNightPrice);
                    const dropPick = getDiscounted(priceRow.dropAndPickPrice);
                    {/* --- END OF LOGIC --- */}
                    
                    return (
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
                          {/* --- MODIFIED TO SHOW DISCOUNT --- */}
                          {dayTour.original && (
                            <span className="text-xs text-red-500 line-through">{formatPrice(dayTour.original)}</span>
                          )}
                          <div>{formatPrice(dayTour.price)}</div>
                          {priceRow.dayTourTime && (
                            <div className="text-xs text-gray-500">
                              ({priceRow.dayTourTime} hrs)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {/* --- MODIFIED TO SHOW DISCOUNT --- */}
                          {ovn.original && (
                            <span className="text-xs text-red-500 line-through">{formatPrice(ovn.original)}</span>
                          )}
                          <div>{formatPrice(ovn.price)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {/* --- MODIFIED TO SHOW DISCOUNT --- */}
                          {threeDay.original && (
                            <span className="text-xs text-red-500 line-through">{formatPrice(threeDay.original)}</span>
                          )}
                          <div>{formatPrice(threeDay.price)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"> {/* <-- FIX 1: was whitespace-nowdwrap */}
                          {/* --- MODIFIED TO SHOW DISCOUNT --- */}
                          {dropPick.original && (
                            <span className="text-xs text-red-500 line-through">{formatPrice(dropPick.original)}</span>
                          )}
                          <div>{formatPrice(dropPick.price)}</div>
                        </td>
                      </tr>
                    );
                  })}
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
            </p> {/* <-- FIX 2: was </WELCOME> */}
          </div>
        )}

        {/* --- ADDED REVIEWS SECTION --- */}
        <div className="p-6 border-t border-gray-200">
          <ReviewsSection itemId={id} />
        </div>
        {/* --- END OF ADDED BLOCK --- */}

      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSubmit}
        item={service} // 'service' here includes the 'promotion' object
        itemType="transport"
      />
    </div>
  );
};

export default TransportDetails;