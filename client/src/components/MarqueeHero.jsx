import React, { useState, useEffect } from 'react';
import DataService, { SERVER_URL } from './services/DataService.jsx';
import { Car, MapPin } from 'lucide-react';

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
                        image: car.images && car.images.length > 0 ? `${SERVER_URL}${car.images[0]}` : null
                    }));
                    combinedData.push(...carData);
                }

                if (toursResponse.success && Array.isArray(toursResponse.data)) {
                    const tourData = toursResponse.data.map(tour => ({
                        title: tour.title,
                        image: tour.images && tour.images.length > 0 ? `${SERVER_URL}${tour.images[0]}` : null
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
                }

                @keyframes marqueeScroll {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>

            <div className="overflow-hidden w-full relative max-w-7xl mx-auto my-8" onMouseEnter={() => setStopScroll(true)} onMouseLeave={() => setStopScroll(false)}>
                <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-gray-50 to-transparent" />
                <div 
                    className="marquee-inner flex w-fit" 
                    style={{ 
                        animationPlayState: stopScroll ? "paused" : "running", 
                        animationDuration: `${cardData.length * 5}s`
                    }}
                >
                    {[...cardData, ...cardData].map((card, index) => (
                        <div key={index} className="w-64 mx-4 h-[22rem] relative group hover:scale-95 transition-all duration-300 rounded-lg overflow-hidden shadow-lg">
                            <img 
                                src={card.image} 
                                alt={card.title} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x600/e2e8f0/475569?text=Image+Unavailable'; }}
                            />
                            <div className="flex items-center justify-center px-4 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-0 backdrop-blur-md left-0 w-full h-full bg-black/30">
                                <p className="text-white text-xl font-semibold text-center">{card.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-gray-50 to-transparent" />
            </div>
        </>
    );
};

export default MarqueeHero;