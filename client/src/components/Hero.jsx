import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Car } from 'lucide-react';
import bgHome from '../assets/bgHome.jpg';

const Hero = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    type: 'cars',
    location: '',
    date: '',
    guests: 2
  });

  const handleSearch = () => {
    if (searchParams.type === 'cars') {
      navigate('/cars', { state: searchParams });
    } else {
      navigate('/tours', { state: searchParams });
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
        <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
          Welcome To Our <br/> Travel Agency
        </h1>
        <p className="text-lg text-white/90 mb-8">
          Your journey begins here. Book premium cars and exciting tour packages!
        </p>

        {/* Search Box */}
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden text-left">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleInputChange('type', 'cars')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                searchParams.type === 'cars'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Car Rental
            </button>
            <button
              onClick={() => handleInputChange('type', 'tours')}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                searchParams.type === 'tours'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tour Packages
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={searchParams.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Airport, or Hotel"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700">Guests</label>
               <input
                type="number"
                value={searchParams.guests}
                min="1"
                onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg font-semibold lg:col-span-1"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;