import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Fuel, Settings2, MapPin, Check, Star } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import DataService, { getImageUrl } from '../components/services/DataService';
import BookingModal from '../components/BookingModal';

// --- Reviews Section Component ---
const ReviewsSection = ({ itemId }) => {
  const { data: reviewsData, loading: reviewsLoading } = useApi(() => DataService.fetchReviewsForItem(itemId), [itemId]);
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
          <p className="text-gray-600">No reviews yet. Be the first to review this car!</p>
        </div>
      )}
    </div>
  );
};

const CarDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: carData, loading, error } = useApi(() => DataService.fetchCarById(id), [id]);
  const car = carData?.data;

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mainImage, setMainImage] = useState('');

  useEffect(() => {
    if (car && car.images && car.images.length > 0) {
      setMainImage(car.images[0]);
    }
  }, [car]);

  const handleBookCar = () => {
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !car) {
    return <div className="text-center p-12 text-red-500">Error: {error?.message || 'Car not found.'}</div>;
  }
  
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-gray-600 hover:text-blue-700 font-medium">
            <ArrowLeft size={18} /> Back to all cars
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
              <div className="h-96 w-full mb-4 rounded-lg overflow-hidden bg-gray-200">
                <img
                  src={getImageUrl(mainImage)}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              {car.images && car.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {car.images.map((img, index) => (
                    <div 
                      key={index} 
                      className={`h-20 rounded-md overflow-hidden cursor-pointer border-2 ${mainImage === img ? 'border-blue-600' : 'border-transparent'}`}
                      onClick={() => setMainImage(img)}
                    >
                      <img src={getImageUrl(img)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{car.brand} {car.model}</h1>
                    <p className="text-lg text-gray-500">{car.year}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4" />
                    <span className="font-bold text-sm">{car.ratings?.average || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Specifications</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Users, label: 'Seats', value: `${car.seats} passengers` },
                    { icon: Settings2, label: 'Transmission', value: car.transmission },
                    { icon: Fuel, label: 'Fuel Type', value: car.fuelType },
                    { icon: MapPin, label: 'Location', value: car.location },
                  ].map((spec, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                      <spec.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{spec.label}</p>
                      <p className="font-semibold text-gray-800 capitalize">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Description</h2>
                <p className="text-gray-600 leading-relaxed">{car.description}</p>
              </div>

              {car.features && car.features.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Features</h2>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {car.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {car.pickupLocations && car.pickupLocations.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Pickup Locations</h2>
                  <div className="flex flex-wrap gap-3">
                    {car.pickupLocations.map((location, index) => (
                      <div key={index} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ReviewsSection itemId={id} />

            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-28 bg-white rounded-xl shadow-lg p-6 border">
              {car.promotion && (
                <div className="mb-4 bg-red-500 text-white text-center font-bold py-2 rounded-lg">
                  {car.promotion.discountType === 'percentage'
                    ? `${car.promotion.discountValue}% OFF - ${car.promotion.title}`
                    : `₱${car.promotion.discountValue} OFF - ${car.promotion.title}`}
                </div>
              )}
              <div className="flex items-baseline mb-6">
                {car.originalPrice && car.originalPrice > car.pricePerDay && (
                    <span className="text-gray-500 line-through mr-2">{car.originalPrice.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
                )}
                <p className="text-3xl font-bold text-blue-600">
                    {car.pricePerDay.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                </p>
                <span className="text-lg text-gray-500 ml-1">/day</span>
              </div>
              <p className="text-gray-600 mb-6">
                Select your dates to book this vehicle. This price includes basic insurance and taxes.
              </p>
              <button 
                onClick={handleBookCar} 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105"
                disabled={!car.isAvailable}
              >
                {car.isAvailable ? 'Book Now' : 'Currently Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showBookingModal && <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} item={car} itemType="car" />}
    </div>
  );
};

export default CarDetails;