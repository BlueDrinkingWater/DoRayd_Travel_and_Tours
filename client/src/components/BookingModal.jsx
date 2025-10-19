// src/components/BookingModal.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Users, Upload, CheckCircle, Shield, FileText, AlertTriangle, Tag, User as UserIcon, Mail, Phone, Home } from 'lucide-react';
import DataService, { SERVER_URL } from './services/DataService.jsx';
import CalendarBooking from './CalendarBooking.jsx';
import DropoffMap from './DropoffMap.jsx';
import { useAuth } from './Login.jsx';

const BookingModal = ({ isOpen, onClose, item, itemType }) => {
  const { user } = useAuth();

  const [bookingTerms, setBookingTerms] = useState({ title: 'Booking Terms', content: 'Loading...' });
  const [privacyPolicy, setPrivacyPolicy] = useState({ title: 'Privacy Policy', content: 'Loading...' });
  const [termsAndAgreement, setTermsAndAgreement] = useState({ title: 'Terms & Agreement', content: 'Loading...' });
  const [contentLoading, setContentLoading] = useState(true);
  const [paymentQR, setPaymentQR] = useState('');
  const [qrLoading, setQrLoading] = useState(true);

  const paymentReferenceCode = useMemo(() => {
    if (!isOpen) return '';
    const prefix = 'DRYD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchContent = async () => {
        setContentLoading(true);
        try {
          const [termsResponse, privacyResponse, agreementResponse] = await Promise.all([
            DataService.fetchContent('bookingTerms'),
            DataService.fetchContent('privacy'),
            DataService.fetchContent('terms')
          ]);

          if (termsResponse.success && termsResponse.data) {
            setBookingTerms(termsResponse.data);
          } else {
            setBookingTerms({ title: 'Booking Terms', content: 'Could not load booking terms.' });
          }

          if (privacyResponse.success && privacyResponse.data) {
            setPrivacyPolicy(privacyResponse.data);
          } else {
            setPrivacyPolicy({ title: 'Privacy Policy', content: 'Could not load privacy policy.' });
          }
          
          if (agreementResponse.success && agreementResponse.data) {
            setTermsAndAgreement(agreementResponse.data);
          } else {
            setTermsAndAgreement({ title: 'Terms & Agreement', content: 'Could not load terms and agreement.' });
          }

        } catch (error) {
          setBookingTerms({ title: 'Booking Terms', content: 'Could not load booking terms.' });
          setPrivacyPolicy({ title: 'Privacy Policy', content: 'Could not load privacy policy.' });
          setTermsAndAgreement({ title: 'Terms & Agreement', content: 'Could not load terms and agreement.' });
        } finally {
          setContentLoading(false);
        }
      };

      const fetchQr = async () => {
        try {
          setQrLoading(true);
          const qrResponse = await DataService.fetchContent('paymentQR');
          if (qrResponse.success && qrResponse.data.content) {
            const qrContent = qrResponse.data.content;
            setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
          }
        } catch (error) {
          // Do nothing, QR is optional
        } finally {
          setQrLoading(false);
        }
      };

      fetchContent();
      fetchQr();
    }
  }, [isOpen]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    startDate: '',
    time: '',
    numberOfDays: 1,
    numberOfGuests: 1,
    specialRequests: '',
    agreedToTerms: false,
    paymentProof: null,
    pickupLocation: '',
    dropoffLocation: '',
    dropoffCoordinates: null,
    deliveryMethod: 'pickup',
    amountPaid: '',
    manualPaymentReference: ''
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialState = {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          address: user?.address || '',
          startDate: '',
          time: '',
          numberOfDays: 1,
          numberOfGuests: 1,
          specialRequests: '',
          agreedToTerms: false,
          paymentProof: null,
          pickupLocation: '',
          dropoffLocation: '',
          dropoffCoordinates: null,
          deliveryMethod: 'pickup',
          amountPaid: '',
          manualPaymentReference: ''
      };

      if (itemType === 'tour' && item) {
          initialState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
          initialState.time = '09:00';
      }
      
      setFormData(initialState);
      setTotalPrice(0);
      setCalculatedEndDate(null);
      setSubmitError('');
      setSubmitSuccess(false);
    }
  }, [isOpen, item, itemType, user]);

  useEffect(() => {
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(formData.numberOfDays, 10));
      setCalculatedEndDate(endDate);
      setTotalPrice(formData.numberOfDays * (item?.pricePerDay || 0));
    } else if (itemType === 'tour') {
      setTotalPrice(formData.numberOfGuests * (item?.price || 0));
      setCalculatedEndDate(item.endDate ? new Date(item.endDate) : null);
    }
  }, [formData.startDate, formData.numberOfDays, formData.numberOfGuests, item?.pricePerDay, item?.price, item?.endDate, itemType]);
  
  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  
  const handleLocationSelect = useCallback((location) => {
    setFormData(prev => ({ ...prev, dropoffLocation: location.address, dropoffCoordinates: { lat: location.latitude, lng: location.longitude } }));
  }, []);
  
  const handleDateSelect = useCallback((date) => {
    setFormData(prev => ({ ...prev, startDate: date }));
  }, []);

  const combineDateAndTime = (date, time) => {
    if (!date || !time) return date;
    return new Date(`${date}T${time}`).toISOString();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!/^[a-zA-Z\s]*$/.test(formData.firstName) || !/^[a-zA-Z\s]*$/.test(formData.lastName)) {
        return setSubmitError('Name should only contain letters.');
    }
    if (!formData.email.includes('@')) {
        return setSubmitError('Please enter a valid email address.');
    }
    if (!/^\d+$/.test(formData.phone)) {
        return setSubmitError('Phone number should only contain numbers.');
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address) {
      return setSubmitError('Please fill in all your personal information, including your address.');
    }
    if (!/^\d{11}$/.test(formData.phone)) {
        return setSubmitError('Please enter a valid 11-digit phone number (e.g., 09171234567).');
    }
    if (itemType === 'car' && (!formData.startDate || !formData.time || formData.numberOfDays < 1)) {
      return setSubmitError('Please select a start date, time, and number of days.');
    }
    if (itemType === 'car' && formData.deliveryMethod === 'pickup' && !formData.pickupLocation) {
      return setSubmitError('Please select a pickup location.');
    }
    if (itemType === 'car' && formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) {
      return setSubmitError('Please select a drop-off location on the map.');
    }
    if (itemType === 'tour' && (!formData.startDate || !item.endDate)) {
      return setSubmitError('Tour date information is missing. Please contact support.');
    }
    if (!formData.paymentProof) {
        return setSubmitError('required to upload proof of payment');
    }
    if (!formData.amountPaid) {
      return setSubmitError('Please provide the amount paid.');
    }
    if (!formData.agreedToTerms) {
      return setSubmitError('You must agree to the terms, agreements, and policies to proceed.');
    }

    setSubmitting(true);

    try {
      const bookingData = new FormData();
      const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
      const fullEndDate = calculatedEndDate ? calculatedEndDate.toISOString() : fullStartDate;

      Object.keys(formData).forEach(key => {
        if (key === 'dropoffCoordinates' && formData[key]) {
          bookingData.append(key, JSON.stringify(formData[key]));
        } else if (formData[key]) {
          bookingData.append(key, formData[key]);
        }
      });
      
      const finalPaymentReference = formData.manualPaymentReference.trim() || paymentReferenceCode;
      bookingData.set('paymentReference', finalPaymentReference);
      bookingData.set('startDate', fullStartDate);
      bookingData.set('endDate', fullEndDate);
      bookingData.set('totalPrice', totalPrice);
      bookingData.set('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : item.title);
      bookingData.set('itemId', item._id);
      bookingData.set('itemType', itemType);

      const result = await DataService.createBooking(bookingData);
      
      if (result.success) {
        setSubmitSuccess(true);
      } else {
        throw new Error(result.message || 'Booking failed.');
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      setSubmitError(error.message || 'An error occurred while submitting your booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
  
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Book Your Trip</h2>
              <p className="text-gray-600">{itemType === 'car' ? `${item.brand} ${item.model}` : item.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
          
          {submitSuccess ? (
            <div className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold">Booking Submitted!</h3>
              <p className="text-gray-600 mt-2">You will receive a confirmation email shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{submitError}</div>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="firstName" placeholder="First Name" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                       <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                       <div className="md:col-span-2 relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                       <div className="md:col-span-2 relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="tel" name="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-10 p-2 border rounded-md" placeholder="09171234567"/></div>
                       <div className="md:col-span-2 relative"><Home className="absolute left-3 top-4 -translate-y-1/2 text-gray-400" size={16}/><textarea name="address" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full pl-10 p-2 border rounded-md" placeholder="Your Address" rows="2"></textarea></div>
                    </div>
                  </div>
                  
                  {itemType === 'tour' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Booking Details</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests *</label>
                        <select value={formData.numberOfGuests} onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })} className="w-full p-2 border rounded-md">
                          {Array.from({ length: item.maxGroupSize || 10 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1} {i > 0 ? 'guests' : 'guest'}</option>))}
                        </select>
                      </div>
                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                        <h3 className="font-semibold text-blue-800">Fixed Tour Schedule</h3>
                        <p className="text-sm text-blue-700">{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {itemType === 'car' && (
                    <>
                      <CalendarBooking
                        serviceId={item._id}
                        onDateSelect={handleDateSelect}
                      />
                      <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-3">Rental Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days *</label>
                                  <input type="number" required min="1" value={formData.numberOfDays} onChange={(e) => setFormData(prev => ({ ...prev, numberOfDays: parseInt(e.target.value) || 1 }))} className="w-full p-2 border rounded-md"/>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup/Drop-off Time *</label>
                                  <input type="time" required value={formData.time} onChange={(e) => setFormData(prev => ({...prev, time: e.target.value}))} className="w-full p-2 border rounded-md"/>
                              </div>
                          </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Delivery Method</h3>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}/><span className="ml-2">Pickup</span></label>
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="dropoff" checked={formData.deliveryMethod === 'dropoff'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}/><span className="ml-2">Drop-off</span></label>
                        </div>
                        {formData.deliveryMethod === 'pickup' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                            <select name="pickupLocation" value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="w-full p-2 border rounded-md">
                              <option value="">Select a location</option>
                              {item.pickupLocations?.map((location, index) => (<option key={index} value={location}>{location}</option>))}
                            </select>
                          </div>
                        ) : (
                          <DropoffMap onLocationSelect={handleLocationSelect} />
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Payment */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold mb-3 text-blue-800">Payment Details</h3>
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-bold">IMPORTANT PAYMENT INSTRUCTIONS</p>
                          <p className="text-xs mt-1">
                            To confirm your booking, you MUST include your unique <strong>Payment Reference Code</strong> in the transaction notes/remarks. Bookings without this code will be rejected.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                        {qrLoading ? <p>Loading QR...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR Code" className="w-48 h-48 object-contain mb-4 border rounded-md" /> : <p className="text-sm text-gray-500 mb-4">QR code not available.</p>}
                        <div className="w-full space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Payment Reference Code *</label>
                            <input type="text" readOnly value={paymentReferenceCode} className="w-full p-2 border rounded-md bg-gray-100 font-bold text-center text-lg tracking-wider" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Or Enter Your Bank Reference Number</label>
                            <input type="text" name="manualPaymentReference" value={formData.manualPaymentReference} onChange={(e) => setFormData({ ...formData, manualPaymentReference: e.target.value })} className="w-full p-2 border rounded-md" placeholder="e.g., from your bank receipt"/>
                          </div>
                          <input type="number" placeholder="Amount Paid *" name="amountPaid" required value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })} className="w-full p-2 border rounded-md"/>
                          <div className="flex justify-center">
                            <label htmlFor="paymentProof" className="w-3/4 text-center cursor-pointer bg-white border-2 border-dashed rounded-lg p-4 hover:bg-gray-50">
                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                                <span className="text-sm font-medium text-gray-700">{formData.paymentProof ? formData.paymentProof.name : 'Upload Payment Proof *'}</span>
                                <input id="paymentProof" type="file" name="paymentProof" required onChange={handleFileChange} className="hidden"/>
                            </label>
                          </div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    <div className="space-y-3">
                      {itemType === 'car' ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Daily Rate:</span>
                            <span>
                                {item.originalPrice && item.originalPrice > item.pricePerDay && (
                                    <span className="text-gray-500 line-through mr-2">{formatPrice(item.originalPrice)}</span>
                                )}
                                {formatPrice(item.pricePerDay || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm"><span className="text-gray-600">Rental Duration:</span><span>{formData.numberOfDays > 0 ? `${formData.numberOfDays} ${formData.numberOfDays === 1 ? 'day' : 'days'}` : '...'}</span></div>
                          {formData.startDate && <div className="flex justify-between text-sm"><span className="text-gray-600">Start Date:</span><span>{new Date(formData.startDate).toLocaleDateString()}</span></div>}
                          {calculatedEndDate && <div className="flex justify-between text-sm"><span className="text-gray-600">Return Date:</span><span>{calculatedEndDate.toLocaleDateString()}</span></div>}
                          {formData.time && <div className="flex justify-between text-sm"><span className="text-gray-600">Pickup/Drop-off Time:</span><span>{formatTime(formData.time)}</span></div>}
                          {formData.deliveryMethod === 'pickup' && formData.pickupLocation && <div className="flex justify-between text-sm"><span className="text-gray-600">Pickup Location:</span><span className="text-right truncate max-w-[150px]">{formData.pickupLocation}</span></div>}
                          {formData.deliveryMethod === 'dropoff' && formData.dropoffLocation && <div className="flex justify-between text-sm"><span className="text-gray-600">Drop-off Location:</span><span className="text-right truncate max-w-[150px]">{formData.dropoffLocation}</span></div>}
                        </>
                      ) : (
                        <>
                           <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Price per Person:</span>
                                <span>
                                    {item.originalPrice && item.originalPrice > item.price && (
                                        <span className="text-gray-500 line-through mr-2">{formatPrice(item.originalPrice)}</span>
                                    )}
                                    {formatPrice(item.price || 0)}
                                </span>
                           </div>
                           <div className="flex justify-between text-sm"><span className="text-gray-600">Number of Guests:</span><span>{formData.numberOfGuests}</span></div>
                        </>
                      )}
                      {item.promotion && (
                          <div className="flex justify-between text-sm text-green-600 bg-green-50 p-2 rounded-md">
                              <span className="font-semibold flex items-center gap-1"><Tag size={14}/> {item.promotion.title}</span>
                          </div>
                      )}
                      <hr className="border-gray-200" />
                      <div className="flex justify-between items-center"><span className="text-lg font-semibold text-gray-900">Total Amount:</span><span className="text-2xl font-bold text-blue-600">{formatPrice(totalPrice)}</span></div>
                    </div>
                  </div>

                  {/* Terms & Policies */}
                  <div className="space-y-4">
                     <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><FileText size={14} /> {termsAndAgreement.title}</h3>
                        <div className="max-h-24 overflow-y-auto p-2 border rounded-md bg-white text-gray-600 text-xs whitespace-pre-wrap scrollbar-thin">
                            {contentLoading ? 'Loading...' : termsAndAgreement.content}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><FileText size={14} /> {bookingTerms.title}</h3>
                      <div className="max-h-24 overflow-y-auto p-2 border rounded-md bg-white text-gray-600 text-xs whitespace-pre-wrap scrollbar-thin">
                        {contentLoading ? 'Loading...' : bookingTerms.content}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2 text-sm flex items-center gap-2"><Shield size={14} /> {privacyPolicy.title}</h3>
                      <div className="max-h-24 overflow-y-auto p-2 border rounded-md bg-white text-gray-600 text-xs whitespace-pre-wrap scrollbar-thin">
                        {contentLoading ? 'Loading...' : privacyPolicy.content}
                      </div>
                    </div>
                     <div className="flex items-start mt-4">
                        <input 
                          type="checkbox" 
                          id="agreedToTerms" 
                          checked={formData.agreedToTerms} 
                          onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} 
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5 flex-shrink-0"
                        />
                        <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-900">I have read and agree to the Terms & Agreement, Booking Terms, and Privacy Policy.</label>
                      </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={submitting || !formData.agreedToTerms} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">{submitting ? 'Submitting...' : 'Submit Booking'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;