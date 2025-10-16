import React from 'react';
import { Shield, Users, Award, Star, Heart, Globe, Phone, Mail, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import DataService, { getImageUrl } from '../components/services/DataService';
import { useApi } from '../hooks/useApi';

const About = () => {

  const { data: missionResponse, loading: missionLoading, error: missionError } = useApi(() => DataService.fetchContent('mission'));
  const { data: visionResponse, loading: visionLoading, error: visionError } = useApi(() => DataService.fetchContent('vision'));
  const { data: aboutResponse, loading: aboutLoading, error: aboutError } = useApi(() => DataService.fetchContent('about'));
  const { data: aboutImageResponse, loading: aboutImageLoading, error: aboutImageError } = useApi(() => DataService.fetchContent('aboutImage'));

  const loading = missionLoading || visionLoading || aboutLoading || aboutImageLoading;
  const error = missionError || visionError || aboutError || aboutImageError;

  const content = {
    mission: missionResponse?.success ? missionResponse.data : null,
    vision: visionResponse?.success ? visionResponse.data : null,
    about: aboutResponse?.success ? aboutResponse.data : null,
    aboutImage: aboutImageResponse?.success ? aboutImageResponse.data : null
  }

  const values = [
    {
      icon: Shield,
      title: 'Safety First',
      description: 'Your safety is our top priority. All our vehicles and tours are fully insured and regularly maintained.',
      color: 'blue'
    },
    {
      icon: Heart,
      title: 'Customer Care',
      description: 'We treat every customer like family, ensuring personalized service and unforgettable experiences.',
      color: 'red'
    },
    {
      icon: Globe,
      title: 'Sustainability',
      description: 'We are committed to responsible tourism that preserves the natural beauty of the Philippines.',
      color: 'green'
    },
    {
      icon: Star,
      title: 'Excellence',
      description: 'Committed to maintaining the highest standards in everything we do.',
      color: 'yellow'
    }
  ];

  const achievements = [
    {
      year: '2020',
      title: 'Company Founded',
      description: 'DoRayd Travel & Tours was established with a vision to showcase the beauty of the Philippines'
    },
    {
      year: '2021',
      title: 'First 100 Happy Customers',
      description: 'Reached our first milestone of serving 100 satisfied customers with memorable experiences'
    },
    {
      year: '2022',
      title: 'Fleet Expansion',
      description: 'Expanded our vehicle fleet to include premium cars and specialized tour vehicles'
    },
    {
      year: '2023',
      title: 'Digital Platform Launch',
      description: 'Launched our comprehensive online booking platform for seamless customer experience'
    },
    {
      year: '2024',
      title: 'Award Recognition',
      description: 'Recognized as one of the top travel service providers in the Philippines'
    }
  ];

  const stats = [
    { number: '1000+', label: 'Happy Customers' },
    { number: '50+', label: 'Tour Destinations' },
    { number: '25+', label: 'Premium Vehicles' },
    { number: '5+', label: 'Years Experience' }
  ];

  const renderContentSection = (title, contentKey, defaultContent) => {
    if (loading) {
      return (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4 w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            <div className="h-4 bg-gray-300 rounded w-4/6"></div>
          </div>
        </div>
      );
    }

    if (error && !content[contentKey]) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">{title}</h3>
          </div>
          <p className="text-red-700 mb-3">Unable to load content from database.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Loading
          </button>
        </div>
      );
    }

    const contentData = content[contentKey];
    
    return (
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">{contentData?.title || title}</h2>
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {contentData?.content || defaultContent}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">About DoRayd</h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              {loading ? 'Loading our story...' : 
               'Your trusted partner in exploring the magnificent beauty of the Philippines'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <section className="py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* About Content Sections */}
        <section className="py-16 border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {renderContentSection(
                'About Us', 
                'about',
                'DoRayd Travel & Tours is a premier travel service provider dedicated to showcasing the natural beauty and rich culture of the Philippines. Founded in 2020, we have been committed to providing exceptional travel experiences through our comprehensive car rental and tour package services. Our team of experienced professionals ensures that every journey with us becomes a memorable adventure, whether you\'re exploring bustling cities or discovering hidden tropical paradises.'
              )}
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gray-200 rounded-2xl overflow-hidden">
                <img
                  src={getImageUrl(content.aboutImage?.content) || "https://placehold.co/600x400/e2e8f0/475569?text=DoRayd+Team"}
                  alt="DoRayd Team"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400/e2e8f0/475569?text=Image+Unavailable';
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              {renderContentSection(
                'Our Mission',
                'mission',
                'To provide exceptional and safe travel experiences that showcase the natural beauty and rich culture of the Philippines, while ensuring customer satisfaction through premium vehicles, expert guides, and personalized service that creates lasting memories for every traveler.'
              )}
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              {renderContentSection(
                'Our Vision',
                'vision',
                'To become the leading travel service provider in the Philippines, recognized for our commitment to excellence, sustainability, and authentic cultural experiences. We envision a future where every visitor discovers the true magic of the Philippines through our carefully crafted journeys and exceptional hospitality.'
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;