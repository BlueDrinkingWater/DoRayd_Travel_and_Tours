import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, Star, Check, X as XIcon, Award, Calendar } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import DataService, { SERVER_URL } from '../components/services/DataService';
import BookingModal from '../components/BookingModal';

// --- Reviews Section Component ---
const ReviewsSection = ({ carId }) => {
  const { data: reviewsData, loading: reviewsLoading } = useApi(() => DataService.fetchReviewsForItem(carId), [carId]);
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


const TourDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch tour details
  const { data: tourData, loading, error } = useApi(() => DataService.fetchTourById(id), [id]);
  const tour = tourData?.data;

  // Fetch approved reviews for this tour
  const { data: reviewsData, loading: reviewsLoading } = useApi(() => DataService.fetchReviewsForItem(id), [id]);
  const reviews = reviewsData?.data;
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mainImage, setMainImage] = useState('');

  useEffect(() => {
    if (tour && tour.images && tour.images.length > 0) {
      setMainImage(tour.images[0]);
    }
  }, [tour]);

  const handleBookTour = () => {
    setShowBookingModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !tour) {
    return <div className="text-center p-12 text-red-500">Error: {error?.message || 'Tour not found.'}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-gray-600 hover:text-green-700 font-medium">
          <ArrowLeft size={18} /> Back to all tours
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
              {/* Main Image */}
              <div className="h-96 w-full mb-4 rounded-lg overflow-hidden bg-gray-200">
                <img src={`${SERVER_URL}${mainImage}`} alt={tour.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
              </div>

              {/* Thumbnail Images */}
              {tour.images && tour.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {tour.images.map((img, index) => (
                    <div key={index} className={`h-20 rounded-md overflow-hidden cursor-pointer border-2 ${mainImage === img ? 'border-green-600' : 'border-transparent'}`} onClick={() => setMainImage(img)}>
                      <img src={`${SERVER_URL}${img}`} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                <div className="flex justify-between items-start">
                  <h1 className="text-3xl font-bold text-gray-900">{tour.title}</h1>
                  <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-semibold capitalize">{tour.category}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-600 mt-2">
                  <span className="flex items-center gap-1.5"><MapPin size={16} /> {tour.destination}</span>
                  <span className="flex items-center gap-1.5"><Star size={16} /> {tour.ratings?.average || 'N/A'} ratings</span>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Tour Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Clock, label: 'Duration', value: tour.duration },
                    { icon: Users, label: 'Group Size', value: `Up to ${tour.maxGroupSize}` },
                    { icon: Award, label: 'Difficulty', value: tour.difficulty },
                    { icon: Calendar, label: 'Schedule', value: 'Fixed Dates' },
                  ].map((spec, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                      <spec.icon className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{spec.label}</p>
                      <p className="font-semibold text-gray-800 capitalize">{spec.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">About This Tour</h2>
                <p className="text-gray-600 leading-relaxed">{tour.description}</p>
              </div>

              {tour.inclusions && tour.inclusions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">What's Included</h2>
                    <ul className="space-y-3">
                      {tour.inclusions.map((item, index) => (
                        <li key={index} className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                  {tour.exclusions && tour.exclusions.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">What's Not Included</h2>
                      <ul className="space-y-3">
                        {tour.exclusions.map((item, index) => (
                          <li key={index} className="flex items-center gap-3"><XIcon className="w-5 h-5 text-red-500" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {tour.itinerary && tour.itinerary.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Itinerary</h2>
                  <div className="space-y-4">
                    {tour.itinerary.map((day, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <h3 className="font-bold text-gray-900">Day {day.day}: {day.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{day.activities}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <ReviewsSection reviews={reviews} loading={reviewsLoading} />
              
            </div>
          </div>

          {/* Right Column: Booking */}
          <div className="lg:col-span-2">
            <div className="sticky top-28 bg-white rounded-xl shadow-lg p-6 border">
              <div className="flex items-baseline mb-2">
                <p className="text-3xl font-bold text-green-600">₱{tour.price?.toLocaleString()}</p>
                <span className="text-lg text-gray-500 ml-1">/person</span>
              </div>
              <div className="mb-6 bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="font-semibold text-green-800">Tour Schedule</p>
                <p className="text-sm text-green-700">{formatDate(tour.startDate)} - {formatDate(tour.endDate)}</p>
              </div>
              <p className="text-gray-600 mb-6">
                Book your spot on this fixed-date tour. Price includes all items listed under "What's Included".
              </p>
              <button onClick={handleBookTour} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-transform transform hover:scale-105" disabled={!tour.isAvailable}>
                {tour.isAvailable ? 'Book Now' : 'Currently Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showBookingModal && <BookingModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} item={tour} itemType="tour" />}
    </div>
  );
};

export default TourDetails;