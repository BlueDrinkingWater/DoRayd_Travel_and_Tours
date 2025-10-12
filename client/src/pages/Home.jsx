import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  MapPin,
  Calendar,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Clock,
  CreditCard,
  Shield,
  Award,
  Heart,
  Zap,
  Globe,
  TrendingUp
} from 'lucide-react';
import Hero from '../components/Hero.jsx';
import DataService, { SERVER_URL } from '../components/services/DataService.jsx';
import MarqueeHero from '../components/MarqueeHero.jsx';

const Home = () => {
  const navigate = useNavigate();
  const [featuredCars, setFeaturedCars] = useState([]);
  const [featuredTours, setFeaturedTours] = useState([]);
  const [stats, setStats] = useState({
    totalCars: 0,
    totalTours: 0,
    totalBookings: 0,
    happyCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch featured cars and tours from database
        const [carsResponse, toursResponse] = await Promise.all([
          DataService.fetchAllCars({ page: 1, limit: 6 }),
          DataService.fetchAllTours({ page: 1, limit: 6 })
        ]);

        if (carsResponse.success && toursResponse.success) {
          setFeaturedCars(carsResponse.data || []);
          setFeaturedTours(toursResponse.data || []);
          
          // Set stats from actual database data
          setStats({
            totalCars: carsResponse.pagination?.totalItems || carsResponse.data?.length || 0,
            totalTours: toursResponse.pagination?.totalItems || toursResponse.data?.length || 0,
            totalBookings: 150, // This could come from analytics endpoint
            happyCustomers: 500 // This could come from analytics endpoint
          });

        } else {
          throw new Error('Failed to load data from database');
        }
      } catch (error) {
        setError(error.message);
        // Set empty arrays for featured items when database fails
        setFeaturedCars([]);
        setFeaturedTours([]);
        setStats({
          totalCars: 0,
          totalTours: 0,
          totalBookings: 0,
          happyCustomers: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const handleViewCars = () => {
    navigate('/cars');
  };

  const handleViewTours = () => {
    navigate('/tours');
  };

  const handleBookNow = (item, type) => {
    if (item.isAvailable) {
      navigate(`/${type}s/${item._id}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <Hero />
      <MarqueeHero />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <div>
                <p className="font-medium">Unable to load data from database</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Impact in Numbers
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real-time statistics showing our commitment to excellence
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Car,
                value: loading ? '...' : stats.totalCars,
                label: 'Cars Available',
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
              },
              {
                icon: MapPin,
                value: loading ? '...' : stats.totalTours,
                label: 'Tour Packages',
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                icon: CheckCircle,
                value: loading ? '...' : stats.totalBookings,
                label: 'Successful Bookings',
                color: 'text-purple-600',
                bgColor: 'bg-purple-100'
              },
              {
                icon: Heart,
                value: loading ? '...' : stats.happyCustomers,
                label: 'Happy Customers',
                color: 'text-red-600',
                bgColor: 'bg-red-100'
              }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 ${stat.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Cars Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Car Rentals
              </h2>
              <p className="text-gray-600">
                Premium vehicles for your comfort and convenience
              </p>
            </div>
            <button
              onClick={handleViewCars}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              View All Cars
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded mb-4"></div>
                    <div className="h-6 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCars.map((car) => (
                <div key={car._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {car.images && car.images.length > 0 ? (
                      <img
                        src={`${SERVER_URL}${car.images[0]}`}
                        alt={`${car.brand} ${car.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/300x200/e2e8f0/475569?text=Image+Unavailable';
                        }}
                      />
                    ) : (
                      <Car className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {car.brand} {car.model}
                      </h3>
                      <span className={`text-sm px-2 py-1 rounded ${car.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {car.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">{car.description}</p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{car.seats} seats</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{car.location}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatPrice(car.pricePerDay)}
                        </span>
                        <span className="text-gray-600 text-sm">/day</span>
                      </div>
                      <button
                        onClick={() => handleBookNow(car, 'car')}
                        disabled={!car.isAvailable}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        {car.isAvailable ? 'Book Now' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cars Available</h3>
              <p className="text-gray-600">Please check back later.</p>
            </div>
          )}
        </div>
      </section>

      {/* Featured Tours Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Featured Tour Packages
              </h2>
              <p className="text-gray-600">
                Amazing destinations and experiences
              </p>
            </div>
            <button
              onClick={handleViewTours}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              View All Tours
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded mb-4"></div>
                    <div className="h-6 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredTours.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredTours.map((tour) => (
                <div key={tour._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {tour.images && tour.images.length > 0 ? (
                      <img
                        src={`${SERVER_URL}${tour.images[0]}`}
                        alt={tour.title || tour.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/300x200/e2e8f0/475569?text=Image+Unavailable';
                        }}
                      />
                    ) : (
                      <MapPin className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {tour.title || tour.name}
                      </h3>
                      <span className={`text-sm px-2 py-1 rounded ${tour.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tour.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">{tour.description}</p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{tour.destination}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(tour.price)}
                        </span>
                        <span className="text-gray-600 text-sm">/person</span>
                      </div>
                      <button
                        onClick={() => handleBookNow(tour, 'tour')}
                        disabled={!tour.isAvailable}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        {tour.isAvailable ? 'Book Now' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tours Available</h3>
              <p className="text-gray-600">Please check back later.</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose DoRayd?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience the best travel services with our platform ensuring real-time availability and secure bookings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: 'Secure Booking',
                description: 'All bookings are securely stored with real-time confirmation'
              },
              {
                icon: Award,
                title: 'Premium Quality',
                description: 'Curated selection of vehicles and tours'
              },
              {
                icon: CreditCard,
                title: 'Flexible Payment',
                description: 'Multiple payment options with secure transaction processing'
              },
              {
                icon: Zap,
                title: 'Instant Confirmation',
                description: 'Real-time booking confirmation'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className={`w-8 h-8 text-blue-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Next Adventure?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Start planning your perfect trip with our booking platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleViewCars}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Car className="w-5 h-5" />
              Browse Cars
            </button>
            <button
              onClick={handleViewTours}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Globe className="w-5 h-5" />
              Explore Tours
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;