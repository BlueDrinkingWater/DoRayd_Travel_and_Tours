// client/src/components/BookingModal.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Users, Upload, CheckCircle, Shield, FileText, AlertTriangle, Tag, User as UserIcon, Mail, Phone, Home, Info, Bus } from 'lucide-react'; // Added Bus and Info
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
      const fetchContent = async () => {
        // --- MODIFIED: Fetch QR Code for ALL item types (including transport) ---
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
  }, [isOpen]); // itemType dependency was already here, which is good.

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    startDate: '', time: '', numberOfDays: 1, numberOfGuests: 1,
    specialRequests: '', agreedToTerms: false, paymentProof: null,
    pickupLocation: '', dropoffLocation: '', dropoffCoordinates: null,
    deliveryMethod: 'pickup', amountPaid: '', manualPaymentReference: '',
    // --- Fields for Transport ---
    transportDestination: '', transportServiceType: '',
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Default to 'downpayment' ONLY if the user is logged in AND the item allows it.
      // Otherwise, default to 'full'.
      if (user && item?.paymentType === 'downpayment' && item?.downpaymentValue > 0) {
          setSelectedPaymentOption('downpayment');
      } else {
          setSelectedPaymentOption('full');
      }
        
      const todayStr = getTodayString();
      const initialState = {
          firstName: user?.firstName || '', lastName: user?.lastName || '',
          email: user?.email || '', phone: user?.phone || '', address: user?.address || '',
          startDate: '', // Reset start date
          time: '', numberOfDays: 1, numberOfGuests: 1,
          specialRequests: '', agreedToTerms: false, paymentProof: null,
          pickupLocation: '', // Reset pickup location
          dropoffLocation: '', dropoffCoordinates: null, deliveryMethod: 'pickup',
          amountPaid: '', manualPaymentReference: '',
          transportDestination: '', transportServiceType: '', // Reset transport fields
      };

      // Set defaults based on itemType
      if (itemType === 'tour' && item) {
          initialState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
          initialState.time = '09:00'; // Default tour time
      } else if (itemType === 'car') {
           initialState.startDate = todayStr; // Default to today for cars
           initialState.time = '08:00'; // Default car time
           initialState.pickupLocation = item?.pickupLocations?.[0] || ''; // Default pickup for cars
      } else if (itemType === 'transport') {
          initialState.startDate = todayStr; // Default to today for transport
          initialState.time = '08:00'; // Default transport time
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
    // This effect calculates price and end date whenever relevant form data changes
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(formData.numberOfDays, 10)); // End date is start + days
      setCalculatedEndDate(endDate);
      setTotalPrice(formData.numberOfDays * (item?.pricePerDay || 0));
    } else if (itemType === 'tour') {
      setTotalPrice(formData.numberOfGuests * (item?.price || 0));
      // Tours have fixed end dates from item data
      setCalculatedEndDate(item.endDate ? new Date(item.endDate) : (formData.startDate ? new Date(formData.startDate) : null));
    
    // --- MODIFIED: Transport Price Calculation ---
    } else if (itemType === 'transport') {
      let newPrice = 0;
      let newEndDate = formData.startDate ? new Date(formData.startDate) : null;
      
      if (item.pricing && formData.transportDestination && formData.transportServiceType) {
        const priceRule = item.pricing.find(p => p.destination === formData.transportDestination);
        
        if (priceRule) {
          if (newEndDate) { // Ensure newEndDate is valid before setting time
            newEndDate.setHours(0, 0, 0, 0); // Normalize date
          }
          switch (formData.transportServiceType) {
            case 'Day Tour':
              newPrice = priceRule.dayTourPrice || 0;
              break;
            case 'Overnight':
              newPrice = priceRule.ovnPrice || 0;
              if (newEndDate) newEndDate.setDate(newEndDate.getDate() + 1); // Add 1 day for OVN
              break;
            case '3D2N':
              newPrice = priceRule.threeDayTwoNightPrice || 0;
              if (newEndDate) newEndDate.setDate(newEndDate.getDate() + 2); // Add 2 days for 3D2N
              break;
            case 'Drop & Pick':
              newPrice = priceRule.dropAndPickPrice || 0;
              break;
            default:
              newPrice = 0;
          }
        }
      }
      setTotalPrice(newPrice);
      setCalculatedEndDate(newEndDate);
    }
  }, [
    formData.startDate, 
    formData.numberOfDays, 
    formData.numberOfGuests, 
    item, 
    itemType, 
    formData.transportDestination, // ADDED dependency
    formData.transportServiceType  // ADDED dependency
  ]);
  
  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  const handleLocationSelect = useCallback((location) => setFormData(prev => ({ ...prev, dropoffLocation: location.address, dropoffCoordinates: { lat: location.latitude, lng: location.longitude } })), []);
  const handleDateSelect = useCallback((date) => setFormData(prev => ({ ...prev, startDate: date })), []);
  const combineDateAndTime = (date, time) => date && time ? new Date(`${date}T${time}`).toISOString() : '';

  const calculatedDownpayment = useMemo(() => {
    // --- MODIFIED: Removed transport exclusion ---
    if (!item || item.paymentType !== 'downpayment' || !totalPrice) return 0;
    
    if (item.downpaymentType === 'percentage') {
      return (totalPrice * item.downpaymentValue) / 100;
    }
    
    // Fixed DP calculation
    if (item.downpaymentType === 'fixed') {
       // Assume fixed DP is per booking
       return item.downpaymentValue;
    }
    
    return 0;
  }, [item, totalPrice]); // Removed formData dependencies as fixed logic is simplified

  const requiredPayment = useMemo(() => {
    // --- MODIFIED: Removed transport exclusion ---
    if (selectedPaymentOption === 'downpayment') {
      return calculatedDownpayment;
    }
    return totalPrice;
  }, [selectedPaymentOption, calculatedDownpayment, totalPrice, itemType]); // itemType is still here just in case, no harm

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // --- DATE OVERLAP VALIDATION (Only for Cars) ---
    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + parseInt(formData.numberOfDays, 10) - 1); // Inclusive end date

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError(`Date ${dateString} is not available. Please choose another date range.`);
            }
        }
    }
    // --- ADDED: DATE OVERLAP VALIDATION for Transport ---
    else if (itemType === 'transport' && formData.startDate && calculatedEndDate) {
        const start = new Date(formData.startDate);
        // calculatedEndDate is already set by your useEffect hook
        const end = new Date(calculatedEndDate); 
        end.setHours(0, 0, 0, 0); // Normalize just in case

        // Loop from start date to the calculated end date
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError(`Date ${dateString} is not available. Please choose another date range.`);
            }
        }
    }

    // --- FORM VALIDATION ---
    const requiredBaseFields = {
      firstName: "First Name", lastName: "Last Name", email: "Email Address",
      phone: "Phone Number", address: "Address", startDate: "Start Date", time: "Time"
    };

    // Fields required for payment
    const requiredPaymentFields = {
      paymentProof: "Payment Proof", amountPaid: "Amount Paid"
    };

    // --- MODIFIED: Payment fields are now required for ALL types ---
    let fieldsToCheck = {...requiredBaseFields, ...requiredPaymentFields};

    for (const field in fieldsToCheck) {
      if (!formData[field]) {
        return setSubmitError(`${fieldsToCheck[field]} is required.`);
      }
    }
    
    // Specific validations
    if (!formData.manualPaymentReference && !paymentReferenceCode) {
        return setSubmitError("A payment reference (either generated or manual) is required.");
    }
    if (itemType === 'car') {
      if (formData.deliveryMethod === 'pickup' && !formData.pickupLocation) return setSubmitError("Pickup location is required.");
      if (formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) return setSubmitError("Dropoff location is required.");
    }
    if (itemType === 'transport') {
        if (!formData.transportDestination) return setSubmitError("Destination is required for transport.");
        if (!formData.transportServiceType) return setSubmitError("Service Type is required for transport.");
        // --- ADDED: Price validation for transport ---
        if (totalPrice <= 0) return setSubmitError("Please select a valid Destination and Service Type to calculate the price.");
    }
    if (!formData.agreedToTerms) return setSubmitError('You must agree to the terms to proceed.');
    
    // --- MODIFIED: Payment amount check for ALL types ---
    if (parseFloat(formData.amountPaid) !== requiredPayment) {
      return setSubmitError(`The amount paid must be exactly ${formatPrice(requiredPayment)}.`);
    }
    
    // --- MODIFIED: Login check for downpayment for ALL types ---
    if (selectedPaymentOption === 'downpayment' && !user) {
        setSubmitError("You must be logged in to choose the downpayment option. Please log in or create an account.");
        return;
    }

    setSubmitting(true);
    try {
      const bookingData = new FormData();
        Object.keys(formData).forEach(key => {
         if (key === 'dropoffCoordinates' && formData[key]) {
           bookingData.append(key, JSON.stringify(formData[key]));
         } else if (key !== 'manualPaymentReference' && formData[key]) { // Exclude manual ref initially
           bookingData.append(key, formData[key]);
         }
       });
      
      // --- MODIFIED: Adjust end date logic for Transport ---
      const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
      let fullEndDate = fullStartDate; // Default end date
      
      if (itemType === 'car' && calculatedEndDate) {
          // For cars, end date is calculated based on numberOfDays
          const carEndDate = new Date(formData.startDate);
          carEndDate.setDate(carEndDate.getDate() + parseInt(formData.numberOfDays, 10));
          fullEndDate = combineDateAndTime(carEndDate.toISOString().split('T')[0], formData.time); // Use same time
      } else if (itemType === 'tour' && item.endDate) {
          // For tours, end date comes from item data
          fullEndDate = combineDateAndTime(new Date(item.endDate).toISOString().split('T')[0], formData.time); // Use same time
      } else if (itemType === 'transport' && calculatedEndDate) {
          // --- ADDED: Use calculatedEndDate for transport (OVN, 3D2N) ---
          fullEndDate = combineDateAndTime(calculatedEndDate.toISOString().split('T')[0], formData.time);
      }
      // For transport 'Day Tour' or 'Drop & Pick', fullEndDate remains same as fullStartDate (which is correct)


      // Set references, dates, price, item details
      bookingData.set('paymentReference', paymentReferenceCode);
      if (formData.manualPaymentReference.trim()) {
          bookingData.set('manualPaymentReference', formData.manualPaymentReference.trim());
      }
      bookingData.set('startDate', fullStartDate);
      bookingData.set('endDate', fullEndDate);
      bookingData.set('totalPrice', totalPrice); // Send CALCULATED price for transport
      bookingData.set('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : (itemType === 'tour' ? item.title : `${item.vehicleType} ${item.name || ''}`));
      bookingData.set('itemId', item._id);
      bookingData.set('itemType', itemType);
      bookingData.set('paymentOption', selectedPaymentOption); // Send selected payment option

      // --- MODIFIED: REMOVED transport-specific payment exclusion ---
      // For car/tour/transport, ensure amountPaid matches required payment
      bookingData.set('amountPaid', requiredPayment.toString());
      

      const result = await DataService.createBooking(bookingData);
      if (result.success) {
        setSubmitSuccess(true);
        if (user) {
          setTimeout(() => {
            onClose(); // Close modal first
            navigate('/my-bookings'); // Then navigate
          }, 2000);
        } else {
             setTimeout(() => {
                onClose(); // Close modal for non-logged in users
             }, 3000); // Longer delay to read message
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
    date.setHours(parseInt(hours), parseInt(minutes)); // Ensure parsing as integers
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin"> {/* Added scrollbar-thin */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              {/* --- MODIFIED: Title --- */}
              <h2 className="text-2xl font-bold">Book Your Trip</h2>
              <p className="text-gray-600">
                {itemType === 'car' ? `${item.brand} ${item.model}` : (itemType === 'tour' ? item.title : `${item.vehicleType} ${item.name || ''}`)}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>
          
          {submitSuccess ? (
            <div className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              {/* --- MODIFIED: Success Message --- */}
              <h3 className="text-2xl font-bold">Booking Submitted!</h3>
              <p className="text-gray-600 mt-2">
                You will receive a confirmation email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {submitError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={16}/> {submitError}</div>} {/* Added Icon */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="firstName" placeholder="First Name *" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                        <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="lastName" placeholder="Last Name *" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                        <div className="md:col-span-2 relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="email" name="email" placeholder="Email Address *" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full pl-10 p-2 border rounded-md"/></div>
                        <div className="md:col-span-2 relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="tel" name="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-10 p-2 border rounded-md" placeholder="e.g., 09171234567 or +639171234567"/></div>
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
                        <p className="text-sm text-blue-700">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p> {/* Use formatDate */}
                       </div>
                    </div>
                  )}

                  {itemType === 'car' && (
                    <>
                      <CalendarBooking
                        serviceId={item._id}
                        onDateSelect={handleDateSelect}
                        initialDate={formData.startDate} // Pass initial date
                        onBookedDatesChange={setBookedDates} // Get booked dates
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                            <select name="pickupLocation" required value={formData.pickupLocation} onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })} className="w-full p-2 border rounded-md">
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

                  {/* --- MODIFIED: Transport Details Block --- */}
                  {itemType === 'transport' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Booking Details</h3>
                      
                      {/* --- MODIFIED: Replaced date input with Calendar --- */}
                      <CalendarBooking
                        serviceId={item._id}
                        onDateSelect={handleDateSelect}
                        initialDate={formData.startDate} // Pass initial date
                        onBookedDatesChange={setBookedDates} // Get booked dates
                      />
                      
                      <div className="space-y-4 mt-4"> {/* Added mt-4 for spacing */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Passengers *</label>
                          <select value={formData.numberOfGuests} onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })} className="w-full p-2 border rounded-md">
                            {Array.from({ length: item.capacity || 10 }, (_, i) => (<option key={i + 1} value={i + 1}>{i + 1} {i > 0 ? 'passengers' : 'passenger'}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                          {/* --- MODIFIED: Changed from text input to select --- */}
                          <select 
                            name="transportDestination" 
                            required 
                            value={formData.transportDestination} 
                            onChange={(e) => setFormData({ ...formData, transportDestination: e.target.value })} 
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select a destination...</option>
                            {item.pricing && item.pricing.map((priceRow, index) => (
                              <option key={index} value={priceRow.destination}>
                                {priceRow.destination} {priceRow.region ? `(${priceRow.region})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                          {/* --- MODIFIED: Removed "Other" --- */}
                          <select name="transportServiceType" required value={formData.transportServiceType} onChange={(e) => setFormData({ ...formData, transportServiceType: e.target.value })} className="w-full p-2 border rounded-md">
                            <option value="">Select service type...</option>
                            <option value="Day Tour">Day Tour</option>
                            <option value="Overnight">Overnight</option>
                            <option value="3D2N">3 Days, 2 Nights</option>
                            <option value="Drop & Pick">Drop & Pick</option>
                          </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time *</label>
                            <input type="time" required value={formData.time} onChange={(e) => setFormData(prev => ({...prev, time: e.target.value}))} className="w-full p-2 border rounded-md"/>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special Requests (Common) */}
                   <div className="bg-gray-50 p-4 rounded-lg">
                       <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
                       <textarea id="specialRequests" name="specialRequests" value={formData.specialRequests} onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })} rows="3" className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Child seat, specific pick-up instructions..."></textarea>
                   </div>

                </div>

                <div className="space-y-6">
                  {/* --- MODIFIED: Conditional Payment Block REMOVED --- */}
                  {/* This block will now show for car, tour, AND transport */}
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

                    {/* Payment Option Selection */}
                    {item.paymentType === 'downpayment' && item.downpaymentValue > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Option</label>
                        <div className="flex gap-4">
                          {/* --- MODIFIED: Added price to label and changed name --- */}
                          <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'downpayment' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                            <input 
                              type="radio" 
                              name="paymentOptionRadio" 
                              value="downpayment" 
                              checked={selectedPaymentOption === 'downpayment'} 
                              onChange={(e) => setSelectedPaymentOption(e.target.value)} 
                              className="sr-only"
                              // --- *** THIS IS THE FIX *** ---
                              // The 'disabled' attribute has been REMOVED from here.
                              // --- *** END OF FIX *** ---
                            />
                            Downpayment ({formatPrice(calculatedDownpayment)})
                          </label>
                          {/* --- MODIFIED: Added price to label and changed name --- */}
                          <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'full' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                            <input 
                              type="radio" 
                              name="paymentOptionRadio" 
                              value="full" 
                              checked={selectedPaymentOption === 'full'} 
                              onChange={(e) => setSelectedPaymentOption(e.target.value)} 
                              className="sr-only"
                            />
                            Full Payment ({formatPrice(totalPrice)})
                          </label>
                        </div>
                        {/* --- THIS IS THE WARNING MESSAGE YOU WANTED --- */}
                        {/* It will now appear when a non-logged-in user *selects* downpayment */}
                        {!user && selectedPaymentOption === 'downpayment' && (
                          <div className="mt-2 text-sm text-yellow-800 bg-yellow-100 p-3 rounded-md flex items-center gap-2">
                            <Info size={14} /> You must be logged in to make a downpayment.
                          </div>
                        )}
                      </div>
                    )}

                    {/* QR Code and Payment Inputs */}
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
                            <input type="number" step="0.01" placeholder={formatPrice(requiredPayment)} name="amountPaid" required value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })} className="w-full p-2 border rounded-md"/>
                            <p className="text-xs text-gray-500 mt-1">Please enter the exact amount: {formatPrice(requiredPayment)}</p>
                          </div>
                          <div className="flex justify-center">
                            <label htmlFor="paymentProof" className="w-3/4 text-center cursor-pointer bg-white border-2 border-dashed rounded-lg p-4 hover:bg-gray-50">
                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2"/>
                                <span className="text-sm font-medium text-gray-700">{formData.paymentProof ? formData.paymentProof.name : 'Upload Payment Proof *'}</span>
                                <input id="paymentProof" type="file" name="paymentProof" required onChange={handleFileChange} accept="image/*" className="hidden"/> {/* Added accept */}
                            </label>
                          </div>
                        </div>
                    </div>
                  </div>
                  {/* --- MODIFIED: REMOVED the 'else' block for transport quote info --- */}
                  
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
                      {/* --- MODIFIED: Show 'To' date conditionally for transport too --- */}
                      {(itemType === 'car' || itemType === 'tour' || (itemType === 'transport' && formData.transportServiceType !== 'Day Tour' && formData.transportServiceType !== 'Drop & Pick')) && (
                        <div className="flex justify-between"><span className="text-gray-600">To:</span><span className="font-medium text-right">{formatDate(calculatedEndDate)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-600">Time:</span><span className="font-medium text-right">{formatTime(formData.time)}</span></div>
                      {itemType === 'car' && (
                        <div className="flex justify-between"><span className="text-gray-600">Delivery:</span><span className="font-medium capitalize text-right">{formData.deliveryMethod === 'pickup' ? formData.pickupLocation : formData.dropoffLocation}</span></div>
                      )}
                      {(itemType === 'tour' || itemType === 'transport') && ( // Show guests/passengers
                        <div className="flex justify-between"><span className="text-gray-600">{itemType === 'tour' ? 'Guests:' : 'Passengers:'}</span><span className="font-medium text-right">{formData.numberOfGuests}</span></div>
                      )}
                       {/* --- Transport specific summary (unchanged) --- */}
                      {itemType === 'transport' && (
                         <>
                            <div className="flex justify-between"><span className="text-gray-600">Destination:</span><span className="font-medium text-right">{formData.transportDestination}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Service Type:</span><span className="font-medium text-right">{formData.transportServiceType}</span></div>
                         </>
                      )}
                      
                      {/* --- MODIFIED: Conditional Payment Info --- */}
                      <>
                          <hr className="my-2"/>
                          <div className="flex justify-between"><span className="text-gray-600">Payment Ref:</span><span className="font-medium text-right">{paymentReferenceCode}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Bank Ref:</span><span className="font-medium text-right">{formData.manualPaymentReference || 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Payment Option:</span><span className="font-medium capitalize text-right">{selectedPaymentOption}</span></div>
                      </>
                      
                      <div className="flex justify-between items-center mt-4 pt-2 border-t">
                        <span className="font-semibold text-gray-900">Total Amount:</span>
                        {/* --- MODIFIED: Handle transport price display --- */}
                        <span className="font-bold text-lg text-blue-600">{formatPrice(totalPrice)}</span>
                      </div>

                      {/* --- MODIFIED: Conditional Payment Due Display --- */}
                      {selectedPaymentOption === 'downpayment' && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Downpayment Due:</span>
                          <span className="font-bold text-lg">{formatPrice(calculatedDownpayment)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-red-600">
                        <span className="text-lg font-semibold">Amount to Pay Now:</span>
                        <span className="text-2xl font-bold">{formatPrice(requiredPayment)}</span>
                      </div>
                      
                      {selectedPaymentOption === 'downpayment' && (
                        <p className="text-xs text-gray-500 text-center pt-2">
                          The remaining balance of {formatPrice(totalPrice - requiredPayment)} will be due upon service.
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
                {/* --- THIS BUTTON'S LOGIC IS STILL CORRECT --- */}
                {/* It will be disabled if user is not logged in AND downpayment is selected */}
                <button
                  type="submit"
                  disabled={submitting || !formData.agreedToTerms || (selectedPaymentOption === 'downpayment' && !user)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
 
export default BookingModal;