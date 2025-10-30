import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import DataService from '../components/services/DataService';
import contactBG from '../assets/contactBG.jpg'; 

const RefundRequestPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bookingReference: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const response = await DataService.createRefundRequest(formData);

      if (response.success) {
        setSubmitSuccess(
          `Request submitted! Policy: ${response.data.policy} refund (${formatPrice(response.data.amount)}). Admin will review.`
        );
        setFormData({ name: '', email: '', phone: '', bookingReference: '', reason: '' });
      } else {
        throw new Error(response.message || 'Failed to submit request');
      }
    } catch (error) {
      setSubmitError(error.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatPrice = (price) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-cover bg-center text-white" style={{ backgroundImage: `url(${contactBG})` }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">Request a Refund</h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto drop-shadow-md">
              Please fill out the form below to request a refund for your booking.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Refund Form */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Refund Request Form</h2>
            
            {submitSuccess && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">{submitSuccess}</p>
                </div>
              </div>
            )}
            
            {submitError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input type="text" id="name" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="As it appears on your booking"/>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your.email@example.com"/>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="09171234567"/>
                </div>
                <div>
                  <label htmlFor="bookingReference" className="block text-sm font-medium text-gray-700 mb-2">Booking Reference Number *</label>
                  <input type="text" id="bookingReference" name="bookingReference" required value={formData.bookingReference} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="DRYD-XXXX-XXXX"/>
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">Reason for Refund *</label>
                <textarea id="reason" name="reason" required rows="4" value={formData.reason} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical" placeholder="Please provide a reason for your refund request..."/>
              </div>
              
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                {submitting ? (<><Loader2 className="animate-spin w-5 h-5"/><span>Submitting...</span></>) : (<><Send className="w-5 h-5" /><span>Submit Request</span></>)}
              </button>
            </form>
          </div>

          {/* Policy Info */}
            <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 lg:p-8 sticky top-28 border border-gray-100">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-5">
                Refund Policy
                </h2>

                <div className="space-y-6">
                {/* Full Refund */}
                <div className="flex items-center gap-6">
                    <span className="text-3xl font-bold text-green-700 min-w-[60px] text-center">
                    100%
                    </span>
                    <div>
                    <h3 className="font-semibold text-gray-800">Full Refund</h3>
                    <p className="text-sm text-gray-600">
                        Requests made <span className="font-medium">7 days or more</span> before the booking date are eligible for a full refund.
                    </p>
                    </div>
                </div>

                {/* Half Refund */}
                <div className="flex items-center gap-6">
                    <span className="text-3xl font-bold text-yellow-600 min-w-[60px] text-center">
                    50%
                    </span>
                    <div>
                    <h3 className="font-semibold text-gray-800">Half Refund</h3>
                    <p className="text-sm text-gray-600">
                        Requests made <span className="font-medium">6 days or less</span> before the booking date are eligible for a 50% refund.
                    </p>
                    </div>
                </div>

                {/* No Refund */}
                <div className="flex items-center gap-6">
                    <span className="text-3xl font-bold text-red-700 min-w-[60px] text-center">
                    0%
                    </span>
                    <div>
                    <h3 className="font-semibold text-gray-800">No Refund</h3>
                    <p className="text-sm text-gray-600">
                        Requests made on or after the booking date are not eligible for a refund.
                    </p>
                    </div>
                </div>
                </div>

                <p className="text-xs text-gray-500 mt-6 border-t border-gray-100 pt-4 leading-relaxed">
                All refund requests are subject to review. Approved refunds will be processed
                back to the original payment method within 3–5 business days. You can see your booking reference number
                on your booking confirmation email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundRequestPage;