import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Car, MapPin, AlertCircle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  console.log('🚫 404 Page accessed at 2025-09-03 15:31:38');
  console.log('👤 Current User: BlueDrinkingWater');
  console.log('🔗 Current URL:', window.location.href);

  const suggestions = [
    {
      icon: Home,
      title: 'Go Home',
      description: 'Return to our homepage and start fresh',
      action: () => navigate('/'),
      color: 'blue'
    },
    {
      icon: Car,
      title: 'Browse Cars',
      description: 'Explore our available car rental options',
      action: () => navigate('/cars'),
      color: 'green'
    },
    {
      icon: MapPin,
      title: 'View Tours',
      description: 'Discover amazing tour packages',
      action: () => navigate('/tours'),
      color: 'purple'
    },
    {
      icon: Search,
      title: 'Search Services',
      description: 'Find exactly what you\'re looking for',
      action: () => navigate('/browse'),
      color: 'orange'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* 404 Animation */}
        <div className="mb-8">
          <div className="text-8xl md:text-9xl font-bold text-gray-300 mb-4">
            404
          </div>
          <div className="relative">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-red-200 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Main Message */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
            The page you're looking for seems to have wandered off on its own adventure. 
            Don't worry, we'll help you find your way back!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> All our content is loaded from our secure database. 
              If you were looking for specific content, it may have been moved or updated by our admin team.
            </p>
          </div>
        </div>

        {/* Suggestions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={suggestion.action}
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center hover:-translate-y-1"
            >
              <div className={`w-12 h-12 bg-${suggestion.color}-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <suggestion.icon className={`w-6 h-6 text-${suggestion.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{suggestion.title}</h3>
              <p className="text-sm text-gray-600">{suggestion.description}</p>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-12 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Looking for something specific?
          </h3>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search for cars, tours, destinations..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    navigate(`/browse?search=${encodeURIComponent(e.target.value.trim())}`);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"]');
                if (searchInput?.value.trim()) {
                  navigate(`/browse?search=${encodeURIComponent(searchInput.value.trim())}`);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800 text-white rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Still need help?</h3>
          <p className="text-gray-300 mb-4">
            Our customer support team is available 24/7 to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+639171234567"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📞 Call: +63 917 123 4567
            </a>
            <button
              onClick={() => navigate('/contact')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📧 Contact Us
            </button>
          </div>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🔧 Debug Info:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>User: BlueDrinkingWater</p>
              <p>Timestamp: 2025-09-03 15:31:38</p>
              <p>Referrer: {document.referrer || 'Direct access'}</p>
              <p>URL: {window.location.href}</p>
              <p>Database Mode: Production (No Mock Data)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;