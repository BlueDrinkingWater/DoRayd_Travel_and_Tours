import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import DataService from '../components/services/DataService';
import { useApi } from '../hooks/useApi';
import contactBG from '../assets/contactBG.jpg'; // Import the background image

// Fix for default icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const { data: phoneData, loading: phoneLoading, error: phoneError } = useApi(() => DataService.fetchContent('contactPhone'));
  const { data: emailData, loading: emailLoading, error: emailError } = useApi(() => DataService.fetchContent('contactEmail'));
  const { data: addressData, loading: addressLoading, error: addressError } = useApi(() => DataService.fetchContent('contactAddress'));
  const { data: hoursData, loading: hoursLoading, error: hoursError } = useApi(() => DataService.fetchContent('contactHours'));
  const { data: locationData, loading: locationLoading, error: locationError } = useApi(() => DataService.fetchContent('officeLocation'));

  const contactInfo = {
    phone: phoneData?.data?.content,
    email: emailData?.data?.content,
    address: addressData?.data?.content,
    hours: hoursData?.data?.content,
    location: locationData?.data?.content,
  };
  const loading = phoneLoading || emailLoading || addressLoading || hoursLoading || locationLoading;
  const contentError = phoneError || emailError || addressError || hoursError || locationError;

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    if (!formData.name || !formData.email || !formData.message || !formData.subject) {
      setSubmitError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setSubmitError('Please enter a valid email address.');
      setSubmitting(false);
      return;
    }

    if (formData.phone && !/^\d+$/.test(formData.phone)) {
        setSubmitError('Phone number should only contain numbers.');
        setSubmitting(false);
        return;
    }

    try {
      const messageData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        source: 'contact_form',
      };

      const response = await DataService.createMessage(messageData);

      if (response.success) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      setSubmitError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const coords = contactInfo.location?.split(',').map(parseFloat);
  const officePosition = coords?.length === 2 && coords.every(isFinite) 
      ? { lat: coords[0], lng: coords[1] } 
      : { lat: 14.5995, lng: 120.9842 }; // Default fallback

  const officeMapLink = officePosition 
      ? `http://googleusercontent.com/maps/search/?api=1&query=${officePosition.lat},${officePosition.lng}`
      : `http://googleusercontent.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.address || 'Manila, Philippines')}`;

  const contactInfoCards = loading ? [] : [
    { icon: Phone, title: 'Phone', details: contactInfo.phone || '+63 917 123 4567', description: '24/7 Customer Support' },
    { icon: Mail, title: 'Email', details: contactInfo.email || 'info@dorayd.com', description: 'Send us your questions' },
    { 
      icon: MapPin, 
      title: 'Address', 
      details: contactInfo.address || 'Manila, Philippines', 
      description: 'Visit our office',
      isLink: true,
      href: officeMapLink
    },
    { icon: Clock, title: 'Business Hours', details: contactInfo.hours || '24/7 Service', description: 'Always here for you' }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-cover bg-center text-white" style={{ backgroundImage: `url(${contactBG})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">Contact Us</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-md">We're here to help you plan your perfect adventure. Get in touch with our team!</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            {submitSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Message Sent Successfully!</p>
                  <p className="text-sm">We'll get back to you within 24 hours.</p>
                </div>
              </div>
            )}
            {submitError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error Sending Message</p>
                  <p className="text-sm">{submitError}</p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter your full name"/>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your.email@example.com"/>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+63 917 123 4567"/>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select id="subject" name="subject" required value={formData.subject} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a subject</option>
                    <option value="Car Rental Inquiry">Car Rental Inquiry</option>
                    <option value="Tour Package Inquiry">Tour Package Inquiry</option>
                    <option value="Booking Support">Booking Support</option>
                    <option value="General Question">General Question</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea id="message" name="message" required rows="5" value={formData.message} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" placeholder="Tell us how we can help you..."/>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                {submitting ? (<><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div><span>Sending...</span></>) : (<><Send className="w-5 h-5" /><span>Send Message</span></>)}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-6">
                {loading ? <p>Loading contact info...</p> : contentError ? <p className='text-red-500'>Could not load contact info.</p> : contactInfoCards.map((info, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><info.icon className="w-6 h-6 text-blue-600" /></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{info.title}</h3>
                      {info.isLink ? (
                        <a href={info.href} target="_blank" rel="noopener noreferrer" className="text-lg text-blue-600 font-medium hover:underline">
                          {info.details}
                        </a>
                      ) : (
                        <p className="text-lg text-blue-600 font-medium">{info.details}</p>
                      )}
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Visit Our Office</h2>
              <a href={officeMapLink} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 hover:underline transition-colors block mb-4">
                {contactInfo.address || 'Location not set'}
              </a>
              <div className="h-64 bg-gray-200 rounded-lg z-0">
                {!loading && officePosition && typeof officePosition.lat === 'number' && (
                  <MapContainer center={officePosition} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={officePosition}><Popup>DoRayd Travel & Tours Office</Popup></Marker>
                  </MapContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;