import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Car, AlertCircle, RefreshCw } from 'lucide-react';
import DataService, { getImageUrl } from '../components/services/DataService';
import { useApi } from '../hooks/useApi.jsx';
import bgCar from '../assets/bgCar.jpg'; // Reusing car background

const Transport = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: servicesResponse, loading, error, refetch: fetchServices } = useApi(
    () => DataService.fetchAllTransport(), // Fetch public list
    [] // No dependencies needed initially
  );

  const services = servicesResponse?.data || [];

  const handleBook = (service) => {
    if (service.isAvailable) {
      navigate(`/transport/${service._id}`);
    }
  };

  const filteredServices = services.filter(service => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      service.vehicleType?.toLowerCase().includes(lowerSearch) ||
      service.name?.toLowerCase().includes(lowerSearch) ||
      service.capacity?.toLowerCase().includes(lowerSearch) ||
      service.pricing?.some(p => p.destination?.toLowerCase().includes(lowerSearch))
    );
  });

  const renderServiceCard = (service) => (
    <div key={service._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
      <div className="h-48 bg-gray-200 overflow-hidden relative">
        {service.images && service.images.length > 0 ? (
          <img src={getImageUrl(service.images[0])} alt={service.vehicleType} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300"><Car className="w-12 h-12 text-gray-500" /></div>
        )}
        {!service.isAvailable && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-red-600 text-white px-3 py-1 rounded font-semibold">Not Available</div>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{service.vehicleType} {service.name ? `(${service.name})` : ''}</h3>
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600"><Users className="w-4 h-4" /><span>{service.capacity}</span></div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description || 'Comfortable and spacious transport for your group.'}</p>
        <button
          onClick={() => handleBook(service)}
          disabled={!service.isAvailable}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transform hover:scale-105 transition-transform"
        >
          {service.isAvailable ? 'View Details & Book' : 'Unavailable'}
        </button>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-800 mb-4">No Transport Services Available</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {searchTerm ? 'No services match your search.' : 'Transport services will appear here once added.'}
        </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative bg-cover bg-center text-white" style={{ backgroundImage: `url(${bgCar})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-md">Transport Services</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-md mt-4">
              Book our Tourist Bus or Coaster for your group travels.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-end">
             <div className="relative w-full md:w-1/2 lg:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search by type, capacity, or destination..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => ( // Placeholder skeleton
                 <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                    <div className="h-48 bg-slate-200"></div>
                    <div className="p-6 space-y-4">
                        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded"></div>
                        <div className="h-10 bg-slate-200 rounded-lg w-full mt-2"></div>
                    </div>
                </div>
            ))}
          </div>
        ) : error ? (
            <div className="text-center py-16 bg-red-50 text-red-700 rounded-xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>{error.message}</p>
                <button onClick={fetchServices} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"><RefreshCw className="w-4 h-4 inline-block mr-2" />Retry</button>
            </div>
        ) : filteredServices.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map(renderServiceCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transport;
