import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Users, Star, Calendar, Clock, Grid, List, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import DataService, { getImageUrl } from '../components/services/DataService';
import { useApi } from '../hooks/useApi.jsx';
import bgTour from '../assets/bgTour.jpg';

const SkeletonCard = ({ viewMode }) => (
  <div className={`bg-white rounded-xl shadow-lg overflow-hidden animate-pulse ${viewMode === 'list' ? 'flex' : ''}`}>
    <div className={`${viewMode === 'list' ? 'w-80 h-48' : 'h-48'} bg-slate-200`}></div>
    <div className={`p-6 space-y-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
      <div className="flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-3 bg-slate-200 rounded"></div>
      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-10 bg-slate-200 rounded-lg w-1/4"></div>
      </div>
    </div>
  </div>
);

const Tours = () => {
  const location = useLocation();
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
    duration: '',
    difficulty: '',
    maxGroupSize: ''
  });

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '')
    )
  };

  const { data: toursResponse, loading, error, refetch: fetchTours } = useApi(() => DataService.fetchAllTours(queryParams), [pagination.page, JSON.stringify(filters)]);
  const { data: promotionsResponse } = useApi(DataService.fetchAllPromotions, []);

  const tours = toursResponse?.data || [];
  const promotions = promotionsResponse?.data || [];
  const toursPagination = toursResponse?.pagination || { total: 0, totalPages: 0 };

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.destination) {
        setFilters(prev => ({ ...prev, destination: state.destination }));
      }
    }
  }, [location.state]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({...prev, page: 1}));
    fetchTours();
    setShowFilters(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '', destination: '', minPrice: '', maxPrice: '',
      duration: '', difficulty: '', maxGroupSize: ''
    };
    setFilters(clearedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= toursPagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookTour = (tour) => {
    if (tour.isAvailable) {
      navigate(`/tours/${tour._id}`);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };
  
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
    const getDiscountedPrice = (item) => {
      if (!promotions || promotions.length === 0) {
          return { price: item.price, originalPrice: null };
      }

      const applicablePromotions = promotions.filter(promo => {
          if (!promo.isActive) return false;
          if (promo.applicableTo === 'all') return true;
          if (promo.applicableTo === 'tour' && promo.itemIds.includes(item._id)) return true;
          return false;
      });

      if (applicablePromotions.length === 0) {
          return { price: item.price, originalPrice: null };
      }

      let bestPrice = item.price;
      let originalPrice = item.price;

      applicablePromotions.forEach(promo => {
          let discountedPrice;
          if (promo.discountType === 'percentage') {
              discountedPrice = originalPrice - (originalPrice * (promo.discountValue / 100));
          } else {
              discountedPrice = originalPrice - promo.discountValue;
          }

          if (discountedPrice < bestPrice) {
              bestPrice = discountedPrice;
          }
      });
      
      return { price: bestPrice, originalPrice: originalPrice };
  };

  const renderTourCard = (tour) => {
      const { price, originalPrice } = getDiscountedPrice(tour);
      
      return (
        // DESIGN UPDATE: Elevated card design with hover effects
        <div key={tour._id} className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
          viewMode === 'list' ? 'flex' : ''
        }`}>
          <div className={`${viewMode === 'list' ? 'w-80 h-48' : 'h-48'} bg-gray-200 overflow-hidden relative`}>
            {tour.images && tour.images.length > 0 ? (
              <img
                src={getImageUrl(tour.images[0])}
                alt={tour.title || tour.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <MapPin className="w-12 h-12 text-gray-500" />
              </div>
            )}
            
            {tour.promotion && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                {tour.promotion.discountType === 'percentage'
                  ? `${tour.promotion.discountValue}% OFF`
                  : `₱${tour.promotion.discountValue} OFF`}
              </div>
            )}
            
            {!tour.isAvailable && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-red-600 text-white px-3 py-1 rounded font-semibold">
                  Not Available
                </div>
              </div>
            )}
          </div>
          
          <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(tour.difficulty)}`}>
                {tour.difficulty || 'Easy'}
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">
                  {tour.ratings?.average || 'N/A'} ({tour.ratings?.count || 0})
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {tour.title || tour.name}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{tour.destination}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{tour.duration}</span></div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>Max {tour.maxGroupSize} people</span></div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4" /><span className="capitalize">{tour.difficulty || 'Easy'}</span></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                {originalPrice && originalPrice > price && (
                    <span className="text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                )}
                <span className="text-2xl font-bold text-green-600">{formatPrice(price)}</span>
                <span className="text-gray-500">/person</span>
              </div>
              <button
                  onClick={() => handleBookTour(tour)}
                  disabled={!tour.isAvailable}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transform hover:scale-105 transition-transform"
              >
                  {tour.isAvailable ? 'Book Now' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      );
  }

  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-800 mb-4">No Tours Available</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {Object.values(filters).some(value => value !== '') 
            ? 'No tours match your current filters. Try adjusting your search criteria.'
            : 'Tour packages will appear here once added by our admin team.'
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

        {[...Array(toursPagination.totalPages).keys()].map(page => (
          <button
            key={page + 1}
            onClick={() => handlePageChange(page + 1)}
            className={`px-4 py-2 rounded-lg font-medium ${
              page + 1 === pagination.page
                ? 'bg-green-600 text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {page + 1}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === toursPagination.totalPages}
          className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
    </div>
  );
  
  return (
    // DESIGN UPDATE: Main background color
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section 
        className="relative bg-cover bg-center text-white"
        style={{ backgroundImage: `url(${bgTour})` }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white drop-shadow-md">Tour Packages</h1>
                  <p className="text-gray-200 mt-1 drop-shadow-sm">
                    {loading ? 'Loading tours...' : `${toursPagination.total} amazing destinations available`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-white/20 backdrop-blur-sm rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white/80 shadow-sm text-green-600' : 'text-white'}`}><Grid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white/80 shadow-sm text-green-600' : 'text-white'}`}><List className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Filter className="w-4 h-4" />Filters</button>
                </div>
              </div>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DESIGN UPDATE: Animated and styled filter section */}
        {showFilters && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Tours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="Search" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                    <input type="text" placeholder="Destination" value={filters.destination} onChange={e => handleFilterChange('destination', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                    <input type="number" placeholder="Min Price" value={filters.minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                    <input type="number" placeholder="Max Price" value={filters.maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={clearFilters} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Clear</button>
                    <button onClick={applyFilters} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Apply</button>
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
                <button onClick={fetchTours} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg"><RefreshCw className="w-4 h-4 inline-block mr-2" />Retry</button>
            </div>
        ) : tours.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
              {tours.map(renderTourCard)}
            </div>
            {toursPagination.totalPages > 1 && renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default Tours;