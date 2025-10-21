// client/src/components/BookingModal.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Users, Upload, CheckCircle, Shield, FileText, AlertTriangle, Tag, User as UserIcon, Mail, Phone, Home, Info } from 'lucide-react';
import DataService, { SERVER_URL } from './services/DataService.jsx';
import CalendarBooking from './CalendarBooking.jsx';
import DropoffMap from './DropoffMap.jsx';
import { useAuth } from './Login.jsx';
import { Link, useNavigate } from 'react-router-dom';

const BookingModal = ({ isOpen, onClose, item, itemType }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentQR, setPaymentQR] = useState('');
  const [qrLoading, setQrLoading] = useState(true);
  const [bookingDisclaimer, setBookingDisclaimer] = useState('');
  const [bookedDates, setBookedDates] = useState([]);
  
  const [selectedPaymentOption, setSelectedPaymentOption] = useState('full');

  const paymentReferenceCode = useMemo(() => {
    if (!isOpen) return '';
    const prefix = 'DRYD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }, [isOpen]);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day
    return today.toISOString().split('T')[0];
  };


  useEffect(() => {
    if (isOpen) {
        if (item?.paymentType === 'downpayment' && item?.downpaymentValue > 0) {
            setSelectedPaymentOption('downpayment');
        } else {
            setSelectedPaymentOption('full');
        }

      const fetchContent = async () => {
        // Fetch QR Code
        try {
          setQrLoading(true);
          const qrResponse = await DataService.fetchContent('paymentQR');
          if (qrResponse.success && qrResponse.data.content) {
            const qrContent = qrResponse.data.content;
            setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
          }
        } catch (error) {
          console.warn('QR code not found.');
        } finally {
          setQrLoading(false);
        }
        
        // Fetch Booking Disclaimer
        try {
            const disclaimerResponse = await DataService.fetchContent('bookingDisclaimer');
            if (disclaimerResponse.success && disclaimerResponse.data.content) {
                setBookingDisclaimer(disclaimerResponse.data.content);
            }
        } catch (error) {
            console.warn('Booking disclaimer content not found. Please create it in the admin Content Management section.');
        }
      };
      fetchContent();
    }
  }, [isOpen, item]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    startDate: '', time: '', numberOfDays: 1, numberOfGuests: 1,
    specialRequests: '', agreedToTerms: false, paymentProof: null,
    pickupLocation: '', dropoffLocation: '', dropoffCoordinates: null,
    deliveryMethod: 'pickup', amountPaid: '', manualPaymentReference: ''
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayString();
      const initialState = {
          firstName: user?.firstName || '', lastName: user?.lastName || '',
          email: user?.email || '', phone: user?.phone || '', address: user?.address || '',
          startDate: itemType === 'car' ? todayStr : '', // Default to today for cars
          time: '', numberOfDays: 1, numberOfGuests: 1,
          specialRequests: '', agreedToTerms: false, paymentProof: null,
          pickupLocation: itemType === 'car' ? (item?.pickupLocations?.[0] || '') : '',
          dropoffLocation: '', dropoffCoordinates: null, deliveryMethod: 'pickup',
          amountPaid: '', manualPaymentReference: ''
      };

      if (itemType === 'tour' && item) {
          initialState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
          initialState.time = '09:00';
      }
      
      setFormData(initialState);
      // Reset dependent states; they will be recalculated in the next effect
      setTotalPrice(0);
      setCalculatedEndDate(null);
      setSubmitError('');
      setSubmitSuccess(false);
    }
  }, [isOpen, item, itemType, user]);

  useEffect(() => {
    // This effect now runs immediately after the state is initialized
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
  }, [formData.startDate, formData.numberOfDays, formData.numberOfGuests, item, itemType]);
  
  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  const handleLocationSelect = useCallback((location) => setFormData(prev => ({ ...prev, dropoffLocation: location.address, dropoffCoordinates: { lat: location.latitude, lng: location.longitude } })), []);
  const handleDateSelect = useCallback((date) => setFormData(prev => ({ ...prev, startDate: date })), []);
  const combineDateAndTime = (date, time) => new Date(`${date}T${time}`).toISOString();

  const calculatedDownpayment = useMemo(() => {
    if (!item || item.paymentType !== 'downpayment' || !totalPrice) return 0;
    
    if (item.downpaymentType === 'percentage') {
      return (totalPrice * item.downpaymentValue) / 100;
    }
    
    if (item.downpaymentType === 'fixed') {
      if (itemType === 'car') return item.downpaymentValue * formData.numberOfDays;
      if (itemType === 'tour') return item.downpaymentValue * formData.numberOfGuests;
    }
    
    return 0;
  }, [item, totalPrice, formData.numberOfDays, formData.numberOfGuests, itemType]);

  const requiredPayment = useMemo(() => {
    if (selectedPaymentOption === 'downpayment') {
      return calculatedDownpayment;
    }
    return totalPrice;
  }, [selectedPaymentOption, calculatedDownpayment, totalPrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // --- DATE OVERLAP VALIDATION ---
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + parseInt(formData.numberOfDays, 10) - 1); // inclusive end date

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError("Date not available, please choose another date.");
            }
        }
    }

    // --- FORM VALIDATION ---
    const requiredFields = {
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      address: "Address",
      startDate: "Start Date",
      time: "Time",
      paymentProof: "Payment Proof",
      amountPaid: "Amount Paid",
    };

    for (const field in requiredFields) {
      if (!formData[field]) {
        return setSubmitError(`${requiredFields[field]} is required.`);
      }
    }
    
    if (!formData.manualPaymentReference && !paymentReferenceCode) {
        return setSubmitError("A payment reference is required.");
    }
    
    if (itemType === 'car') {
      if (formData.deliveryMethod === 'pickup' && !formData.pickupLocation) {
        return setSubmitError("Pickup location is required.");
      }
      if (formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) {
        return setSubmitError("Dropoff location is required.");
      }
    }

    if (!formData.agreedToTerms) {
      return setSubmitError('You must agree to the terms to proceed.');
    }
    
    if (parseFloat(formData.amountPaid) !== requiredPayment) {
      return setSubmitError(`The amount paid must be exactly ${formatPrice(requiredPayment)}.`);
    }

    setSubmitting(true);
    try {
      const bookingData = new FormData();
       Object.keys(formData).forEach(key => {
        if (key === 'dropoffCoordinates' && formData[key]) {
          bookingData.append(key, JSON.stringify(formData[key]));
        } else if (key !== 'manualPaymentReference' && formData[key]) { // Exclude manual ref from this loop
          bookingData.append(key, formData[key]);
        }
      });
      
      const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
      const fullEndDate = calculatedEndDate ? calculatedEndDate.toISOString() : fullStartDate;

      // **FIX:** Send BOTH reference numbers correctly and separately
      bookingData.set('paymentReference', paymentReferenceCode);
      if (formData.manualPaymentReference.trim()) {
          bookingData.set('manualPaymentReference', formData.manualPaymentReference.trim());
      }
      
      bookingData.set('startDate', fullStartDate);
      bookingData.set('endDate', fullEndDate);
      bookingData.set('totalPrice', totalPrice);
      bookingData.set('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : item.title);
      bookingData.set('itemId', item._id);
      bookingData.set('itemType', itemType);
      bookingData.set('paymentOption', selectedPaymentOption);

      const result = await DataService.createBooking(bookingData);
      if (result.success) {
        setSubmitSuccess(true);
        if (user) {
          setTimeout(() => {
            onClose();
            navigate('/my-bookings');
          }, 2000);
        }
      } else {
        throw new Error(result.message || 'Booking failed.');
      }
    } catch (error) {
      setSubmitError(error.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

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
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                        initialDate={formData.startDate}
                        onBookedDatesChange={setBookedDates}
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
                    
                    {bookingDisclaimer && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0"><Info className="h-5 w-5" /></div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold">Important Note</h3>
                                    <p className="text-xs mt-1 whitespace-pre-wrap">{bookingDisclaimer}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {item.paymentType === 'downpayment' && item.downpaymentValue > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Option</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'downpayment' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white'}`}>
                                    <input type="radio" name="paymentOption" value="downpayment" checked={selectedPaymentOption === 'downpayment'} onChange={(e) => setSelectedPaymentOption(e.target.value)} className="sr-only"/>
                                    Downpayment
                                </label>
                                <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'full' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white'}`}>
                                    <input type="radio" name="paymentOption" value="full" checked={selectedPaymentOption === 'full'} onChange={(e) => setSelectedPaymentOption(e.target.value)} className="sr-only"/>
                                    Full Payment
                                </label>
                            </div>
                        </div>
                    )}
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Pay *</label>
                            <input type="number" placeholder={formatPrice(requiredPayment)} name="amountPaid" required value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })} className="w-full p-2 border rounded-md"/>
                            <p className="text-xs text-gray-500 mt-1">Please enter the exact amount.</p>
                          </div>
                          <div className="flex justify-center">
                            <label htmlFor="paymentProof" className="w-3/4 text-center cursor-pointer bg-white border-2 border-dashed rounded-lg p-4 hover:bg-gray-50">
                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                                <span className="text-sm font-medium text-gray-700">{formData.paymentProof ? formData.paymentProof.name : 'Upload Payment Proof *'}</span>
                                <input id="paymentProof" type="file" name="paymentProof" onChange={handleFileChange} className="hidden"/>
                            </label>
                          </div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      {/* Personal Info */}
                      <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-medium text-right">{formData.firstName} {formData.lastName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Address:</span><span className="font-medium text-right">{formData.address}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-medium text-right">{formData.email}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-medium text-right">{formData.phone}</span></div>
                      
                      <hr className="my-2"/>

                      {/* Booking Details */}
                      <div className="flex justify-between"><span className="text-gray-600">From:</span><span className="font-medium text-right">{formatDate(formData.startDate)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">To:</span><span className="font-medium text-right">{formatDate(calculatedEndDate)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Time:</span><span className="font-medium text-right">{formatTime(formData.time)}</span></div>
                      {itemType === 'car' && (
                        <div className="flex justify-between"><span className="text-gray-600">Delivery:</span><span className="font-medium capitalize text-right">{formData.deliveryMethod === 'pickup' ? formData.pickupLocation : formData.dropoffLocation}</span></div>
                      )}
                      {itemType === 'tour' && (
                        <div className="flex justify-between"><span className="text-gray-600">Guests:</span><span className="font-medium text-right">{formData.numberOfGuests}</span></div>
                      )}
                      
                      <hr className="my-2"/>
                      
                      {/* Payment Info */}
                      <div className="flex justify-between"><span className="text-gray-600">Payment Ref:</span><span className="font-medium text-right">{paymentReferenceCode}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Bank Ref:</span><span className="font-medium text-right">{formData.manualPaymentReference}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Payment Option:</span><span className="font-medium capitalize text-right">{selectedPaymentOption}</span></div>
                      
                      <div className="flex justify-between items-center mt-4 pt-2 border-t">
                        <span className="font-semibold text-gray-900">Total Amount:</span>
                        <span className="font-bold text-lg text-blue-600">{formatPrice(totalPrice)}</span>
                      </div>

                      {selectedPaymentOption === 'downpayment' && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Downpayment Due:</span>
                          <span className="font-bold text-lg">{formatPrice(calculatedDownpayment)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-red-600">
                        <span className="text-lg font-semibold">
                          Amount to Pay Now:
                        </span>
                        <span className="text-2xl font-bold">{formatPrice(requiredPayment)}</span>
                      </div>
                      
                      {selectedPaymentOption === 'downpayment' && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          The remaining balance of {formatPrice(totalPrice - requiredPayment)} will be due at the time of service.
                        </p>
                      )}
                    </div>
                  </div>


                  {/* Terms & Policies */}
                  <div className="space-y-4">
                     <div className="flex items-start mt-4">
                        <input 
                          type="checkbox" 
                          id="agreedToTerms" 
                          checked={formData.agreedToTerms} 
                          onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} 
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5 flex-shrink-0"
                        />
                        <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-900">
                            I have read and agree to the{' '}
                            <Link to="/policies" target="_blank" className="text-blue-600 hover:underline">Terms, Policies, and Agreements</Link>.
                        </label>
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