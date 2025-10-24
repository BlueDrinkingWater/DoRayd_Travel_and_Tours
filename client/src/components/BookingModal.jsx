// client/src/components/BookingModal.jsx
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Car, MapPin, Calendar, Users, CreditCard, DollarSign, Info, Upload, CheckCircle, Clock, Smartphone, Mail, Map, Bus } from 'lucide-react'; // <-- Imported Bus
import { useAuth } from './Login';
import DataService, { getImageUrl } from './services/DataService';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import CalendarBooking from './CalendarBooking';

// Helper to format currency
const formatPrice = (price) => {
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
  const [pricePerDay, setPricePerDay] = useState(0);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [bookingFee, setBookingFee] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDays, setTotalDays] = useState(1);
  const [paymentProof, setPaymentProof] = useState(null);
  
  const [formData, setFormData] = useState({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    deliveryMethod: 'pickup',
    dropoffLocation: '',
    pickupLocation: 'Do Rayd Office',
    numberOfGuests: 1,
    paymentOption: 'downpayment', // 'downpayment' or 'full'
    specialRequests: '',
    // <-- NEW FIELDS FOR TRANSPORT -->
    destination: '',
    serviceType: '',
  });

  // Fetch promotions
  const { data: promotionsData } = useApi(DataService.fetchAllPromotions);
  const promotions = promotionsData?.data || [];
  
  // Get availability
  const { data: availabilityData } = useApi(() => DataService.getAvailability(item._id), [item._id]);
  const bookedDates = availabilityData?.data?.bookedDates || [];

  // 1. Set item name and price based on itemType
  useEffect(() => {
    if (item) {
      if (itemType === 'car') {
        setItemName(item.name);
        setPricePerDay(item.pricePerDay || 0);
      } else if (itemType === 'tour') {
        setItemName(item.title);
        setPricePerDay(item.price || 0);
      } else if (itemType === 'transport') {
        // <-- ADDED TRANSPORT CASE -->
        setItemName(item.vehicleType);
        setPricePerDay(0); // Price is not calculated per day
      }
    }
  }, [item, itemType]);

  // 2. Calculate price when dates or item changes
  useEffect(() => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    // Ensure start date is before end date for calcs
    if (start >= end) {
      setTotalDays(0);
      setCalculatedPrice(0);
      setTotalPrice(0);
      setBookingFee(0);
      return;
    }

    // Calculate diff in days
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setTotalDays(diffDays);

    // <-- UPDATED PRICE CALCULATION -->
    if (itemType === 'car') {
      const subtotal = pricePerDay * diffDays;
      const fee = subtotal * 0.05; // 5% booking fee for cars
      setCalculatedPrice(subtotal);
      setBookingFee(fee);
      setTotalPrice(subtotal + fee);
    } else if (itemType === 'tour') {
      const subtotal = (pricePerDay || 0) * formData.numberOfGuests;
      const fee = subtotal * 0.05; // 5% booking fee for tours
      setCalculatedPrice(subtotal);
      setBookingFee(fee);
      setTotalPrice(subtotal + fee);
    } else if (itemType === 'transport') {
      // For transport, price is determined by admin
      setCalculatedPrice(0);
      setBookingFee(0);
      setTotalPrice(0);
    }
    // <-- END UPDATED PRICE CALCULATION -->

  }, [formData.startDate, formData.endDate, formData.numberOfGuests, itemType, pricePerDay]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setPaymentProof(files[0]);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = ({ startDate, endDate }) => {
    setFormData(prev => ({
      ...prev,
      startDate: startDate,
      endDate: endDate || new Date(new Date(startDate).setDate(startDate.getDate() + 1)),
    }));
  };

  const resetForm = () => {
    setStep(1);
    setSubmitting(false);
    setError('');
    setSuccess(false);
    setPaymentProof(null);
    setFormData({
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      deliveryMethod: 'pickup',
      dropoffLocation: '',
      pickupLocation: 'Do Rayd Office',
      numberOfGuests: 1,
      paymentOption: 'downpayment',
      specialRequests: '',
      destination: '', // <-- RESET TRANSPORT FIELD
      serviceType: '', // <-- RESET TRANSPORT FIELD
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('You must be logged in to make a booking.');
      return;
    }
    
    // Final validation before step 3
    if (step === 2) {
       if (itemType === 'car' && formData.deliveryMethod === 'dropoff' && !formData.dropoffLocation) {
        setError('Please provide a drop-off location.');
        return;
      }
      if (itemType === 'transport' && (!formData.destination || !formData.serviceType)) {
         setError('Please provide a destination and service type.');
         return;
      }
      setError('');
      setStep(3); // Move to payment
      return;
    }

    if (step === 3) {
      if (formData.paymentOption === 'downpayment' && !paymentProof) {
        setError('Payment proof is required for downpayment.');
        return;
      }

      setSubmitting(true);
      setError('');
      
      // <-- PREPARE SPECIAL REQUESTS FOR TRANSPORT -->
      let finalSpecialRequests = formData.specialRequests;
      if (itemType === 'transport') {
        finalSpecialRequests = `Destination: ${formData.destination}\nService Type: ${formData.serviceType}\n\n${formData.specialRequests || ''}`;
      }
      
      const bookingData = new FormData();
      bookingData.append('itemId', item._id);
      bookingData.append('itemType', itemType);
      bookingData.append('itemName', itemName);
      bookingData.append('startDate', formData.startDate.toISOString());
      bookingData.append('endDate', formData.endDate.toISOString());
      bookingData.append('totalPrice', totalPrice); // Will be 0 for transport
      bookingData.append('paymentOption', formData.paymentOption);
      bookingData.append('specialRequests', finalSpecialRequests);
      
      if (paymentProof) {
        bookingData.append('paymentProof', paymentProof);
      }
      
      // Add item-specific data
      if (itemType === 'car') {
        bookingData.append('deliveryMethod', formData.deliveryMethod);
        if (formData.deliveryMethod === 'dropoff') {
          bookingData.append('dropoffLocation', formData.dropoffLocation);
        } else {
          bookingData.append('pickupLocation', formData.pickupLocation);
        }
      } 
      
      // <-- MODIFIED: Add guests for tour OR transport -->
      if (itemType !== 'car') {
        bookingData.append('numberOfGuests', formData.numberOfGuests);
      }
      
      try {
        const result = await DataService.createBooking(bookingData);
        if (result.success) {
          setSuccess(true);
        } else {
          setError(result.message || 'Booking failed. Please try again.');
        }
      } catch (err) {
        setError(err.message || 'An error occurred.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const renderStep = () => {
    if (success) {
      return (
        <div className="text-center p-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900">Booking Submitted!</h3>
          <p className="text-gray-600 mt-2">
            Your booking request has been received. Our team will review it and contact you shortly for confirmation.
          </p>
          <button
            onClick={() => navigate('/my-bookings')}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            View My Bookings
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              {/* <-- UPDATED ICON LOGIC --> */}
              {itemType === 'car' ? <Car className="w-6 h-6 text-blue-600" /> : 
               itemType === 'tour' ? <MapPin className="w-6 h-6 text-blue-600" /> :
               <Bus className="w-6 h-6 text-blue-600" />}
            </span>
            <div>
              <Dialog.Title className="text-xl font-bold text-gray-900">Book: {itemName}</Dialog.Title>
              {itemType === 'car' && <p className="text-sm text-gray-500">{item.make} {item.model} ({item.year})</p>}
              {itemType === 'tour' && <p className="text-sm text-gray-500">{item.duration} | {item.location}</p>}
              {itemType === 'transport' && <p className="text-sm text-gray-500">{item.capacity} Capacity</p>}
            </div>
          </div>
          
          {error && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          
          {/* Step 1: Dates */}
          <Transition
            show={step === 1}
            as={Fragment}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Step 1: Select Your Dates</h4>
              <p className="text-sm text-gray-600">Choose your start and end dates. <strong className="text-red-500">Red dates are unavailable.</strong></p>
              <CalendarBooking
                bookedDates={bookedDates}
                startDate={formData.startDate}
                endDate={formData.endDate}
                onDateChange={handleDateChange}
                allowRange={itemType === 'car'} // Only cars allow date ranges
                allowSingle={itemType !== 'car'} // Tours/Transport are single-day events (backend handles duration)
              />
               {/* Show date summary */}
              {formData.startDate && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                      <p><strong>Start:</strong> {formData.startDate.toLocaleDateString()}</p>
                      {itemType === 'car' && formData.endDate && <p><strong>End:</strong> {formData.endDate.toLocaleDateString()}</p>}
                  </div>
              )}
            </div>
          </Transition>

          {/* Step 2: Details */}
          <Transition
            show={step === 2}
            as={Fragment}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Step 2: Provide Details</h4>
              {/* Car Specific Fields */}
              {itemType === 'car' && (
                <>
                  <div>
                    <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700">Delivery Method</label>
                    <select name="deliveryMethod" id="deliveryMethod" value={formData.deliveryMethod} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                      <option value="pickup">Pick-up at Office</option>
                      <option value="dropoff">Drop-off at Location</option>
                    </select>
                  </div>
                  {formData.deliveryMethod === 'dropoff' && (
                    <div>
                      <label htmlFor="dropoffLocation" className="block text-sm font-medium text-gray-700">Drop-off Location</label>
                      <input type="text" name="dropoffLocation" id="dropoffLocation" value={formData.dropoffLocation} onChange={handleInputChange} required placeholder="Enter full address" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                  )}
                </>
              )}
              
              {/* <-- MODIFIED: Show for Tour AND Transport --> */}
              {itemType !== 'car' && (
                <div>
                  <label htmlFor="numberOfGuests" className="block text-sm font-medium text-gray-700">Number of Guests / Passengers</label>
                  <input
                    type="number"
                    name="numberOfGuests"
                    id="numberOfGuests"
                    value={formData.numberOfGuests}
                    onChange={handleInputChange}
                    min="1"
                    max={itemType === 'tour' ? item.maxGuests : 100} // Use maxGuests for tour
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              )}
              
              {/* <-- NEW: Transport Specific Fields --> */}
              {itemType === 'transport' && (
                  <>
                    <div>
                      <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destination <span className="text-red-500">*</span></label>
                      <input type="text" name="destination" id="destination" value={formData.destination} onChange={handleInputChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Baguio City" />
                    </div>
                    <div>
                      <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Service Type <span className="text-red-500">*</span></label>
                      <select name="serviceType" id="serviceType" value={formData.serviceType} onChange={handleInputChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                        <option value="">Select service type...</option>
                        <option value="Day Tour">Day Tour</option>
                        <option value="Overnight">Overnight</option>
                        <option value="3D2N">3 Days, 2 Nights</option>
                        <option value="Drop & Pick">Drop & Pick</option>
                        <option value="Other">Other (Specify in requests)</option>
                      </select>
                    </div>
                  </>
              )}
              {/* <-- END: Transport Specific Fields --> */}

              <div>
                <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700">Special Requests (Optional)</label>
                <textarea name="specialRequests" id="specialRequests" value={formData.specialRequests} onChange={handleInputChange} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Child seat, specific pick-up time..."></textarea>
              </div>
            </div>
          </Transition>
          
          {/* Step 3: Payment */}
          <Transition
            show={step === 3}
            as={Fragment}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Step 3: Confirm & Pay</h4>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h5 className="font-semibold text-gray-900 mb-3">Booking Summary</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">User:</span> <span className="font-medium">{user?.firstName} {user?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Email:</span> <span className="font-medium">{user?.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Item:</span> <span className="font-medium">{itemName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Start Date:</span> <span className="font-medium">{formData.startDate.toLocaleDateString()}</span></div>
                  {itemType === 'car' && <div className="flex justify-between"><span className="text-gray-600">End Date:</span> <span className="font-medium">{formData.endDate.toLocaleDateString()}</span></div>}
                  {itemType === 'car' && <div className="flex justify-between"><span className="text-gray-600">Total Days:</span> <span className="font-medium">{totalDays}</span></div>}
                  {itemType !== 'car' && <div className="flex justify-between"><span className="text-gray-600">Guests:</span> <span className="font-medium">{formData.numberOfGuests}</span></div>}
                  {itemType === 'transport' && <div className="flex justify-between"><span className="text-gray-600">Destination:</span> <span className="font-medium">{formData.destination}</span></div>}
                </div>
              </div>

              {/* Price Details */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-gray-900 mb-3">Price Details</h5>
                
                {/* <-- UPDATED PRICE DISPLAY LOGIC --> */}
                {itemType === 'transport' ? (
                  <p className="text-center text-gray-700 font-medium p-3">
                    The total price will be confirmed by our staff based on your destination and service type.
                    <br />
                    <span className="text-sm">You may be required to make a downpayment upon confirmation.</span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{itemType === 'car' ? 'Subtotal' : 'Base Price'}:</span>
                      <span className="font-medium">{formatPrice(calculatedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Booking Fee (5%):</span>
                      <span className="font-medium">{formatPrice(bookingFee)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                      <span>Total Price:</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                )}
                {/* <-- END UPDATED PRICE DISPLAY LOGIC --> */}

              </div>

              {/* Payment Options (Hide for Transport since price is 0) */}
              {itemType !== 'transport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Option</label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center p-3 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                      <input type="radio" name="paymentOption" value="downpayment" checked={formData.paymentOption === 'downpayment'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300"/>
                      <span className="ml-3 block text-sm">
                        <span className="font-medium text-gray-900">Pay 50% Downpayment Now</span>
                        <span className="block text-gray-500">Pay {formatPrice(totalPrice * 0.5)} now. The rest is due upon confirmation or pick-up.</span>
                      </span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                      <input type="radio" name="paymentOption" value="full" checked={formData.paymentOption === 'full'} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300"/>
                      <span className="ml-3 block text-sm">
                        <span className="font-medium text-gray-900">Pay in Full Now</span>
                        <span className="block text-gray-500">Pay {formatPrice(totalPrice)} now and complete your booking.</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Payment Instructions (Show if not transport) */}
              {(formData.paymentOption === 'downpayment' || formData.paymentOption === 'full') && itemType !== 'transport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload Payment Proof</label>
                  <p className="text-xs text-gray-500 mb-2">Please pay via GCash/Bank Transfer and upload a screenshot of your payment.</p>
                   {promotions.find(p => p.type === 'payment') && (
                       <div className="bg-white p-3 border rounded-lg mb-2">
                           <img src={getImageUrl(promotions.find(p => p.type === 'payment').image)} alt="Payment QR" className="max-w-xs mx-auto" />
                       </div>
                   )}
                  <input
                    type="file"
                    name="paymentProof"
                    onChange={handleInputChange}
                    accept="image/*"
                    required={formData.paymentOption === 'downpayment'}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {paymentProof && <span className="text-xs text-green-600 italic">File selected: {paymentProof.name}</span>}
                </div>
              )}
              
            </div>
          </Transition>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              {step > 1 && !success && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Back
                </button>
              )}
            </div>
            <div>
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (itemType === 'car' && !formData.endDate) {
                      setError("Please select an end date.");
                    } else if (!formData.startDate) {
                      setError("Please select a start date.");
                    } else {
                      setError('');
                      setStep(2);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Next: Details
                </button>
              )}
              {step === 2 && (
                <button
                  type="submit" // This is a submit button, it will run handleSubmit
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Next: Payment
                </button>
              )}
              {step === 3 && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Submitting...' : 'Confirm & Book Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    );
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all flex flex-col max-h-[90vh]">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20"
                >
                  <X size={24} />
                </button>
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