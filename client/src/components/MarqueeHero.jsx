import React, { useState, useEffect } from 'react';
import DataService, { getImageUrl } from './services/DataService.jsx';

const MarqueeHero = () => {
    const [stopScroll, setStopScroll] = useState(false);
    const [cardData, setCardData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fallbackData = [
        { title: "Explore Palawan's Lagoons", image: "https://images.unsplash.com/photo-1572529944327-ac3a6d713a89?w=800&auto=format&fit=crop&q=60" },
        { title: "Comfortable City Driving", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60" },
        { title: "Bohol's Chocolate Hills", image: "https://images.unsplash.com/photo-1595701970665-6421375a5d8d?w=800&auto=format&fit=crop&q=60" },
        { title: "Adventure in a Reliable SUV", image: "https://images.unsplash.com/photo-1617083294659-c30172a536f2?w=800&auto=format&fit=crop&q=60" },
        { title: "Relax on Boracay's Beaches", image: "https://images.unsplash.com/photo-1590510141699-24b2a3a10731?w=800&auto=format&fit=crop&q=60" },
        { title: "Tour the Historic City of Vigan", image: "https://images.unsplash.com/photo-1601719219321-9d2737a4b277?w=800&auto=format&fit=crop&q=60" },
    ];

    useEffect(() => {
        const fetchMarqueeData = async () => {
            setLoading(true);
            try {
                const [carsResponse, toursResponse] = await Promise.all([
                    DataService.fetchAllCars({ limit: 4 }),
                    DataService.fetchAllTours({ limit: 4 })
                ]);

                let combinedData = [];

                if (carsResponse.success && Array.isArray(carsResponse.data)) {
                    const carData = carsResponse.data.map(car => ({
                        title: `${car.brand} ${car.model}`,
                        image: car.images && car.images.length > 0 ? getImageUrl(car.images[0]) : null
                    }));
                    combinedData.push(...carData);
                }

                if (toursResponse.success && Array.isArray(toursResponse.data)) {
                    const tourData = toursResponse.data.map(tour => ({
                        title: tour.title,
                        image: tour.images && tour.images.length > 0 ? getImageUrl(tour.images[0]) : null
                    }));
                    combinedData.push(...tourData);
                }
                
                let validData = combinedData.filter(item => item.image);

                if (validData.length === 0) {
                    console.warn("MarqueeHero: No items with images found in the database. Using fallback data.");
                    validData = fallbackData;
                }

                setCardData(validData.sort(() => 0.5 - Math.random()));

            } catch (error) {
                console.error("Failed to fetch marquee data, using fallback:", error);
                setCardData(fallbackData.sort(() => 0.5 - Math.random()));
            } finally {
                setLoading(false);
            }
        };

        fetchMarqueeData();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Loading featured destinations...</p>
            </div>
        );
    }
    
    if (cardData.length === 0) {
        return null;
    }

    return (
        <>
            <style>{`
                .marquee-inner {
                    animation: marqueeScroll linear infinite;
                    will-change: transform;
                }

                @keyframes marqueeScroll {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }

                .preserve-3d {
                    transform-style: preserve-3d;
                    -webkit-transform-style: preserve-3d;
                }
            `}</style>

            <div 
                className="overflow-hidden w-full relative max-w-7xl mx-auto my-16 py-8" 
                style={{ perspective: '1000px' }}
                onMouseEnter={() => setStopScroll(true)} 
                onMouseLeave={() => setStopScroll(false)}
            >
                <div className="absolute left-0 top-0 h-full w-24 z-10 pointer-events-none bg-gradient-to-r from-gray-50 to-transparent" />
                <div 
                    className="marquee-inner flex w-fit" 
                    style={{ 
                        animationPlayState: stopScroll ? "paused" : "running", 
                        animationDuration: `${cardData.length * 7}s`
                    }}
                >
                    {[...cardData, ...cardData].map((card, index) => (
                        <div key={index} className="w-72 mx-4 h-96 relative group preserve-3d rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer">
                            <img 
                                src={card.image} 
                                alt={card.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x600/e2e8f0/475569?text=Image+Unavailable'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                                <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                                     <h3 className="text-white text-2xl font-bold leading-tight drop-shadow-lg">{card.title}</h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="absolute right-0 top-0 h-full w-24 z-10 pointer-events-none bg-gradient-to-l from-gray-50 to-transparent" />
            </div>
        </>
    );
};

export default MarqueeHero;
