// client/src/components/BookingModal.jsx
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Car, MapPin, Calendar, Users, CreditCard, DollarSign, Info, Upload, CheckCircle, Clock, Smartphone, Mail, Map, Bus, AlertTriangle } from 'lucide-react'; // <-- Imported Bus & AlertTriangle
import { useAuth } from './Login';
import DataService, { getImageUrl, SERVER_URL } from './services/DataService'; // Added SERVER_URL
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import CalendarBooking from './CalendarBooking';

// Helper to format currency
const formatPrice = (price) => {
    // Return "Quote Pending" if price is explicitly 0 for transport
    if (price === 0 && itemType === 'transport') {
        return "Quote Pending";
    }
    if (typeof price !== 'number' || isNaN(price)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
};

const BookingModal = ({ isOpen, onClose, item, itemType }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [itemName, setItemName] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState(0); // Renamed for clarity
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0); // This will hold the final price, including potential fees
  const [totalDaysOrGuests, setTotalDaysOrGuests] = useState(1); // Combined state
  const [paymentProof, setPaymentProof] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false); // State for terms agreement
  const [paymentQR, setPaymentQR] = useState(''); // State for payment QR code URL
  const [qrLoading, setQrLoading] = useState(true); // State for QR loading

  const [formData, setFormData] = useState({
    startDate: '', // Initialize as empty, set by calendar
    endDate: '', // Initialize as empty, set by calendar
    time: '08:00', // Default time
    deliveryMethod: 'pickup',
    dropoffLocation: '',
    pickupLocation: 'Do Rayd Office',
    numberOfGuests: 1,
    paymentOption: item?.paymentType === 'downpayment' ? 'downpayment' : 'full', // Default based on item config
    specialRequests: '',
    // Transport specific fields
    transportDestination: '',
    transportServiceType: '',
    // Personal Info (prefill if logged in)
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  // Fetch Payment QR Code
  useEffect(() => {
    if (step === 3 && itemType !== 'transport') { // Fetch only when needed and not for transport
        setQrLoading(true);
        DataService.fetchContent('paymentQR')
            .then(qrResponse => {
                if (qrResponse.success && qrResponse.data.content) {
                    const qrContent = qrResponse.data.content;
                    // Ensure it's a full URL or prepend SERVER_URL
                    setPaymentQR(qrContent.startsWith('http') ? qrContent : `${SERVER_URL}${qrContent.startsWith('/') ? '' : '/'}${qrContent}`);
                }
            })
            .catch(err => console.warn('Payment QR code not found or failed to load.'))
            .finally(() => setQrLoading(false));
    }
  }, [step, itemType]); // Rerun if step changes to 3 or itemType changes

  // Get availability
  const { data: availabilityData } = useApi(() => item?._id ? DataService.getAvailability(item._id) : Promise.resolve({ success: false }), [item?._id]);
  const bookedDates = availabilityData?.data?.bookedDates || [];

  // 1. Set item name and price unit based on itemType
  useEffect(() => {
    if (item) {
      if (itemType === 'car') {
        setItemName(`${item.brand} ${item.model}`);
        setPricePerUnit(item.pricePerDay || 0);
      } else if (itemType === 'tour') {
        setItemName(item.title);
        setPricePerUnit(item.price || 0);
      } else if (itemType === 'transport') {
        setItemName(item.vehicleType + (item.name ? ` (${item.name})` : ''));
        setPricePerUnit(0); // Base price is 0, determined later
      }
      // Set default payment option based on item configuration
      setFormData(prev => ({
          ...prev,
          paymentOption: item.paymentType === 'downpayment' ? 'downpayment' : 'full',
          // Reset dates when item changes
          startDate: '',
          endDate: ''
      }));
       setTotalPrice(0); // Reset price when item changes
       setCalculatedPrice(0);
       setTotalDaysOrGuests(itemType === 'car' ? 1 : (formData.numberOfGuests || 1));
    }
  }, [item, itemType]); // Removed formData.numberOfGuests dependency to avoid loop


  // 2. Calculate price when relevant fields change
  useEffect(() => {
    // Only calculate if start date is selected
    if (!formData.startDate) {
        setCalculatedPrice(0);
        setTotalPrice(0);
        return;
    }

    const start = new Date(formData.startDate);
    let days = 1;
    let subtotal = 0;
    let finalPrice = 0;

    if (itemType === 'car') {
        const end = formData.endDate ? new Date(formData.endDate) : start; // Use start date if end date is not set
        if (end >= start) {
            const diffTime = Math.abs(end - start);
            days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); // Ensure at least 1 day
        } else {
            days = 1; // Default to 1 day if end date is before start date
        }
        setTotalDaysOrGuests(days);
        subtotal = pricePerUnit * days;
    } else if (itemType === 'tour') {
        days = 1; // Tours are usually priced per person regardless of days selected in modal
        const guests = Number(formData.numberOfGuests) || 1;
        setTotalDaysOrGuests(guests);
        subtotal = pricePerUnit * guests;
    } else if (itemType === 'transport') {
        days = 1; // Transport price is quoted later
        subtotal = 0;
        finalPrice = 0; // Explicitly set to 0 for transport quote requests
    }

    if (itemType !== 'transport') {
        // Apply Promotion Logic (check against promotionsData if needed for accuracy)
        // For simplicity, we'll assume item.promotion contains the best applicable promotion data if fetched correctly
        if (item?.promotion) {
            if (item.promotion.discountType === 'percentage') {
                finalPrice = subtotal - (subtotal * (item.promotion.discountValue / 100));
            } else {
                finalPrice = Math.max(0, subtotal - item.promotion.discountValue); // Ensure price doesn't go below 0
            }
        } else {
            finalPrice = subtotal;
        }
    }

    setCalculatedPrice(subtotal);
    setTotalPrice(finalPrice);

  }, [formData.startDate, formData.endDate, formData.numberOfGuests, itemType, pricePerUnit, item?.promotion]); // Recalculate if promotion data on item changes


  const handleInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    if (type === 'file') {
      setPaymentProof(files[0]);
    } else if (type === 'checkbox') {
      setAgreedToTerms(checked); // Handle checkbox separately
    }
     else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Callback from CalendarBooking
  const handleDateSelect = (dateString) => {
    setFormData(prev => ({
        ...prev,
        startDate: dateString,
        // For non-cars, endDate is same as startDate unless backend logic changes
        endDate: itemType === 'car' ? prev.endDate : dateString
    }));
  };

  const resetForm = () => {
    setStep(1);
    setSubmitting(false);
    setError('');
    setSuccess(false);
    setPaymentProof(null);
    setAgreedToTerms(false); // Reset terms agreement
    setFormData({
      startDate: '', // Reset dates
      endDate: '',
      time: '08:00',
      deliveryMethod: 'pickup',
      dropoffLocation: '',
      pickupLocation: 'Do Rayd Office',
      numberOfGuests: 1,
      paymentOption: item?.paymentType === 'downpayment' ? 'downpayment' : 'full',
      specialRequests: '',
      transportDestination: '',
      transportServiceType: '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors at each step attempt

    // --- Step 1 Validation (Date Selection) ---
    if (step === 1) {
        if (!formData.startDate) {
            setError("Please select a start date from the calendar.");
            return;
        }
        if (itemType === 'car' && !formData.endDate) {
            setError("Please select an end date from the calendar for car rentals.");
            return;
        }
        if (itemType === 'car' && new Date(formData.endDate) < new Date(formData.startDate)) {
            setError("End date cannot be before the start date.");
            return;
        }
        setStep(2); // Move to details
        return;
    }

    // --- Step 2 Validation (Details) ---
    if (step === 2) {
       // Check required fields based on itemType
       if (itemType === 'car' && formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation.trim()) {
            setError('Please provide a drop-off location address.');
            return;
       }
       if (itemType === 'transport' && (!formData.transportDestination.trim() || !formData.transportServiceType.trim())) {
           setError('Please provide a destination and select a service type for transport.');
           return;
       }
        // Check personal info if user is not logged in
        if (!isAuthenticated && (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.address.trim())) {
           setError('Please fill in all personal information fields (Name, Email, Phone, Address).');
           return;
       }
       // Validate email format
       if (!/\S+@\S+\.\S+/.test(formData.email)) {
           setError('Please enter a valid email address.');
           return;
       }
        // Validate phone format (simple check for now)
       if (!/^\d{10,15}$/.test(formData.phone.replace(/\s+/g, ''))) { // Allow 10-15 digits, remove spaces
           setError('Please enter a valid phone number (digits only, 10-15 digits).');
           return;
       }
        // Check terms agreement
       if (!agreedToTerms) {
           setError('You must agree to the Terms & Agreement to proceed.');
           return;
       }
       setStep(3); // Move to payment/confirmation
       return;
    }

    // --- Step 3 Submission (Payment/Confirmation) ---
    if (step === 3) {
      // Payment proof is only required if it's NOT a transport booking AND a payment option requiring proof is selected
      const isPaymentRequired = itemType !== 'transport' && (formData.paymentOption === 'full' || formData.paymentOption === 'downpayment');
      if (isPaymentRequired && !paymentProof) {
        setError('Payment proof is required. Please upload a screenshot of your transaction.');
        return;
      }
      // Bank Reference is required if payment proof is provided
       if (paymentProof && !formData.manualPaymentReference?.trim()) {
           setError('Please enter the Bank Transaction Reference Number from your payment.');
           return;
       }


      setSubmitting(true);
      const bookingData = new FormData();

      // Append common data
      bookingData.append('itemId', item._id);
      bookingData.append('itemType', itemType);
      bookingData.append('itemName', itemName);
      bookingData.append('startDate', formData.startDate); // Send date string
      bookingData.append('endDate', itemType === 'car' ? formData.endDate : formData.startDate); // Send date string
      bookingData.append('time', formData.time);
      bookingData.append('paymentOption', formData.paymentOption);
      bookingData.append('specialRequests', formData.specialRequests.trim());
      bookingData.append('agreedToTerms', agreedToTerms.toString()); // Send as string 'true'/'false'

      // Append price details (even if 0 for transport, backend expects it)
      bookingData.append('totalPrice', totalPrice);
      if (item?.originalPrice && item.originalPrice > totalPrice) {
          bookingData.append('originalPrice', item.originalPrice);
          bookingData.append('discountApplied', item.originalPrice - totalPrice);
          bookingData.append('promotionTitle', item.promotion?.title || 'Discount Applied');
      }

      // Append user info (either from logged-in user or form)
      bookingData.append('firstName', formData.firstName.trim());
      bookingData.append('lastName', formData.lastName.trim());
      bookingData.append('email', formData.email.trim());
      bookingData.append('phone', formData.phone.trim());
      bookingData.append('address', formData.address.trim());
      if (isAuthenticated && user?._id) {
          bookingData.append('userId', user._id); // Send userId if logged in
      }

      // Append item-specific data
      if (itemType === 'car') {
        bookingData.append('deliveryMethod', formData.deliveryMethod);
        if (formData.deliveryMethod === 'dropoff') {
          bookingData.append('dropoffLocation', formData.dropoffLocation.trim());
        } else {
          bookingData.append('pickupLocation', formData.pickupLocation.trim());
        }
      } else if (itemType === 'tour') {
        bookingData.append('numberOfGuests', formData.numberOfGuests);
      } else if (itemType === 'transport') {
        bookingData.append('numberOfGuests', formData.numberOfGuests); // Guests for transport too
        // *** MODIFIED: Send separate fields ***
        bookingData.append('transportDestination', formData.transportDestination.trim());
        bookingData.append('transportServiceType', formData.transportServiceType.trim());
        // *** END MODIFICATION ***
      }

      // Append payment details if applicable
      if (paymentProof && isPaymentRequired) {
        bookingData.append('paymentProof', paymentProof);
        bookingData.append('manualPaymentReference', formData.manualPaymentReference.trim());
        // Calculate amount paid based on payment option
        const amountToPay = formData.paymentOption === 'downpayment' ? totalPrice * (item.downpaymentValue / 100) : totalPrice;
        bookingData.append('amountPaid', amountToPay.toFixed(2)); // Send calculated amount paid
      } else {
          bookingData.append('amountPaid', '0'); // Explicitly send 0 if no payment proof needed/provided
      }

      try {
        const result = await DataService.createBooking(bookingData);
        if (result.success) {
          setSuccess(true);
        } else {
          setError(result.message || 'Booking failed. Please check details and try again.');
          setStep(3); // Stay on payment step if backend fails
        }
      } catch (err) {
        setError(err.message || 'An network error occurred. Please try again.');
        setStep(3); // Stay on payment step
      } finally {
        setSubmitting(false);
      }
    }
  };

  const renderStep = () => {
    // --- Success View ---
    if (success) {
      return (
        <div className="text-center p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-in fade-in scale-in duration-500" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {itemType === 'transport' ? 'Quote Request Submitted!' : 'Booking Submitted!'}
          </h3>
          <p className="text-gray-600">
            {itemType === 'transport'
              ? "Your request for a transport quote has been received. Our team will review the details and get back to you with the price and confirmation shortly via email and your dashboard."
              : "Your booking request is pending confirmation. Our team will review your payment and details, and you'll receive an email notification soon."}
          </p>
          <button
            onClick={() => { handleClose(); navigate('/my-bookings'); }}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            {isAuthenticated ? 'View My Bookings' : 'Close'}
          </button>
        </div>
      );
    }

    // --- Form Steps ---
    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shadow-sm border border-blue-200">
              {itemType === 'car' ? <Car className="w-6 h-6 text-blue-600" /> :
               itemType === 'tour' ? <MapPin className="w-6 h-6 text-green-600" /> :
               <Bus className="w-6 h-6 text-indigo-600" />}
            </span>
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">Book: {itemName}</Dialog.Title>
              {itemType === 'car' && <p className="text-sm text-gray-500">{item.brand} {item.model} ({item.year})</p>}
              {itemType === 'tour' && <p className="text-sm text-gray-500">{item.duration} | {item.destination}</p>}
              {itemType === 'transport' && <p className="text-sm text-gray-500">{item.capacity}</p>}
            </div>
          </div>
        </div>

        {/* Body (Steps) */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          {error && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

          {/* Step 1: Dates */}
          <div className={`${step === 1 ? 'block' : 'hidden'}`}>
            <h4 className="font-semibold text-gray-800 mb-2">Step 1: Select Your Date(s)</h4>
            <p className="text-sm text-gray-600 mb-4">Choose your start {itemType === 'car' ? 'and end dates' : 'date'}. Dates marked in red are unavailable.</p>
            <CalendarBooking
              serviceId={item._id}
              // Pass selected dates TO the calendar
              selectedStartDate={formData.startDate}
              selectedEndDate={formData.endDate}
              // Handle date selection FROM the calendar
              onDateSelect={handleDateSelect}
              onBookedDatesChange={() => {}} // Keep if needed elsewhere, empty function for now
              isRange={itemType === 'car'} // Enable range selection only for cars
            />
            {/* Show date summary */}
            {formData.startDate && (
                <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                    <p><strong>Start Date:</strong> {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not selected'}</p>
                    {itemType === 'car' && <p><strong>End Date:</strong> {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Not selected'}</p>}
                </div>
            )}
          </div>

          {/* Step 2: Details */}
          <div className={`${step === 2 ? 'block' : 'hidden'} space-y-4`}>
            <h4 className="font-semibold text-gray-800">Step 2: Provide Your Details</h4>
            {/* Personal Info Section (Conditionally shown if not logged in) */}
             {!isAuthenticated && (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <h5 className="font-medium text-gray-800">Your Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First Name *" required className="w-full p-2 border rounded-md" />
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last Name *" required className="w-full p-2 border rounded-md" />
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address *" required className="w-full p-2 border rounded-md" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone Number *" required className="w-full p-2 border rounded-md" />
                    </div>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Full Address *" required rows="2" className="w-full p-2 border rounded-md"></textarea>
                </div>
            )}

            {/* Item Specific Fields */}
            {itemType === 'car' && (
              <>
                <div>
                  <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
                  <select name="deliveryMethod" id="deliveryMethod" value={formData.deliveryMethod} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                    <option value="pickup">Pick-up at Office ({formData.pickupLocation})</option>
                    <option value="dropoff">Drop-off at Location</option>
                  </select>
                </div>
                {formData.deliveryMethod === 'dropoff' && (
                  <div>
                    <label htmlFor="dropoffLocation" className="block text-sm font-medium text-gray-700 mb-1">Drop-off Location Address *</label>
                    <input type="text" name="dropoffLocation" id="dropoffLocation" value={formData.dropoffLocation} onChange={handleInputChange} required placeholder="Enter full address" className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                )}
              </>
            )}

            {(itemType === 'tour' || itemType === 'transport') && (
              <div>
                <label htmlFor="numberOfGuests" className="block text-sm font-medium text-gray-700 mb-1">Number of {itemType === 'tour' ? 'Guests' : 'Passengers'} *</label>
                <input
                  type="number"
                  name="numberOfGuests"
                  id="numberOfGuests"
                  value={formData.numberOfGuests}
                  onChange={handleInputChange}
                  min="1"
                  max={item?.maxGroupSize || 100} // Use maxGroupSize if available
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {itemType === 'transport' && (
                <>
                  <div>
                    <label htmlFor="transportDestination" className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                    <input type="text" name="transportDestination" id="transportDestination" value={formData.transportDestination} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Baguio City, Vigan" />
                  </div>
                  <div>
                    <label htmlFor="transportServiceType" className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                    <select name="transportServiceType" id="transportServiceType" value={formData.transportServiceType} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-md bg-white">
                      <option value="">Select service type...</option>
                      <option value="Day Tour">Day Tour</option>
                      <option value="Overnight">Overnight</option>
                      <option value="3D2N">3 Days, 2 Nights</option>
                      <option value="Drop & Pick">Drop & Pick</option>
                      <option value="Other">Other (Specify below)</option>
                    </select>
                  </div>
                </>
            )}

            {/* Common Fields */}
             <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Pickup/Start Time *</label>
                <input type="time" name="time" id="time" value={formData.time} onChange={handleInputChange} required className="w-full p-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
              <textarea name="specialRequests" id="specialRequests" value={formData.specialRequests} onChange={handleInputChange} rows="3" className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Child seat, specific pick-up instructions..."></textarea>
            </div>
            {/* Terms Agreement */}
             <div className="flex items-start mt-4">
                 <input type="checkbox" id="agreedToTerms" checked={agreedToTerms} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1 flex-shrink-0" required />
                 <label htmlFor="agreedToTerms" className="ml-2 block text-sm text-gray-900">
                     I agree to the <a href="/policies" target="_blank" className="text-blue-600 hover:underline font-semibold">Booking Terms & Agreement</a>. *
                 </label>
             </div>
          </div>

          {/* Step 3: Payment / Confirmation */}
          <div className={`${step === 3 ? 'block' : 'hidden'} space-y-4`}>
            <h4 className="font-semibold text-gray-800">Step 3: {itemType === 'transport' ? 'Confirm Quote Request' : 'Confirm & Pay'}</h4>

            {/* Booking Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h5 className="font-semibold text-gray-900 mb-3">Booking Summary</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Name:</span> <span className="font-medium">{formData.firstName} {formData.lastName}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Email:</span> <span className="font-medium">{formData.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Item:</span> <span className="font-medium">{itemName}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Start:</span> <span className="font-medium">{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'N/A'} at {formData.time}</span></div>
                {itemType === 'car' && <div className="flex justify-between"><span className="text-gray-600">End:</span> <span className="font-medium">{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'N/A'}</span></div>}
                {itemType !== 'car' && <div className="flex justify-between"><span className="text-gray-600">Guests:</span> <span className="font-medium">{formData.numberOfGuests}</span></div>}
                {itemType === 'transport' && <div className="flex justify-between"><span className="text-gray-600">Destination:</span> <span className="font-medium">{formData.transportDestination}</span></div>}
                {itemType === 'transport' && <div className="flex justify-between"><span className="text-gray-600">Service:</span> <span className="font-medium">{formData.transportServiceType}</span></div>}
              </div>
            </div>

            {/* --- MODIFIED: Conditional Price/Payment Section --- */}
            {itemType === 'transport' ? (
                // Message for Transport Quote
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <Info className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                    <h5 className="font-semibold text-blue-800 mb-2">Quote Request</h5>
                    <p className="text-sm text-blue-700">
                        The price for this transport service will be provided by our team after reviewing your request details (destination, duration, etc.). Please submit your request, and we will contact you shortly with a quote and payment instructions if applicable.
                    </p>
                </div>
            ) : (
                // Price & Payment for Cars/Tours
                <>
                    {/* Price Details */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-gray-900 mb-3">Price Details</h5>
                        <div className="space-y-1 text-sm">
                            {item?.originalPrice && item.originalPrice > totalPrice && (
                                <div className="flex justify-between text-gray-500"><span >Original Price:</span> <span className="line-through">{formatPrice(item.originalPrice)}</span></div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">{itemType === 'car' ? `Subtotal (${totalDaysOrGuests} days):` : `Base Price (${totalDaysOrGuests} guests):`}</span>
                                <span className="font-medium">{formatPrice(calculatedPrice)}</span>
                            </div>
                            {item?.promotion && (
                                <div className="flex justify-between text-red-600">
                                    <span>Discount ({item.promotion.title}):</span>
                                    <span className="font-medium">-{formatPrice(calculatedPrice - totalPrice)}</span>
                                </div>
                            )}
                            {/* <div className="flex justify-between"><span className="text-gray-600">Booking Fee:</span> <span className="font-medium">{formatPrice(bookingFee)}</span></div> */}
                            <div className="flex justify-between text-lg font-bold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                                <span>Total Price:</span>
                                <span>{formatPrice(totalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Options */}
                    {item?.paymentType !== 'full' && ( // Show options only if downpayment is possible OR default
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Option</label>
                        <div className="space-y-2">
                            {item?.paymentType !== 'full' && item?.downpaymentValue > 0 && ( // Ensure downpayment is configured
                                <label className="flex items-center p-3 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer">
                                <input type="radio" name="paymentOption" value="downpayment" checked={formData.paymentOption === 'downpayment'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300"/>
                                <span className="ml-3 block text-sm">
                                    <span className="font-medium text-gray-900">
                                        Pay Downpayment ({item.downpaymentType === 'percentage' ? `${item.downpaymentValue}%` : formatPrice(item.downpaymentValue)})
                                    </span>
                                    <span className="block text-gray-500">
                                        Pay {formatPrice(item.downpaymentType === 'percentage' ? totalPrice * (item.downpaymentValue / 100) : item.downpaymentValue * (itemType === 'car' ? totalDaysOrGuests : 1) )} now. Rest due later.
                                    </span>
                                </span>
                                </label>
                            )}
                            <label className="flex items-center p-3 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 cursor-pointer">
                            <input type="radio" name="paymentOption" value="full" checked={formData.paymentOption === 'full'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300"/>
                            <span className="ml-3 block text-sm">
                                <span className="font-medium text-gray-900">Pay in Full Now</span>
                                <span className="block text-gray-500">Pay {formatPrice(totalPrice)} now to complete your booking faster.</span>
                            </span>
                            </label>
                        </div>
                        </div>
                    )}

                    {/* Payment Instructions & Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions & Proof Upload *</label>
                        <p className="text-xs text-gray-500 mb-2">Please pay via GCash/Bank Transfer using the QR code/details below and upload a screenshot of your transaction.</p>
                        {/* QR Code Display */}
                         <div className="flex justify-center mb-3">
                            {qrLoading ? <p className="text-sm text-gray-500">Loading QR...</p> : paymentQR ? <img src={paymentQR} alt="Payment QR" className="max-w-[150px] max-h-[150px] border rounded-md shadow-sm" /> : <p className="text-sm text-red-500">QR code not available.</p>}
                         </div>
                         {/* Bank Reference Input */}
                         <div>
                            <label htmlFor="manualPaymentReference" className="block text-xs font-medium text-gray-600 mb-1">Bank Transaction Reference Number *</label>
                            <input
                                type="text"
                                name="manualPaymentReference"
                                id="manualPaymentReference"
                                value={formData.manualPaymentReference || ''}
                                onChange={handleInputChange}
                                required={!!paymentProof} // Required only if proof is uploaded
                                placeholder="Enter reference from your receipt"
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            />
                         </div>
                         {/* File Upload */}
                        <input
                            type="file"
                            name="paymentProof"
                            onChange={handleInputChange}
                            accept="image/*"
                            required // Proof is always required if paying now
                            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        {paymentProof && <span className="text-xs text-green-600 italic mt-1 block">File selected: {paymentProof.name}</span>}
                    </div>
                </>
            )}
            {/* --- END MODIFIED Conditional Price/Payment Section --- */}

          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t bg-gray-50 sticky bottom-0 z-10">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => step > 1 && !success ? setStep(step - 1) : handleClose()}
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              disabled={submitting}
            >
              {step === 1 || success ? 'Cancel' : 'Back'}
            </button>

            {!success && (
              <button
                type="submit" // Always trigger handleSubmit
                disabled={submitting || (step === 2 && !agreedToTerms)} // Disable if submitting or on step 2 & terms not agreed
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
              >
                {submitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : step === 1 ? (
                  'Next: Details'
                ) : step === 2 ? (
                  'Next: Confirm'
                ) : (
                  itemType === 'transport' ? 'Submit Request' : 'Confirm & Book'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={handleClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" />
        </Transition.Child>

        {/* Modal Panel */}
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4 sm:translate-y-0"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all flex flex-col max-h-[90vh]">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20 p-1 rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                {/* Render steps or success message */}
                {renderStep()}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BookingModal;