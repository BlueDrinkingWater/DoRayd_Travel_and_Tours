import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Car, TrendingUp, AlertCircle } from 'lucide-react';
import DataService from './services/DataService.jsx';

const Hero = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    type: 'cars',
    location: '',
    date: '',
    guests: 2
  });
  const [popularLocations, setPopularLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Loadin..... ');
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real data from database
        const [carsResponse, toursResponse] = await Promise.all([
          DataService.fetchAllCars({ page: 1, limit: 10 }),
          DataService.fetchAllTours({ page: 1, limit: 10 })
        ]);

        if (carsResponse.success && toursResponse.success) {
          // Extract unique locations from cars and tours stored in database
          const carLocations = carsResponse.data?.map(car => car.location).filter(Boolean) || [];
          const tourDestinations = toursResponse.data?.map(tour => tour.destination).filter(Boolean) || [];
          
          // Combine, deduplicate, and take the first 5
          const allLocations = [...new Set([...carLocations, ...tourDestinations])];
          setPopularLocations(allLocations.slice(0, 5));
          
          console.log(`Loaded ${allLocations.length} unique locations of tours`);
        } else {
          throw new Error('Failed to load location');
        }
      } catch (error) {
        console.error(' Error loading hero:', error);
        setError(error.message);
        setPopularLocations([]); // No fallback data - database dependent
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = () => {
    // Navigate to the appropriate page based on search params
    if (searchParams.type === 'cars') {
      navigate('/cars', { state: searchParams });
    } else {
      navigate('/tours', { state: searchParams });
    }

    console.log(`Search initiated for ${searchParams.type} at 2025-09-03 17:08:57`);
  };

  const handleInputChange = (key, value) => {
    setSearchParams(prev => ({ ...prev, [key]: value }));
  };

  const handleQuickSearch = (location) => {
    setSearchParams(prev => ({ ...prev, location }));
    handleSearch();
  };

  return (
    <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900 opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
            Discover the Philippines with DoRayd
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-white/90">
            Your journey begins here. Book premium cars and exciting tour packages from our website!.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleInputChange('type', 'cars')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm sm:text-base transition-colors ${
                searchParams.type === 'cars'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Car className="w-5 h-5 mr-2 inline-block" />
              Car Rental (Database)
            </button>
            <button
              onClick={() => handleInputChange('type', 'tours')}
              className={`flex-1 py-4 px-6 text-center font-medium text-sm sm:text-base transition-colors ${
                searchParams.type === 'tours'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-5 h-5 mr-2 inline-block" />
              Tour Packages (Database)
            </button>
          </div>

          {/* Search Form */}
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Seach data is unavailable</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {searchParams.type === 'cars' ? 'Pickup Location' : 'Destination'} (From Database)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchParams.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder={searchParams.type === 'cars' ? "Where will you pick up the car?" : "Where do you want to go?"}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {searchParams.type === 'cars' ? 'Pickup Date' : 'Tour Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {searchParams.type === 'cars' ? 'Passengers' : 'Guests'}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={searchParams.guests}
                    onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Popular Locations */}
              <div className="w-full sm:w-auto">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                ) : popularLocations.length > 0 ? (
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Popular (Database):
                    </span>
                    {popularLocations.map((location, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(location)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-xs text-red-500">
                    Unable to load popular locations 
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    No locations available 
                  </div>
                )}
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search {searchParams.type === 'cars' ? 'Cars' : 'Tours'} 
              </button>
            </div>
          </div>
        </div>

        {/* Promotional Text */}
        <div className="mt-8 text-center text-white/90">
          <p className="text-lg">
            {loading ? 
              'Loading exclusive deals from our database...' : 
              'Explore amazing destinations with our exclusive deals stored in the database!'
            }
          </p>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 text-center text-white/70 text-xs">
            <p>Database Status: {error ? 'Error' : loading ? 'Loading' : 'Connected'} | </p>
            <p>Locations: {popularLocations.length}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;