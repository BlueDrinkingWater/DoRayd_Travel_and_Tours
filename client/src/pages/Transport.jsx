import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Search, Car, AlertCircle, RefreshCw, Tag, DollarSign, CheckCircle, 
    Filter, Grid, List, ChevronLeft, ChevronRight 
} from 'lucide-react';
import DataService, { getImageUrl } from '../components/services/DataService';
import { useApi } from '../hooks/useApi.jsx';
import bgCar from '../assets/bgCar.jpg'; // Reusing car background
import { formatPrice } from '../utils/helpers'; // Import the price formatter

// --- MODIFIED: Skeleton Card layout fixed ---
const SkeletonCard = ({ viewMode }) => (
  <div className={`bg-white rounded-xl shadow-lg overflow-hidden animate-pulse ${
    viewMode === 'list' ? 'flex' : 'flex flex-col'
  }`}>
    {/* Image Skeleton */}
    <div className={`${
      viewMode === 'list' ? 'w-72 flex-shrink-0' : 'h-48'
    } h-48 bg-slate-200`}></div>
    
    {/* Content Skeleton */}
    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
      {/* Text Skeleton */}
      <div>
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div className="flex gap-4">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="h-3 bg-slate-200 rounded mt-4"></div>
        <div className="h-3 bg-slate-200 rounded w-5/6 mt-2"></div>
      </div>
      {/* Button Skeleton */}
      <div className="h-10 bg-slate-200 rounded-lg w-full mt-6"></div>
    </div>
  </div>
);

const Transport = () => {
  const navigate = useNavigate();
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
  });

  const [filters, setFilters] = useState({
    search: '',
    destination: '',
    minPrice: '',
    maxPrice: '',
    seats: '',
    vehicleType: '',
  });

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    )
  };

  const { data: servicesResponse, loading, error, refetch: fetchServices } = useApi(
    () => DataService.fetchAllTransport(queryParams),
    [pagination.page, JSON.stringify(filters)]
  );

  const services = servicesResponse?.data || [];
  const servicesPagination = servicesResponse?.pagination || { total: 0, totalPages: 0 };


  const handleBook = (service) => {
    if (service.isAvailable) {
      navigate(`/transport/${service._id}`);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      destination: '',
      minPrice: '',
      maxPrice: '',
      seats: '',
      vehicleType: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= servicesPagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  // --- MODIFIED: Card layout completely restructured for flexibility ---
  const renderServiceCard = (service) => {
    const prices = (service.pricing || [])
      .flatMap(p => [p.dayTourPrice, p.ovnPrice, p.threeDayTwoNightPrice, p.dropAndPickPrice])
      .filter(price => price && price > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return (
      <div 
        key={service._id} 
        className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
          viewMode === 'list' ? 'flex' : 'flex flex-col'
        }`}
      >
        {/* --- IMAGE CONTAINER --- */}
        {/* KEY FIX: h-48 is applied in BOTH modes to prevent stretching */}
        <div 
          className={`relative ${
            viewMode === 'list' ? 'w-72 flex-shrink-0' : 'h-48'
          } h-48`}
        >
          {service.images && service.images.length > 0 ? (
            <img src={getImageUrl(service.images[0])} alt={service.vehicleType} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300"><Car className="w-12 h-12 text-gray-500" /></div>
          )}
          
          {service.promotion && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md z-10">
              <div className="flex items-center gap-1">
                <Tag size={12} />
                <span>
                  {service.promotion.discountType === 'percentage'
                    ? `${service.promotion.discountValue}% OFF`
                    : `₱${service.promotion.discountValue} OFF`}
                </span>
              </div>
            </div>
          )}

          {!service.isAvailable && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-red-600 text-white px-3 py-1 rounded font-semibold">Not Available</div>
            </div>
          )}
        </div>
        
        {/* --- CONTENT CONTAINER (TEXT + BUTTON) --- */}
        {/* KEY FIX: This container pushes the button to the bottom in BOTH modes */}
        <div className="p-6 flex flex-col justify-between flex-1">
          
          {/* --- Text Content Wrapper --- */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{service.vehicleType} {service.name ? `(${service.name})` : ''}</h3>
            
            {/* --- Info block (Passengers & Price) --- */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{service.capacity} Passengers</span>
              </div>
              {minPrice > 0 && (
                <div className="flex items-center gap-1.5 font-medium text-green-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Starts at {formatPrice(minPrice)}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description || 'Comfortable and spacious transport for your group.'}</p>
            
            {/* --- Amenities block --- */}
            {service.amenities && service.amenities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Includes</h4>
                <div className="flex flex-wrap gap-2">
                  {service.amenities.slice(0, 3).map((amenity, index) => (
                    <span key={index} className="flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      <CheckCircle size={12} className="mr-1 text-green-500" />
                      {amenity}
                    </span>
                  ))}
                  {service.amenities.length > 3 && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      +{service.amenities.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* --- Button Wrapper --- */}
          {/* mt-6 adds space, justify-between pushes it down */}
          <div className="mt-6">
            <button
              onClick={() => handleBook(service)}
              disabled={!service.isAvailable}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transform hover:scale-105 transition-transform"
            >
              {service.isAvailable ? 'View Details & Book' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-800 mb-4">No Transport Services Available</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {Object.values(filters).some(value => value !== '') 
            ? 'No services match your current filters. Try adjusting your criteria.'
            : 'Transport services will appear here once added.'
          }
        </p>
    </div>
  );

  const renderPagination = () => (
    <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {[...Array(servicesPagination.totalPages).keys()].map(page => (
          <button
            key={page + 1}
            onClick={() => handlePageChange(page + 1)}
            className={`px-4 py-2 rounded-lg font-medium ${
              page + 1 === pagination.page
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {page + 1}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === servicesPagination.totalPages}
          className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative bg-cover bg-center text-white" style={{ backgroundImage: `url(${bgCar})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-md">Transport Services</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-md mt-4">
              {loading ? 'Loading services...' : `${servicesPagination.total} vehicles available`}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end gap-3 mb-8">
            <div className="flex bg-white shadow-sm rounded-lg p-1 border">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}><List className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="bg-white shadow-sm border text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Filter className="w-4 h-4" />Filters</button>
        </div>

        {showFilters && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Transport Services</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="text" placeholder="Search (Name, Amenity...)" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="Destination" value={filters.destination} onChange={e => handleFilterChange('destination', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="Vehicle Type (Bus, Coaster)" value={filters.vehicleType} onChange={e => handleFilterChange('vehicleType', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Min Seats (Capacity)" value={filters.seats} onChange={e => handleFilterChange('seats', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Min Price" value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={clearFilters} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Clear</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Apply</button>
                </div>
            </div>
        )}

        {loading ? (
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}
          </div>
        ) : error ? (
            <div className="text-center py-16 bg-red-50 text-red-700 rounded-xl">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>{error.message}</p>
                <button onClick={fetchServices} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"><RefreshCw className="w-4 h-4 inline-block mr-2" />Retry</button>
            </div>
        ) : services.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
              {services.map(renderServiceCard)}
            </div>
            {servicesPagination.totalPages > 1 && renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default Transport;