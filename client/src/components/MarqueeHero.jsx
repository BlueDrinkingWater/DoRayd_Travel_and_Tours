import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
// --- MODIFIED: Added icons for category buttons ---
import { ChevronLeft, ChevronRight, Car, MapPin, Bus, LayoutGrid } from 'lucide-react';
import DataService, { getImageUrl } from './services/DataService.jsx';

const MarqueeHero = () => {
  const [stopScroll, setStopScroll] = useState(false);
  
  // --- MODIFIED: State for all data vs. filtered data ---
  const [allCardData, setAllCardData] = useState([]); // Holds all fetched items
  const [filteredCardData, setFilteredCardData] = useState([]); // Holds items to display
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'car', 'tour', 'transport'
  
  const [loading, setLoading] = useState(true);
  const marqueeRef = useRef(null);

  // Fallback data
  const fallbackData = [
    // --- MODIFIED: Added 'type' for filtering ---
    { title: "Explore Palawan's Lagoons", image: "https://images.unsplash.com/photo-1572529944327-ac3a6d713a89?w=800&auto=format&fit=crop&q=60", type: 'tour' },
    { title: "Comfortable City Driving", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60", type: 'car' },
    { title: "Bohol's Chocolate Hills", image: "https://images.unsplash.com/photo-1595701970665-6421375a5d8d?w=800&auto=format&fit=crop&q=60", type: 'tour' },
    { title: "Adventure in a Reliable SUV", image: "https://images.unsplash.com/photo-1617083294659-c30172a536f2?w=800&auto=format&fit=crop&q=60", type: 'car' },
    { title: "Relax on Boracay's Beaches", image: "https://images.unsplash.com/photo-1590510141699-24b2a3a10731?w=800&auto=format&fit=crop&q=60", type: 'tour' },
    { title: "Tour the Historic City of Vigan", image: "https://images.unsplash.com/photo-1601719219321-9d2737a4b277?w=800&auto=format&fit=crop&q=60", type: 'tour' },
  ];

  // Effect 1: Fetch all data on mount
  useEffect(() => {
    const fetchMarqueeData = async () => {
      setLoading(true);
      try {
        const [carsResponse, toursResponse, transportResponse] = await Promise.all([
          DataService.fetchAllCars({ limit: 4 }),
          DataService.fetchAllTours({ limit: 4 }),
          DataService.fetchAllTransport({ limit: 4 })
        ]);

        let combinedData = [];

        // Process Cars
        if (carsResponse.success && Array.isArray(carsResponse.data)) {
          const carData = carsResponse.data.map(car => ({
            id: car._id,
            type: 'car',
            title: `${car.brand} ${car.model}`,
            image: car.images && car.images.length > 0 ? getImageUrl(car.images[0]) : null
          }));
          combinedData.push(...carData);
        }

        // Process Tours
        if (toursResponse.success && Array.isArray(toursResponse.data)) {
          const tourData = toursResponse.data.map(tour => ({
            id: tour._id,
            type: 'tour',
            title: tour.title,
            image: tour.images && tour.images.length > 0 ? getImageUrl(tour.images[0]) : null
          }));
          combinedData.push(...tourData);
        }

        // Process Transport
        if (transportResponse.success && Array.isArray(transportResponse.data)) {
            const transportData = transportResponse.data.map(transport => ({
                id: transport._id,
                type: 'transport',
                title: transport.name || transport.vehicleType,
                image: transport.images && transport.images.length > 0 ? getImageUrl(transport.images[0]) : null
            }));
            combinedData.push(...transportData);
        }

        let validData = combinedData.filter(item => item.image);

        if (validData.length === 0) {
          console.warn("MarqueeHero: No items with images found. Using fallback data.");
          // --- MODIFIED: Store shuffled fallback data ---
          setAllCardData(fallbackData.sort(() => 0.5 - Math.random()));
        } else {
           // --- MODIFIED: Store shuffled valid data ---
          setAllCardData(validData.sort(() => 0.5 - Math.random()));
        }

      } catch (error) {
        console.error("Failed to fetch marquee data, using fallback:", error);
         // --- MODIFIED: Store shuffled fallback data on error ---
        setAllCardData(fallbackData.sort(() => 0.5 - Math.random()));
      } finally {
        setLoading(false);
      }
    };

    fetchMarqueeData();
  }, []);

  // --- ADDED: Effect 2: Filter data when category or allCardData changes ---
  useEffect(() => {
    // Reset scroll position when filter changes
    if (marqueeRef.current) {
      marqueeRef.current.scrollLeft = 0;
    }

    if (activeCategory === 'all') {
      setFilteredCardData(allCardData);
    } else {
      const filtered = allCardData.filter(item => item.type === activeCategory);
      setFilteredCardData(filtered);
    }
  }, [activeCategory, allCardData]); // Re-run when category or master list changes

  // Arrow Click Handlers
  const scrollMarquee = (direction) => {
    if (marqueeRef.current) {
      const cardWidth = 288; // Card width (w-64 = 256px) + margin (mx-4 = 32px)
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      marqueeRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading featured destinations...</p>
      </div>
    );
  }

  // --- MODIFIED: Check allCardData, as filteredCardData might be empty on purpose ---
  if (allCardData.length === 0) {
    return null; // Don't render anything if no data was fetched at all
  }

  return (
    <>
      <style>{`
        .marquee-container::-webkit-scrollbar {
          display: none; /* Hide scrollbar for Chrome, Safari, Opera */
        }
        .marquee-container {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
          scroll-behavior: smooth; /* Enable smooth scrolling */
        }
        .marquee-inner {
          animation: marqueeScroll linear infinite;
          will-change: transform;
        }
        @keyframes marqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); } /* Scrolls through one full set */
        }
        .preserve-3d {
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
      `}</style>

      <div
        className="relative max-w-7xl mx-auto my-16 py-8"
        style={{ perspective: '1000px' }}
      >
        {/* --- ADDED: Category Buttons --- */}
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 mb-8 px-4">
          {[
            { type: 'all', label: 'All', icon: LayoutGrid },
            { type: 'car', label: 'Cars', icon: Car },
            { type: 'tour', label: 'Tours', icon: MapPin },
            { type: 'transport', label: 'Transport', icon: Bus }
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setActiveCategory(type)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-md transform hover:scale-105 ${
                activeCategory === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Marquee Section */}
        <div
          className="relative"
          onMouseEnter={() => setStopScroll(true)}
          onMouseLeave={() => setStopScroll(false)}
        >
          {/* Fades */}
          <div className="absolute left-0 top-0 h-full w-24 z-20 pointer-events-none bg-gradient-to-r from-slate-50 via-slate-50/50 to-transparent" />
          <div className="absolute right-0 top-0 h-full w-24 z-20 pointer-events-none bg-gradient-to-l from-slate-50 via-slate-50/50 to-transparent" />

          {/* Arrow Buttons */}
          <button
            onClick={() => scrollMarquee('left')}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/70 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => scrollMarquee('right')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 bg-white/70 hover:bg-white text-gray-700 p-3 rounded-full shadow-lg transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} />
          </button>

          {/* Marquee Container */}
          <div ref={marqueeRef} className="marquee-container overflow-x-auto w-full relative">
            
            {/* --- MODIFIED: Conditional rendering based on filtered data --- */}
            {filteredCardData.length > 0 ? (
              <div
                className="marquee-inner flex w-fit"
                style={{
                  // --- *** THIS IS THE FIX *** ---
                  // It will now only pause on hover (stopScroll)
                  animationPlayState: stopScroll ? "paused" : "running",
                  animationDuration: `${filteredCardData.length * 7}s`
                }}
              >
                {/* Use filtered data for map */}
                {[...filteredCardData, ...filteredCardData].map((card, index) => {
                  
                  let linkTo = '#';
                  if (card.id && card.type) {
                    if (card.type === 'transport') {
                      linkTo = `/transport/${card.id}`;
                    } else {
                      linkTo = `/${card.type}s/${card.id}`;
                    }
                  } else if (card.type) { // Handle fallback data with no id
                     linkTo = `/${card.type}s`;
                  }

                  return (
                    <Link to={linkTo} key={`${card.id || card.title}-${index}`} className="block w-64 mx-4 h-72 shrink-0">
                      <div className="relative group preserve-3d rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 h-full cursor-pointer hover:-translate-y-2">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x600/e2e8f0/475569?text=Image+Unavailable'; }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                          <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                              <h3 className="text-white text-xl font-bold leading-tight drop-shadow-lg">{card.title}</h3>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              // --- ADDED: Show message if filter results are empty ---
              <div className="text-center py-12 w-full">
                <p className="text-gray-500 text-lg">No items found for this category.</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  );
};

export default MarqueeHero;