import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import DataService from '../components/services/DataService';
import { useApi } from '../hooks/useApi';

const Contact = () => {
  console.log('📞 Contact page loaded at 2025-09-03 15:25:11');
  console.log('👤 Current User: BlueDrinkingWater');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  // --- FIX STARTS HERE: State for dynamic contact info ---
  const [contactInfo, setContactInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  // --- FIX ENDS HERE ---

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // --- FIX STARTS HERE: Fetch contact info from backend ---
  useEffect(() => {
    const fetchContactInfo = async () => {
      setLoading(true);
      try {
        const response = await DataService.fetchContent('contact');
        if (response.success) {
          // Parse the content string to create a structured object
          const lines = response.data.content.split('\n');
          const info = {
            phone: lines.find(line => line.startsWith('Phone:'))?.split(':')[1]?.trim() || '+63 917 123 4567',
            email: lines.find(line => line.startsWith('Email:'))?.split(':')[1]?.trim() || 'info@dorayd.com',
            address: lines.find(line => line.startsWith('Address:'))?.split(':')[1]?.trim() || 'Manila, Philippines',
            hours: lines.find(line => line.startsWith('Hours:'))?.split(':')[1]?.trim() || '24/7 Service',
          };
          setContactInfo(info);
        }
      } catch (error) {
        console.error("Failed to fetch contact info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContactInfo();
  }, []);
  // --- FIX ENDS HERE ---

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

    // Basic validation
    if (!formData.name || !formData.email || !formData.message || !formData.subject) {
      setSubmitError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    try {
      console.log(`📤 Submitting contact message to database at 2025-09-03 15:25:11`);

      const messageData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        source: 'contact_form',
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      const response = await DataService.createMessage(messageData);

      if (response.success) {
        setSubmitSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
        
        console.log(`✅ Contact message saved to database at 2025-09-03 15:25:11`);
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Error submitting contact message:', error);
      setSubmitError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      question: 'How do I make a booking?',
      answer: 'You can book directly through our website by selecting your preferred car or tour package and filling out the booking form. Our team will contact you within 24 hours to confirm details.'
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'Cancellations made 48 hours before the booking date receive a full refund. Cancellations within 48 hours may be subject to charges depending on the circumstances.'
    },
    {
      question: 'Do you provide insurance coverage?',
      answer: 'Yes, all our vehicles and tour packages include comprehensive insurance coverage for your safety and peace of mind.'
    },
    {
      question: 'Can I modify my booking?',
      answer: 'Yes, you can modify your booking up to 24 hours before your scheduled date, subject to availability. Contact us as soon as possible to make changes.'
    }
  ];
  
  // --- FIX STARTS HERE: Create the contact info array dynamically ---
  const contactInfoCards = loading || !contactInfo ? [] : [
    {
      icon: Phone,
      title: 'Phone',
      details: contactInfo.phone,
      description: '24/7 Customer Support'
    },
    {
      icon: Mail,
      title: 'Email',
      details: contactInfo.email,
      description: 'Send us your questions'
    },
    {
      icon: MapPin,
      title: 'Address',
      details: contactInfo.address,
      description: 'Visit our office'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: contactInfo.hours,
      description: 'Always here for you'
    }
  ];
  // --- FIX ENDS HERE ---

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              We're here to help you plan your perfect adventure. Get in touch with our team!
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

            {submitSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Message Sent Successfully!</p>
                  <p className="text-sm">Thank you for contacting us. We'll get back to you within 24 hours.</p>
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+63 917 123 4567"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="Car Rental Inquiry">Car Rental Inquiry</option>
                    <option value="Tour Package Inquiry">Tour Package Inquiry</option>
                    <option value="Booking Support">Booking Support</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="General Question">General Question</option>
                    <option value="Feedback">Feedback</option>
                    <option value="Partnership">Partnership</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows="5"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Details */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-6">
                {/* --- FIX STARTS HERE: Render dynamic contact cards --- */}
                {loading ? <p>Loading contact info...</p> : contactInfoCards.map((info, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <info.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{info.title}</h3>
                      <p className="text-lg text-blue-600 font-medium">{info.details}</p>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </div>
                ))}
                {/* --- FIX ENDS HERE --- */}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Visit Our Office</h2>
              <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">{loading ? '...' : contactInfo?.address}</p>
                  <p className="text-sm text-gray-500 mt-2">Detailed address will be provided upon booking</p>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Hours</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Monday - Friday</span>
                  <span className="font-medium text-gray-900">8:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Saturday</span>
                  <span className="font-medium text-gray-900">8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Sunday</span>
                  <span className="font-medium text-gray-900">9:00 AM - 5:00 PM</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Emergency Support</span>
                    <span className="font-medium text-green-600">24/7 Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find quick answers to common questions about our services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Adventure?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Don't wait! Book your perfect car or tour package today and create unforgettable memories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/cars'}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Browse Cars
            </button>
            <button
              onClick={() => window.location.href = '/tours'}
              className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Explore Tours
            </button>
          </div>
        </div>
      </div>

      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 border-t border-gray-300 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-xs text-gray-600">
              <p>🔧 Development Mode - Contact Page</p>
              <p>Database Status: {submitError ? 'Error' : submitting ? 'Submitting' : 'Connected'}</p>
              <p>Form Status: {submitSuccess ? 'Success' : 'Ready'}</p>
              <p>Time: 2025-09-03 15:28:10 | User: BlueDrinkingWater</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;