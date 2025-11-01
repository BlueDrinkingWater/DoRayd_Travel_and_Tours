import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Users, Upload, CheckCircle, Shield, FileText, AlertTriangle, Tag, User as UserIcon, Mail, Phone, Home, Info, Bus, CreditCard } from 'lucide-react'; // Added CreditCard
import DataService, { SERVER_URL } from './services/DataService.jsx';
import CalendarBooking from './CalendarBooking.jsx';
import DropoffMap from './DropoffMap.jsx';
import PickupMap from './PickupMap.jsx'; 
import { useAuth } from './Login.jsx';
import { Link, useNavigate } from 'react-router-dom';

const BookingModal = ({ isOpen, onClose, item, itemType }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // const [paymentQR, setPaymentQR] = useState(''); // REMOVED
  const [paymentQRs, setPaymentQRs] = useState([]); // ADDED: To store all loaded QR codes
  const [selectedQR, setSelectedQR] = useState(null); // ADDED: To store the currently selected QR code

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

  //get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOpen) {
      const fetchContent = async () => {
        // --- MODIFIED QR CODE FETCHING ---
        try {
          setQrLoading(true);
          const qrTypes = ['paymentQR1', 'paymentQR2', 'paymentQR3', 'paymentQR4', 'paymentQR5'];
          const qrPromises = qrTypes.map(type => DataService.fetchContent(type));
          const qrResponses = await Promise.all(qrPromises);

          const loadedQRs = qrResponses
              .filter(res => res.success && res.data && res.data.content) // Only include QRs that have content (an image URL)
              .map(res => ({
                  type: res.data.type,
                  name: res.data.title, // This is the name like "GCash"
                  url: res.data.content.startsWith('http') ? res.data.content : `${SERVER_URL}${res.data.content.startsWith('/') ? '' : '/'}${res.data.content}`
              }));
          
          setPaymentQRs(loadedQRs);
          
          if (loadedQRs.length > 0) {
              setSelectedQR(loadedQRs[0]); // Select the first one by default
          }
        } catch (error) {
          console.warn('Error fetching QR codes.');
        } finally {
          setQrLoading(false);
        }
        // --- END MODIFICATION ---
        
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
  }, [isOpen]);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '',
    startDate: '', time: '', numberOfDays: 1, numberOfGuests: 1,
    specialRequests: '', agreedToTerms: false, paymentProof: null,
    pickupLocation: '', dropoffLocation: '', dropoffCoordinates: null,
    pickupCoordinates: null, 
    deliveryMethod: 'pickup', amountPaid: '', manualPaymentReference: '',
    transportDestination: '', transportServiceType: '',
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user && item?.paymentType === 'downpayment' && item?.downpaymentValue > 0) {
          setSelectedPaymentOption('downpayment');
      } else {
          setSelectedPaymentOption('full');
      }
        
      const todayStr = getTodayString();
      const initialState = {
          firstName: user?.firstName || '', lastName: user?.lastName || '',
          email: user?.email || '', phone: user?.phone || '', address: user?.address || '',
          startDate: '',
          time: '', numberOfDays: 1, numberOfGuests: 1,
          specialRequests: '', agreedToTerms: false, paymentProof: null,
          pickupLocation: '',
          dropoffLocation: '', dropoffCoordinates: null, 
          pickupCoordinates: null, 
          deliveryMethod: 'pickup',
          amountPaid: '', manualPaymentReference: '',
          transportDestination: '', transportServiceType: '',
      };

      if (itemType === 'tour' && item) {
          initialState.startDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
          initialState.time = '09:00';
      } else if (itemType === 'car') {
           initialState.startDate = todayStr;
           initialState.time = '08:00';
      } else if (itemType === 'transport') {
          initialState.startDate = todayStr;
          initialState.time = '08:00';
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

      let carPrice = formData.numberOfDays * (item?.pricePerDay || 0);

      setTotalPrice(Math.max(0, carPrice));
      
    } else if (itemType === 'tour') {
      let tourPrice = formData.numberOfGuests * (item?.price || 0);

      setTotalPrice(Math.max(0, tourPrice));
      
      setCalculatedEndDate(item.endDate ? new Date(item.endDate) : (formData.startDate ? new Date(formData.startDate) : null));
    
    } else if (itemType === 'transport') {
      let newPrice = 0;
      let newEndDate = formData.startDate ? new Date(formData.startDate) : null;
      
      if (item.pricing && formData.transportDestination && formData.transportServiceType) {
        const priceRule = item.pricing.find(p => p.destination === formData.transportDestination);
        
        if (priceRule) {
          if (newEndDate) {
            newEndDate.setHours(0, 0, 0, 0);
          }
          switch (formData.transportServiceType) {
            case 'Day Tour':
              newPrice = priceRule.dayTourPrice || 0;
              break;
            case 'Overnight':
              newPrice = priceRule.ovnPrice || 0;
              if (newEndDate) newEndDate.setDate(newEndDate.getDate() + 1);
              break;
            case '3D2N':
              newPrice = priceRule.threeDayTwoNightPrice || 0;
              if (newEndDate) newEndDate.setDate(newEndDate.getDate() + 2);
              break;
            case 'Drop & Pick':
              newPrice = priceRule.dropAndPickPrice || 0;
              break;
            default:
              newPrice = 0;
          }
        }
      }

      if (item.promotion && newPrice > 0) {
        const { discountType, discountValue } = item.promotion;
        if (discountType === 'percentage') {
          newPrice = newPrice - (newPrice * (discountValue / 100));
        } else {
          newPrice = newPrice - discountValue;
        }
      }
      
      setTotalPrice(Math.max(0, newPrice));
      setCalculatedEndDate(newEndDate);
    }
  }, [
    formData.startDate, 
    formData.numberOfDays, 
    formData.numberOfGuests, 
    item, 
    itemType, 
    formData.transportDestination,
    formData.transportServiceType
  ]);
  
  const handleFileChange = (e) => setFormData(prev => ({ ...prev, paymentProof: e.target.files[0] }));
  
  const handleLocationSelect = useCallback((location) => setFormData(prev => ({ 
    ...prev, 
    dropoffLocation: location.address, 
    dropoffCoordinates: { lat: location.latitude, lng: location.longitude } 
  })), []);
  
  const handlePickupLocationSelect = useCallback((location) => {
    setFormData(prev => ({ 
      ...prev, 
      pickupLocation: location.address, 
      pickupCoordinates: { lat: location.latitude, lng: location.longitude }
    }));
  }, []);
  
  const handleDateSelect = useCallback((date) => setFormData(prev => ({ ...prev, startDate: date })), []);
  const combineDateAndTime = (date, time) => date && time ? new Date(`${date}T${time}`).toISOString() : '';

  const calculatedDownpayment = useMemo(() => {
    if (!item || item.paymentType !== 'downpayment' || !totalPrice) return 0;
    
    if (item.downpaymentType === 'percentage') {
      const downpayment = (totalPrice * item.downpaymentValue) / 100;
      return Math.max(0, downpayment); // Ensure non-negative numbers
    }
    
    if (item.downpaymentType === 'fixed') {
       return Math.max(0, item.downpaymentValue); // Ensure non-negative numbers
    }
    
    return 0;
  }, [item, totalPrice]);

  const requiredPayment = useMemo(() => {
    if (selectedPaymentOption === 'downpayment') {
      return calculatedDownpayment;
    }
    return totalPrice;
  }, [selectedPaymentOption, calculatedDownpayment, totalPrice, itemType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (itemType === 'car' && formData.startDate && formData.numberOfDays > 0) {
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + parseInt(formData.numberOfDays, 10) - 1);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError(`Date ${dateString} is not available. Please choose another date range.`);
            }
        }
    }
    else if (itemType === 'transport' && formData.startDate && calculatedEndDate) {
        const start = new Date(formData.startDate);
        const end = new Date(calculatedEndDate); 
        end.setHours(0, 0, 0, 0);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            if (bookedDates.includes(dateString)) {
                return setSubmitError(`Date ${dateString} is not available. Please choose another date range.`);
            }
        }
    }

    const requiredBaseFields = {
      firstName: "First Name", lastName: "Last Name", email: "Email Address",
      phone: "Phone Number", address: "Address", startDate: "Start Date", time: "Time"
    };

    const requiredPaymentFields = {
      paymentProof: "Payment Proof", amountPaid: "Amount Paid"
    };

    let fieldsToCheck = {...requiredBaseFields, ...requiredPaymentFields};

    for (const field in fieldsToCheck) {
      if (!formData[field]) {
        return setSubmitError(`${fieldsToCheck[field]} is required.`);
      }
    }
    
  if (!formData.manualPaymentReference) {
        return setSubmitError("Bank Reference Number is required.");
    }
    if (itemType === 'car') {
      if (formData.deliveryMethod === 'pickup' && !formData.pickupLocation) return setSubmitError("Pickup location is required.");
      if (formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) return setSubmitError("Dropoff location is required.");
    }
    if (itemType === 'transport') {
        if (!formData.transportDestination) return setSubmitError("Destination is required for transport.");
        if (!formData.transportServiceType) return setSubmitError("Service Type is required for transport.");
        if (totalPrice <= 0 && !(formData.transportDestination && formData.transportServiceType)) { 
            return setSubmitError("Please select a valid Destination and Service Type to calculate the price.");
        }
    }
    if (!formData.agreedToTerms) return setSubmitError('You must agree to the terms to proceed.');
    
    if (parseFloat(formData.amountPaid) !== requiredPayment) {
      return setSubmitError(`The amount paid must be exactly ${formatPrice(requiredPayment)}.`);
    }
    
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
         } else if (key === 'pickupCoordinates' && formData[key]) { 
           bookingData.append(key, JSON.stringify(formData[key]));
         } else if (key !== 'manualPaymentReference' && formData[key]) {
           bookingData.append(key, formData[key]);
         }
       });
      
      const fullStartDate = combineDateAndTime(formData.startDate, formData.time);
      let fullEndDate = fullStartDate;
      
      if (itemType === 'car' && calculatedEndDate) {
          const carEndDate = new Date(formData.startDate);
          carEndDate.setDate(carEndDate.getDate() + parseInt(formData.numberOfDays, 10));
          fullEndDate = combineDateAndTime(carEndDate.toISOString().split('T')[0], formData.time);
      } else if (itemType === 'tour' && item.endDate) {
          fullEndDate = combineDateAndTime(new Date(item.endDate).toISOString().split('T')[0], formData.time);
      } else if (itemType === 'transport' && calculatedEndDate) {
          fullEndDate = combineDateAndTime(calculatedEndDate.toISOString().split('T')[0], formData.time);
      }
      
      bookingData.set('paymentReference', paymentReferenceCode);
      if (formData.manualPaymentReference.trim()) {
          bookingData.set('manualPaymentReference', formData.manualPaymentReference.trim());
      }
      bookingData.set('startDate', fullStartDate);
      bookingData.set('endDate', fullEndDate);
      bookingData.set('totalPrice', totalPrice);
      bookingData.set('itemName', itemType === 'car' ? `${item.brand} ${item.model}` : (itemType === 'tour' ? item.title : `${item.vehicleType} ${item.name || ''}`));
      bookingData.set('itemId', item._id);
      bookingData.set('itemType', itemType);
      bookingData.set('paymentOption', selectedPaymentOption);

      if (item.promotion) {
        let originalPrice = 0;
        if (itemType === 'car') {
          originalPrice = formData.numberOfDays * (item?.originalPrice || item?.pricePerDay || 0);
        } else if (itemType === 'tour') {
          originalPrice = formData.numberOfGuests * (item?.originalPrice || item?.price || 0);
        } else if (itemType === 'transport' && formData.transportDestination && formData.transportServiceType) {
          const priceRule = item.pricing.find(p => p.destination === formData.transportDestination);
          if (priceRule) {
            switch (formData.transportServiceType) {
              case 'Day Tour': originalPrice = priceRule.dayTourPrice || 0; break;
              case 'Overnight': originalPrice = priceRule.ovnPrice || 0; break;
              case '3D2N': originalPrice = priceRule.threeDayTwoNightPrice || 0; break;
              case 'Drop & Pick': originalPrice = priceRule.dropAndPickPrice || 0; break;
            }
          }
        }
        
        const discountApplied = originalPrice - totalPrice;
        bookingData.set('originalPrice', originalPrice.toString());
        bookingData.set('discountApplied', discountApplied.toString());
        bookingData.set('promotionTitle', item.promotion.title);
      }

      bookingData.set('amountPaid', requiredPayment.toString());

      const result = await DataService.createBooking(bookingData);
      if (result.success) {
        setSubmitSuccess(true);
        if (user) {
          setTimeout(() => {
            onClose();
            navigate('/my-bookings');
          }, 2000);
        } else {
             setTimeout(() => {
                onClose(); 
             }, 3000); 
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
  const formatDate = (date) => date ? new Date(date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  if (!isOpen) return null;

  // ADDED: Handler for changing the selected QR code
  const handleQRSelectChange = (e) => {
    const selectedType = e.target.value;
    const newSelectedQR = paymentQRs.find(qr => qr.type === selectedType);
    if (newSelectedQR) {
        setSelectedQR(newSelectedQR);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
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
              <h3 className="text-2xl font-bold">Booking Submitted!</h3>
              <p className="text-gray-600 mt-2">
                You will receive a confirmation email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {submitError && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2"><AlertTriangle size={16}/> {submitError}</div>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* User Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="firstName" placeholder="First Name" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value.replace(/[0-9]/g, '') })} className="w-full p-2 pl-10 border rounded-md"/></div>
                        <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="text" name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value.replace(/[0-9]/g, '') })} className="w-full p-2 pl-10 border rounded-md"/></div>
                        <div className="md:col-span-2 relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 pl-10 border rounded-md"/></div>
                        <div className="md:col-span-2 relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input type="tel" name="phone" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+]/g, '') })} placeholder="Phone Number" className="w-full p-2 pl-10 border rounded-md"/></div>
                        <div className="md:col-span-2 relative"><Home className="absolute left-3 top-4 -translate-y-1/2 text-gray-400" size={16}/><textarea name="address" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full Address" className="w-full p-2 pl-10 border rounded-md" rows="2"></textarea></div>
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
                        <p className="text-sm text-blue-700">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
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

                      {/* Delivery Method with Maps */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Delivery Method</h3>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })} className="mr-2"/> Pickup</label>
                          <label className="flex items-center"><input type="radio" name="deliveryMethod" value="dropoff" checked={formData.deliveryMethod === 'dropoff'} onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })} className="mr-2"/> Drop-off</label>
                        </div>
                        {formData.deliveryMethod === 'pickup' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                            <PickupMap onLocationSelect={handlePickupLocationSelect} />
                            {formData.pickupLocation && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                <strong>Selected:</strong> {formData.pickupLocation}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Location *</label>
                            <DropoffMap onLocationSelect={handleLocationSelect} />
                            {formData.dropoffLocation && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                <strong>Selected:</strong> {formData.dropoffLocation}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {itemType === 'transport' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-3">Booking Details</h3>
                      
                      <CalendarBooking
                        serviceId={item._id}
                        onDateSelect={handleDateSelect}
                        initialDate={formData.startDate}
                        onBookedDatesChange={setBookedDates}
                      />
                      
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Passengers *</label>
                          <select value={formData.numberOfGuests} onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) })} className="w-full p-2 border rounded-md">
                            {(() => {
                                const maxGuests = parseInt(item.capacity, 10) || 10;
                                return Array.from({ length: maxGuests }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1} {i > 0 ? 'passengers' : 'passenger'}</option>
                                ));
                            })()}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
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

                  {/* Special Requests  */}
                   <div className="bg-gray-50 p-4 rounded-lg">
                       <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
                       <textarea id="specialRequests" name="specialRequests" value={formData.specialRequests} onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })} rows="3" className="w-full p-2 border rounded-md" placeholder="Any special requirements or notes..."></textarea>
                   </div>

                </div>

                <div className="space-y-6">
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
                          <label className={`flex-1 p-3 border rounded-lg text-center cursor-pointer ${selectedPaymentOption === 'downpayment' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                            <input 
                              type="radio" 
                              name="paymentOptionRadio" 
                              value="downpayment" 
                              checked={selectedPaymentOption === 'downpayment'} 
                              onChange={(e) => setSelectedPaymentOption(e.target.value)} 
                              className="sr-only"
                            />
                            Downpayment ({formatPrice(calculatedDownpayment)})
                          </label>
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
                        {!user && selectedPaymentOption === 'downpayment' && (
                          <div className="mt-2 text-sm text-yellow-800 bg-yellow-100 p-3 rounded-md flex items-center gap-2">
                            <Info size={14} /> You must be logged in to make a downpayment.
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- MODIFIED QR CODE DISPLAY --- */}
                    <div className="flex flex-col items-center">
                        {qrLoading ? (
                            <p>Loading QR...</p>
                        ) : paymentQRs.length > 0 && selectedQR ? (
                            <div className="w-full">
                                {paymentQRs.length > 1 && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Payment Method</label>
                                        <select
                                            value={selectedQR.type}
                                            onChange={handleQRSelectChange}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            {paymentQRs.map(qr => (
                                                <option key={qr.type} value={qr.type}>{qr.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex justify-center">
                                    <img 
                                        src={selectedQR.url} 
                                        alt={selectedQR.name} 
                                        className="w-48 h-48 object-contain mb-4 border rounded-md" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600 mb-4">Payment QR code not available.</p>
                        )}
                        {/* --- END MODIFICATION --- */}

                        <div className="w-full space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Your Payment Reference Code *</label>
                            <input type="text" readOnly value={paymentReferenceCode} className="w-full p-2 border rounded-md bg-gray-100 font-bold text-center text-lg tracking-wider" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Or Enter Your Bank Reference Number</label>
                            <input type="text" name="manualPaymentReference" value={formData.manualPaymentReference} onChange={(e) => setFormData({ ...formData, manualPaymentReference: e.target.value })} className="w-full p-2 border rounded-md" placeholder="Enter bank reference number" required />
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
                                <input id="paymentProof" type="file" name="paymentProof" required onChange={handleFileChange} accept="image/*" className="hidden"/>
                            </label>
                          </div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-medium text-right">{formData.firstName} {formData.lastName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Address:</span><span className="font-medium text-right">{formData.address}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Email:</span><span className="font-medium text-right">{formData.email}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span className="font-medium text-right">{formData.phone}</span></div>
                      
                      <hr className="my-2"/>

                      <div className="flex justify-between"><span className="text-gray-600">From:</span><span className="font-medium text-right">{formatDate(formData.startDate)}</span></div>
                      {(itemType === 'car' || itemType === 'tour' || (itemType === 'transport' && formData.transportServiceType !== 'Day Tour' && formData.transportServiceType !== 'Drop & Pick')) && (
                        <div className="flex justify-between"><span className="text-gray-600">To:</span><span className="font-medium text-right">{formatDate(calculatedEndDate)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-600">Time:</span><span className="font-medium text-right">{formatTime(formData.time)}</span></div>
                      {itemType === 'car' && (
                        <div className="flex justify-between"><span className="text-gray-600">Delivery:</span><span className="font-medium capitalize text-right">{formData.deliveryMethod === 'pickup' ? `Pickup at ${formData.pickupLocation || 'Selected Location'}` : `Drop-off at ${formData.dropoffLocation || 'Selected Location'}`}</span></div>
                      )}
                      {(itemType === 'tour' || itemType === 'transport') && (
                        <div className="flex justify-between"><span className="text-gray-600">{itemType === 'tour' ? 'Guests:' : 'Passengers:'}</span><span className="font-medium text-right">{formData.numberOfGuests}</span></div>
                      )}
                      {itemType === 'transport' && (
                         <>
                            <div className="flex justify-between"><span className="text-gray-600">Destination:</span><span className="font-medium text-right">{formData.transportDestination}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Service Type:</span><span className="font-medium text-right">{formData.transportServiceType}</span></div>
                         </>
                      )}
                      
                      <>
                          <hr className="my-2"/>
                          <div className="flex justify-between"><span className="text-gray-600">Payment Ref:</span><span className="font-medium text-right">{paymentReferenceCode}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Bank Ref:</span><span className="font-medium text-right">{formData.manualPaymentReference || 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Payment Option:</span><span className="font-medium capitalize text-right">{selectedPaymentOption}</span></div>
                      </>
                      
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