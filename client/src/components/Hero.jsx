import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Car, Globe, Bus } from 'lucide-react'; // <-- Import Bus icon
import bgHome from '../assets/bgHome.jpg';

const Hero = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    type: 'cars', // Default type
    location: '',
    date: '',
    guests: ''
  });

  const handleSearch = () => {
    // Navigate to the correct page based on the selected type,
    // passing the search params in the navigation state.
    if (searchParams.type === 'cars') {
      navigate('/cars', { state: searchParams });
    } else if (searchParams.type === 'tours') {
      navigate('/tours', { state: searchParams });
    } else if (searchParams.type === 'transport') { // <-- UPDATED: Navigate to /transport
      navigate('/transport', { state: searchParams });
    }
  };

  const handleInputChange = (key, value) => {
    setSearchParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <section
      className="bg-cover bg-center text-white relative h-[70vh] flex items-center justify-center"
      style={{ backgroundImage: `url(${bgHome})` }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000">
          Welcome To Our <br/> Travel Agency
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-1000 delay-200">
          Your journey begins here. Book premium cars, exciting tours, and reliable transport with real-time availability.
        </p>

        {/* Search Box */}
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden text-left animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleInputChange('type', 'cars')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                searchParams.type === 'cars'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Car size={16} /> Car Rental
            </button>
            <button
              onClick={() => handleInputChange('type', 'tours')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                searchParams.type === 'tours'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MapPin size={16} /> Tour Packages
            </button>
            {/* --- NEW TRANSPORT TAB --- */}
            <button
              onClick={() => handleInputChange('type', 'transport')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                searchParams.type === 'transport'
                  ? 'text-purple-600 border-b-2 border-purple-600' // Changed icon/color
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bus size={16} /> Transportation {/* Changed icon */}
            </button>
            {/* --- END NEW TAB --- */}
          </div>

          {/* Search Inputs */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Location / Destination</label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchParams.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder={ // <-- UPDATED Placeholder logic
                    searchParams.type === 'cars' ? "City, Airport, or Hotel" :
                    searchParams.type === 'tours' ? "Destination" :
                    "Pickup or Dropoff Location" // Placeholder for transport
                  }
                  className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700">Date</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-700">{searchParams.type === 'transport' ? 'Passengers' : 'Guests'}</label> {/* Label change */}
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={searchParams.guests}
                  min="1"
                  placeholder='1' // Placeholder
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or positive integers
                    const numericValue = value === '' ? '' : parseInt(value, 10);
                    if (!isNaN(numericValue) && numericValue >= 0) {
                        handleInputChange('guests', numericValue === 0 ? '' : numericValue); // Store empty if 0, else the number
                    } else if (value === '') {
                        handleInputChange('guests', ''); // Allow clearing the input
                    }
                  }}
                  className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              className={`w-full text-white p-3 rounded-lg font-semibold md:col-span-1 flex items-center justify-center gap-2 transform hover:scale-105 transition-transform ${
                searchParams.type === 'cars' ? 'bg-blue-600 hover:bg-blue-700' :
                searchParams.type === 'tours' ? 'bg-green-600 hover:bg-green-700' :
                'bg-purple-600 hover:bg-purple-700' // Color for transport button
              }`}
            >
              <Search size={18} /> Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;