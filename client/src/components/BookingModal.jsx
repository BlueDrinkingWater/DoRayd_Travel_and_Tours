// client/src/components/BookingModal.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Users, Upload, CheckCircle, Shield, FileText, AlertTriangle, Tag, User as UserIcon, Mail, Phone, Home, Info, Clock, DollarSign, CreditCard, Car } from 'lucide-react'; // <-- FIX: Added 'Car' icon here
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

  // Default to 'full' unless item is specifically configured for downpayment
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(
      (item?.paymentType === 'downpayment' && item?.downpaymentValue > 0) ? 'downpayment' : 'full'
  );

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
    // Adjust for timezone offset to get the correct local date string
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset*60*1000));
    return localToday.toISOString().split('T')[0];
  };

  const initialFormData = useMemo(() => {
      const todayStr = getTodayString();
      const baseState = {
          firstName: user?.firstName || '', lastName: user?.lastName || '',
          email: user?.email || '', phone: user?.phone || '', address: user?.address || '',
          startDate: '', // Will be set based on type below
          time: '', // Default time
          numberOfDays: 1, numberOfGuests: 1,
          specialRequests: '', agreedToTerms: false, paymentProof: null,
          pickupLocation: '', dropoffLocation: '', dropoffCoordinates: null,
          deliveryMethod: 'pickup', amountPaid: '', manualPaymentReference: ''
      };

      if (itemType === 'car') {
          baseState.startDate = todayStr; // Default start date for cars
          baseState.pickupLocation = item?.pickupLocations?.[0] || ''; // Default pickup location for cars
          baseState.time = '09:00'; // Default time for cars
      } else if (itemType === 'tour' && item) {
          baseState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
          baseState.time = '09:00'; // Default time for tours
      }
      return baseState;
  }, [user, item, itemType]); // Dependencies for initial state

  const [formData, setFormData] = useState(initialFormData);
  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null); // This will be the *exclusive* end date (day after last day)
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Effect to fetch QR, Disclaimer, and set initial state
  useEffect(() => {
    if (isOpen) {
      // Set payment option based on item config
      setSelectedPaymentOption((item?.paymentType === 'downpayment' && item?.downpaymentValue > 0) ? 'downpayment' : 'full');
      // Set initial form data
      setFormData(initialFormData);
      // Reset other states
      setTotalPrice(0);
      setCalculatedEndDate(null);
      setSubmitError('');
      setSubmitSuccess(false);
      setBookedDates([]); // Reset booked dates

      const fetchContent = async () => {
        // Fetch QR Code
        setQrLoading(true);
        try {
          const qrResponse = await DataService.fetchContent('paymentQR');
          if (qrResponse.success && qrResponse.data.content) {
            const qrContent = qrResponse.data.content;
            setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
          }
        } catch (error) { console.warn('QR code not found or failed to load.'); }
        finally { setQrLoading(false); }

        // Fetch Booking Disclaimer
        try {
            const disclaimerResponse = await DataService.fetchContent('bookingDisclaimer');
            if (disclaimerResponse.success && disclaimerResponse.data.content) {
                setBookingDisclaimer(disclaimerResponse.data.content);
            }
        } catch (error) { console.warn('Booking disclaimer content not found.'); }
      };
      fetchContent();
    }
  }, [isOpen, item, itemType, user, initialFormData]); // Rerun when modal opens or item/user changes

  // Effect to calculate price and end date based on form data
  useEffect(() => {
    if (!item) return; // Guard clause if item is not yet loaded

    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
      const startDate = new Date(formData.startDate);
      if (isNaN(startDate.getTime())) return; // Invalid date
      const endDate = new Date(startDate);
      // **FIX:** Calculate exclusive end date (the day *after* the last rental day)
      endDate.setDate(startDate.getDate() + (parseInt(formData.numberOfDays, 10)));
      setCalculatedEndDate(endDate);
      setTotalPrice(parseInt(formData.numberOfDays, 10) * (item?.pricePerDay || 0));
    } else if (itemType === 'tour') {
      setTotalPrice(parseInt(formData.numberOfGuests, 10) * (item?.price || 0));
      // Tours have fixed end dates from the item data
      setCalculatedEndDate(item.endDate ? new Date(item.endDate) : (item.startDate ? new Date(item.startDate) : null));
    } else {
        // Reset if conditions aren't met
        setTotalPrice(0);
        setCalculatedEndDate(null);
    }
  }, [formData.startDate, formData.numberOfDays, formData.numberOfGuests, item, itemType]);

  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  const handleLocationSelect = useCallback((location) => setFormData(prev => ({ ...prev, dropoffLocation: location.address, dropoffCoordinates: { lat: location.latitude, lng: location.longitude } })), []);
  const handleDateSelect = useCallback((date) => setFormData(prev => ({ ...prev, startDate: date })), []);

  // **FIX:** Robust date/time combination
  const combineDateAndTime = (date, time) => {
    if (!date || !time) return null;
    try {
        const dateTimeString = `${date}T${time}:00`; // Assuming time is HH:MM
        const dateObj = new Date(dateTimeString); // Parses as local time
        if (isNaN(dateObj.getTime())) {
            console.error("Invalid date/time combination:", date, time);
            return null;
        }
        return dateObj.toISOString(); // Converts to UTC string
    } catch (error) {
        console.error("Error combining date and time:", date, time, error);
        return null;
    }
  };


  // **FIX:** Replaced old logic with direct calculation
  const requiredPayment = useMemo(() => {
    if (selectedPaymentOption === 'downpayment') {
      if (!item || item.paymentType !== 'downpayment' || !item.downpaymentValue || item.downpaymentValue <= 0) {
        console.warn("Downpayment selected but item not configured for it or invalid value.");
        return totalPrice; // Fallback to full price
      }

      if (item.downpaymentType === 'percentage') {
        return (totalPrice * item.downpaymentValue) / 100;
      } else { // 'fixed' amount
        if (itemType === 'car') return item.downpaymentValue * (formData.numberOfDays || 1);
        if (itemType === 'tour') return item.downpaymentValue * (formData.numberOfGuests || 1);
      }
      return totalPrice; // Fallback
    }
    // If 'full' payment is selected
    return totalPrice;
  }, [selectedPaymentOption, item, itemType, formData.numberOfDays, formData.numberOfGuests, totalPrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // --- DATE OVERLAP VALIDATION ---
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
        const start = new Date(formData.startDate);
        start.setUTCHours(0, 0, 0, 0); // Use UTC to avoid timezone issues in comparison
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + parseInt(formData.numberOfDays, 10) - 1); // Get the actual last day of booking

        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError(`Date ${dateString} is unavailable. Please choose another start date or duration.`);
            }
        }
    }

    // --- FORM VALIDATION ---
    const requiredFields = {
      firstName: "First Name", lastName: "Last Name", email: "Email Address",
      phone: "Phone Number", address: "Address", startDate: "Start Date",
      time: "Time", paymentProof: "Payment Proof", amountPaid: "Amount Paid",
      agreedToTerms: "Agreement to Terms"
    };

    for (const field in requiredFields) {
      if (!formData[field] || (field === 'agreedToTerms' && formData[field] !== true)) {
        return setSubmitError(`${requiredFields[field]} is required.`);
      }
    }

    if (!formData.manualPaymentReference && !paymentReferenceCode) {
        return setSubmitError("A payment reference (either system or bank) is required.");
    }

    if (itemType === 'car') {
      if (formData.deliveryMethod === 'pickup' && !formData.pickupLocation) return setSubmitError("Pickup location is required.");
      if (formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) return setSubmitError("Dropoff location is required.");
      if (formData.numberOfDays <= 0) return setSubmitError("Number of days must be at least 1.");
    }
     if (itemType === 'tour' && formData.numberOfGuests <= 0) return setSubmitError("Number of guests must be at least 1.");


    // Validate amount paid matches the required amount
     const paidAmount = parseFloat(formData.amountPaid);
     if (isNaN(paidAmount) || Math.abs(paidAmount - requiredPayment) > 0.01) { // Allow for small floating point differences
       return setSubmitError(`Amount paid (${formatPrice(paidAmount)}) must exactly match the required payment (${formatPrice(requiredPayment)} for ${selectedPaymentOption} payment).`);
     }

    if (selectedPaymentOption === 'downpayment' && !user) {
        setSubmitError("You must be logged in to choose the downpayment option. Please log in or create an account.");
        return;
    }

    // Combine Date and Time
    const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
    if (!fullStartDate) {
        return setSubmitError('Invalid start date or time selected.');
    }

    // **FIX:** Calculate end date properly for submission
    let fullEndDate;
    if (itemType === 'car' && calculatedEndDate) {
        // `calculatedEndDate` is the day *after* the last rental day. We need the *actual* last day.
        const actualEndDate = new Date(calculatedEndDate);
        actualEndDate.setDate(actualEndDate.getDate() - 1); // Go back to the actual last day
        fullEndDate = combineDateAndTime(actualEndDate.toISOString().split('T')[0], formData.time); // Use the same time as start
    } else if (itemType === 'tour' && calculatedEndDate) {
        // Tour end date is inclusive
        fullEndDate = combineDateAndTime(calculatedEndDate.toISOString().split('T')[0], formData.time);
    } else {
        fullEndDate = fullStartDate; // Default if no end date calculated
    }
     if (!fullEndDate) {
        return setSubmitError('Invalid end date calculated.');
    }


    setSubmitting(true);
    try {
      const bookingData = new FormData();
       Object.keys(formData).forEach(key => {
        if (key === 'dropoffCoordinates' && formData[key]) {
          bookingData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'agreedToTerms') {
          bookingData.append(key, formData[key] ? 'true' : 'false');
        } else if (key !== 'paymentProof' && key !== 'startDate' && key !== 'endDate' && formData[key] !== null && formData[key] !== undefined) {
          bookingData.append(key, formData[key]);
        }
      });

      // Append correctly formatted dates and other essential info
      bookingData.set('startDate', fullStartDate);
      bookingData.set('endDate', fullEndDate); // Use calculated full end date
      bookingData.set('totalPrice', totalPrice);
      bookingData.set('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : item.title);
      bookingData.set('itemId', item._id);
      bookingData.set('itemType', itemType);
      bookingData.set('paymentOption', selectedPaymentOption);
      bookingData.set('paymentReference', paymentReferenceCode); // System reference
      // manualPaymentReference is already appended from the forEach loop

      if(formData.paymentProof) {
          bookingData.append('paymentProof', formData.paymentProof);
      }

       if (item.promotion) {
           bookingData.append('originalPrice', item.originalPrice || item.pricePerDay || item.price);
           bookingData.append('discountApplied', (item.originalPrice || item.pricePerDay || item.price) - totalPrice);
           bookingData.append('promotionTitle', item.promotion.title);
       }


      const result = await DataService.createBooking(bookingData);
      if (result.success) {
        setSubmitSuccess(true);
        if (user) {
          setTimeout(() => {
            onClose();
            navigate('/my-bookings');
          }, 3000); // Wait 3 seconds
        } else {
           setTimeout(() => {
            onClose();
          }, 5000); // Wait 5 seconds for guests
        }
      } else {
        throw new Error(result.message || 'Booking submission failed.');
      }
    } catch (error) {
      setSubmitError(error.message || 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
   const formatTime = (time) => {
    if (!time) return 'N/A';
    try {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        if (isNaN(date.getTime())) return 'Invalid Time';
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return 'Invalid Time';
    }
  };

  if (!isOpen || !item) return null;

  // **FIX:** Calculate the *inclusive* end date for display
  const displayEndDate = itemType === 'car' && calculatedEndDate
    ? new Date(new Date(calculatedEndDate).setDate(calculatedEndDate.getDate() - 1)) // Subtract 1 day for display
    : calculatedEndDate;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
       <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Book Your Trip</h2>
                  <p className="text-gray-600">{itemType === 'car' ? `${item.brand} ${item.model}` : item.title}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
          </div>

          {/* Body with overflow */}
          <div className="p-6 overflow-y-auto flex-grow">
              {submitSuccess ? (
                <div className="text-center p-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold">Booking Submitted Successfully!</h3>
                  <p className="text-gray-600 mt-2">
                      {user
                        ? "We've received your booking. You'll receive a confirmation email shortly. Redirecting to your bookings..."
                        : "We've received your booking. You'll receive a confirmation email shortly."}
                  </p>
                </div>
              ) : (
                <form id="bookingForm" onSubmit={handleSubmit} noValidate className="space-y-6">
                  {submitError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={16}/> {submitError}</div>}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: User Info & Booking Details */}
                    <div className="space-y-6">
                      {/* User Information */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="font-semibold mb-3 text-gray-800">Your Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="firstName" placeholder="First Name *" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                           <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="lastName" placeholder="Last Name *" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                           <div className="md:col-span-2 relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="email" name="email" placeholder="Email Address *" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                           <div className="md:col-span-2 relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="tel" name="phone" placeholder="Phone Number *" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-10 p-2 border rounded-md" pattern="[0-9]{11}" title="Please enter an 11-digit phone number"/></div>
                           <div className="md:col-span-2 relative"><Home className="absolute left-3 top-4 text-gray-400" size={16}/><textarea name="address" placeholder="Full Address *" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full pl-10 p-2 border rounded-md" rows="2"></textarea></div>
                        </div>
                      </div>

                      {/* Booking Specifics (Conditional) */}
                      {itemType === 'tour' && (
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <h3 className="font-semibold mb-3 text-gray-800">Booking Details</h3>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests *</label>
                            <select value={formData.numberOfGuests} onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })} className="w-full p-2 border rounded-md">
                              {Array.from({ length: item.maxGroupSize || 10 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1} {i > 0 ? 'guests' : 'guest'}</option>))}
                            </select>
                          </div>
                           <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                            <h3 className="font-semibold text-blue-800">Fixed Tour Schedule</h3>
                            <p className="text-sm text-blue-700">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
                            <p className="text-sm text-blue-700 mt-1">Starts at: {formatTime(formData.time)}</p>
                          </div>
                        </div>
                      )}

                      {itemType === 'car' && (
                        <>
                          <CalendarBooking
                            serviceId={item._id}
                            onDateSelect={handleDateSelect}
                            initialDate={formData.startDate}
                            onBookedDatesChange={setBookedDates} // This prop is correct
                          />
                          <div className="bg-gray-50 p-4 rounded-lg border">
                              <h3 className="font-semibold mb-3 text-gray-800">Rental Details</h3>
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
                           <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="font-semibold mb-3 text-gray-800">Delivery Method</h3>
                                <div className="flex gap-4 mb-4">
                                  <label className="flex items-center cursor-pointer"><input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })} className="mr-2"/>Pickup</label>
                                  <label className="flex items-center cursor-pointer"><input type="radio" name="deliveryMethod" value="dropoff" checked={formData.deliveryMethod === 'dropoff'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })} className="mr-2"/>Drop-off</label>
                                </div>
                                {formData.deliveryMethod === 'pickup' ? (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Pickup Location *</label>
                                    <select name="pickupLocation" required={formData.deliveryMethod === 'pickup'} value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="w-full p-2 border rounded-md">
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
                      {/* Special Requests */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                          <h3 className="font-semibold mb-3 text-gray-800">Special Requests</h3>
                          <textarea name="specialRequests" value={formData.specialRequests} onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })} className="w-full p-2 border rounded-md" rows="3" placeholder="Any special needs or requests? (optional)"></textarea>
                      </div>

                    </div>

                    {/* Right Column: Payment & Summary */}
                    <div className="space-y-6">
                      {/* Payment */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h3 className="font-semibold mb-3 text-blue-800">Payment Details</h3>
                           {bookingDisclaimer && (
                              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md mb-4 text-xs">
                                  <div className="flex">
                                      <div className="flex-shrink-0"><Info className="h-4 w-4" /></div>
                                      <div className="ml-2">
                                          <h3 className="font-bold">Important Note</h3>
                                          <p className="mt-1 whitespace-pre-wrap">{bookingDisclaimer}</p>
                                      </div>
                                  </div>
                              </div>
                          )}
                          {item.paymentType === 'downpayment' && item.downpaymentValue > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Option *</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'downpayment' ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-white hover:bg-blue-50'}`}>
                                        <input type="radio" name="paymentOption" value="downpayment" checked={selectedPaymentOption === 'downpayment'} onChange={(e) => setSelectedPaymentOption(e.target.value)} className="sr-only"/>
                                        Pay Downpayment ({formatPrice(requiredPayment)})
                                    </label>
                                    <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'full' ? 'bg-blue-600 text-white border-blue-700 shadow-inner' : 'bg-white hover:bg-blue-50'}`}>
                                        <input type="radio" name="paymentOption" value="full" checked={selectedPaymentOption === 'full'} onChange={(e) => setSelectedPaymentOption(e.target.value)} className="sr-only"/>
                                        Pay Full Amount ({formatPrice(totalPrice)})
                                    </label>
                                </div>
                                {!user && selectedPaymentOption === 'downpayment' && (
                                    <div className="mt-2 text-sm text-yellow-800 bg-yellow-100 p-3 rounded-md flex items-center gap-2">
                                        <AlertTriangle size={16}/> You must be logged in to make a downpayment.
                                    </div>
                                )}
                            </div>
                         )}
                         <div className="flex flex-col items-center">
                            {qrLoading ? <p className="text-sm text-gray-500">Loading QR Code...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR Code" className="w-48 h-48 object-contain mb-4 border rounded-md shadow-sm" /> : <p className="text-sm text-gray-500 mb-4">Payment QR code not available.</p>}
                            <div className="w-full space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">System Payment Reference Code *</label>
                                <input type="text" readOnly value={paymentReferenceCode} className="w-full p-2 border rounded-md bg-gray-100 font-mono text-center text-sm tracking-wider" />
                                <p className="text-xs text-gray-500 mt-1">Include this code in your payment description/notes.</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Your Bank Reference Number *</label>
                                <input type="text" name="manualPaymentReference" value={formData.manualPaymentReference} onChange={(e) => setFormData({ ...formData, manualPaymentReference: e.target.value })} className="w-full p-2 border rounded-md" placeholder="e.g., from your bank receipt" required/>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid * <span className="text-red-600 font-bold">({formatPrice(requiredPayment)})</span></label>
                                <input type="number" step="0.01" placeholder={formatPrice(requiredPayment)} name="amountPaid" required value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })} className="w-full p-2 border rounded-md"/>
                                <p className="text-xs text-gray-500 mt-1">Please enter the exact required amount.</p>
                              </div>
                              <div className="flex justify-center">
                                <label htmlFor="paymentProof" className="w-full text-center cursor-pointer bg-white border-2 border-dashed rounded-lg p-4 hover:bg-gray-50">
                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                                    <span className="text-sm font-medium text-gray-700">{formData.paymentProof ? formData.paymentProof.name : 'Upload Payment Proof *'}</span>
                                    <input id="paymentProof" type="file" name="paymentProof" required onChange={handleFileChange} className="hidden" accept="image/*"/>
                                </label>
                              </div>
                            </div>
                        </div>
                      </div>

                      {/* --- UPDATED SUMMARY SECTION --- */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                          <div className="space-y-2 text-sm">
                            {/* Personal Info */}
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><UserIcon size={14}/>Name:</span><span className="font-medium text-right">{formData.firstName} {formData.lastName}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Mail size={14}/>Email:</span><span className="font-medium text-right">{formData.email}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Phone size={14}/>Phone:</span><span className="font-medium text-right">{formData.phone}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Home size={14}/>Address:</span><span className="font-medium text-right">{formData.address}</span></div>
                            <hr className="my-2 border-gray-200"/>

                            {/* Service Details */}
                            <div className="flex justify-between"><span className="text-gray-600">Service:</span><span className="font-medium text-right">{itemType === 'car' ? `${item.brand} ${item.model}` : item.title}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Calendar size={14}/>From:</span><span className="font-medium text-right">{formatDate(formData.startDate)} at {formatTime(formData.time)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Calendar size={14}/>To:</span><span className="font-medium text-right">{formatDate(displayEndDate)}</span></div>

                            {/* Conditional Details */}
                            {itemType === 'car' && <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Clock size={14}/>Days:</span><span className="font-medium text-right">{formData.numberOfDays}</span></div>}
                            {/* --- LINE 528 (approx) --- */}
                            {itemType === 'car' && <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Car size={14}/>Delivery:</span><span className="font-medium capitalize text-right">{formData.deliveryMethod === 'pickup' ? formData.pickupLocation : (formData.dropoffLocation || 'Map Pin')}</span></div>}
                            {itemType === 'tour' && <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Users size={14}/>Guests:</span><span className="font-medium text-right">{formData.numberOfGuests}</span></div>}

                            {formData.specialRequests && <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><Info size={14}/>Requests:</span><span className="font-medium text-right">{formData.specialRequests}</span></div>}
                            <hr className="my-2 border-gray-200"/>

                            {/* Payment Info */}
                            <div className="flex justify-between"><span className="text-gray-600 flex items-center gap-1.5"><CreditCard size={14}/>Pay Option:</span><span className="font-medium text-right capitalize">{selectedPaymentOption}</span></div>
                            {item.promotion && (
                                <>
                                <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1.5"><DollarSign size={14}/>Original Price:</span><span className="line-through">{formatPrice(item.originalPrice || item.pricePerDay || item.price)}</span></div>
                                <div className="flex justify-between text-green-600"><span className="flex items-center gap-1.5"><Tag size={14}/>Discount ({item.promotion.title}):</span><span>- {formatPrice((item.originalPrice || item.pricePerDay || item.price) - totalPrice)}</span></div>
                                </>
                             )}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                                <span className="font-semibold text-gray-900 flex items-center gap-1.5"><DollarSign size={14}/>Total Amount:</span>
                                <span className="font-bold text-lg text-blue-600">{formatPrice(totalPrice)}</span>
                            </div>
                             {selectedPaymentOption === 'downpayment' && (
                                <div className="flex justify-between text-orange-600">
                                  <span className="font-semibold">Downpayment Due:</span>
                                  <span className="font-bold text-lg">{formatPrice(requiredPayment)}</span>
                                </div>
                              )}
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-300 bg-red-50 p-2 rounded-md">
                                <span className="text-lg font-semibold text-red-700">Amount to Pay Now:</span>
                                <span className="text-xl font-bold text-red-700">{formatPrice(requiredPayment)}</span>
                            </div>
                            {selectedPaymentOption === 'downpayment' && totalPrice > requiredPayment && (
                                <p className="text-xs text-gray-600 text-center pt-2 italic">
                                Remaining balance of {formatPrice(totalPrice - requiredPayment)} due upon service.
                                </p>
                            )}
                             <div className="flex justify-between"><span className="text-gray-600">Sys. Ref Code:</span><span className="font-medium font-mono text-xs text-right">{paymentReferenceCode}</span></div>
                             <div className="flex justify-between"><span className="text-gray-600">Bank Ref Code:</span><span className="font-medium text-right">{formData.manualPaymentReference || 'N/A'}</span></div>
                             <div className="flex justify-between"><span className="text-gray-600">Payment Proof:</span><span className="font-medium text-right text-xs">{formData.paymentProof?.name || 'Not Uploaded'}</span></div>
                          </div>
                      </div>
                      {/* --- END UPDATED SUMMARY SECTION --- */}

                      {/* Terms */}
                      <div className="flex items-start mt-4">
                        <input type="checkbox" id="agreedToTerms" required checked={formData.agreedToTerms} onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-0.5 flex-shrink-0"/>
                        <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-900">I have read and agree to the <Link to="/policies" target="_blank" className="text-blue-600 hover:underline font-semibold">Terms, Policies, and Agreements</Link>.*</label>
                      </div>
                    </div>
                  </div>
                </form>
              )}
          </div>
           {/* Footer Actions - Sticky */}
           {!submitSuccess && (
             <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-6 -mx-6 -mb-6 rounded-b-lg z-10">
                <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                <button
                  type="submit"
                  form="bookingForm" // Link button to the form
                  disabled={submitting || !formData.agreedToTerms || (selectedPaymentOption === 'downpayment' && !user)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium hover:bg-blue-700 transition-colors">
                    {submitting ? 'Submitting...' : 'Submit Booking'}
                </button>
             </div>
           )}
       </div>
    </div>
  );
};

export default BookingModal;