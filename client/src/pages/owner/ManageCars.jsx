import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Archive, Eye, EyeOff, Search, Car, Users, Fuel, Settings2, X, MapPin, RotateCcw, DollarSign, Percent, Info, Trash } from 'lucide-react';
import DataService, { getImageUrl } from '../../components/services/DataService';
import ImageUpload from '../../components/ImageUpload';
import { useApi } from '../../hooks/useApi';
import { toast } from 'react-toastify';

const ManageCars = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const { data: carsData, loading, refetch: fetchCars } = useApi(
    () => {
        const params = {};
        if (filterStatus === 'archived') {
            params.archived = true;
        } else if (filterStatus === 'all') {
            params.includeArchived = true;
        } else {
            params.archived = false;
        }
        return DataService.fetchAllCars(params);
    },
    [filterStatus]
  );

  const cars = carsData?.data || [];

  const initialFormState = {
    brand: '', model: '', year: new Date().getFullYear(), seats: 5,
    transmission: 'automatic', fuelType: 'gasoline', pricePerDay: '',
    location: '', description: '', features: [], images: [],
    isAvailable: true,
    // Removed pickupLocations - customers now select pickup via map in booking modal
    paymentType: 'full',
    downpaymentType: 'percentage',
    downpaymentValue: 20,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newFeature, setNewFeature] = useState('');

  const resetForm = () => {
    setFormData(initialFormState);
    setNewFeature('');
    setEditingCar(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'pricePerDay') {
      if (value === '' || /^[0-9]*(\.[0-9]*)?$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentTypeChange = (e) => {
     const { value } = e.target;
      setFormData(prev => ({
        ...prev,
        paymentType: value,
        downpaymentType: value === 'full' ? prev.downpaymentType : (prev.downpaymentType || 'percentage'),
        downpaymentValue: value === 'full' ? '' : prev.downpaymentValue,
      }));
  };

   const handleImageUploadChange = (uploadedImages) => {
     setFormData(prev => ({ ...prev, images: uploadedImages }));
   };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({ ...prev, features: [...(Array.isArray(prev.features) ? prev.features : []), newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

     if (formData.paymentType === 'downpayment') {
        if (!formData.downpaymentType || !formData.downpaymentValue || parseFloat(formData.downpaymentValue) <= 0) {
            toast.error('Downpayment Type and a positive Value are required when downpayment is enabled.');
            setSubmitting(false);
            return;
        }
        if (formData.downpaymentType === 'percentage' && (parseFloat(formData.downpaymentValue) < 1 || parseFloat(formData.downpaymentValue) > 99)) {
            toast.error('Percentage must be between 1 and 99.');
            setSubmitting(false);
            return;
        }
    }

     const simplePayload = { ...formData };

     if (simplePayload.images && Array.isArray(simplePayload.images)) {
         simplePayload.images = simplePayload.images.map(img => (typeof img === 'string' ? img : img.url)).filter(Boolean);
     }

     if (typeof simplePayload.features === 'string') {
        simplePayload.features = simplePayload.features.split(',').map(s => s.trim()).filter(Boolean);
     } else if (!Array.isArray(simplePayload.features)) {
        simplePayload.features = [];
     }

     if (simplePayload.paymentType === 'full') {
         delete simplePayload.downpaymentType;
         delete simplePayload.downpaymentValue;
     }

    try {
      if (editingCar) {
        await DataService.updateCar(editingCar._id, simplePayload);
        toast.success('Car updated successfully!');
      } else {
        await DataService.createCar(simplePayload);
        toast.success('Car created successfully!');
      }
      setShowModal(false);
      fetchCars();
    } catch (error) {
      console.error('Error saving car:', error);
      toast.error(`Failed to save car: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);

    const processedImages = Array.isArray(car.images)
      ? car.images.map((img, index) => {
          if (typeof img === 'string') {
            return {
              url: img,
              serverId: img.split('/').pop() || `img-${index}`,
              name: img.split('/').pop() || 'image.jpg',
            };
          } else if (img && img.url) {
            return { ...img, serverId: img.serverId || img.url.split('/').pop() || `img-${index}` };
          }
          return null;
        }).filter(Boolean)
      : [];

    setFormData({
      ...initialFormState,
      ...car,
      images: processedImages,
      paymentType: car.paymentType || 'full',
      downpaymentType: car.downpaymentType || 'percentage',
      downpaymentValue: car.downpaymentValue || (car.paymentType === 'downpayment' ? 20 : ''),
      features: Array.isArray(car.features) ? car.features : (car.features ? String(car.features).split(',').map(f => f.trim()).filter(Boolean) : []),
    });
    setShowModal(true);
  };

  const handleArchive = async (carId, carName) => {
    if (window.confirm(`Are you sure you want to archive this car (${carName})?`)) {
      try {
        await DataService.archiveCar(carId);
        toast.success('Car archived successfully!');
        fetchCars();
      } catch (error) {
        toast.error('Failed to archive car.');
      }
    }
  };

  const handleRestore = async (carId, carName) => {
    if (window.confirm(`Are you sure you want to restore this car (${carName})?`)) {
      try {
        await DataService.unarchiveCar(carId);
        toast.success('Car restored successfully!');
        fetchCars();
      } catch (error) {
        toast.error('Failed to restore car.');
      }
    }
  };

const handleDelete = async (carId, carName) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE (${carName})? This action cannot be undone and will fail if there are active bookings.`)) {
      try {
        await DataService.deleteCar(carId);
        toast.success('Car permanently deleted!');
        fetchCars();
      } catch (error) {
        console.error('Failed to delete car:', error);
        
        // This is the important part: it reads the message from the server
        const errorMessage = error.response?.data?.message || `Failed to delete car: ${error.message || 'Server error'}`;
        
        toast.error(errorMessage); // This will show the "Cannot delete car..." message
      }
    }
  };

  const handleToggleAvailability = async (car) => {
    const action = car.isAvailable ? 'unavailable' : 'available';
    if (window.confirm(`Are you sure you want to mark this car (${car.brand} ${car.model}) as ${action}?`)) {
      try {
        await DataService.updateCar(car._id, { isAvailable: !car.isAvailable });
        toast.success(`Car marked as ${action}.`);
        fetchCars();
      } catch (error) {
        toast.error('Failed to toggle availability.');
      }
    }
  };

  const filteredCars = Array.isArray(cars) ? cars.filter(car => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = (
      car.brand?.toLowerCase().includes(lowerSearchTerm) ||
      car.model?.toLowerCase().includes(lowerSearchTerm) ||
      car.location?.toLowerCase().includes(lowerSearchTerm)
    );
    return matchesSearch;
  }) : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 text-white">
        <div>
          <h1 className="text-3xl font-bold text-white-900">Manage Cars</h1>
          <p className="text-white-600">Add, edit, and manage your car fleet</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Car
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by brand, model, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active Cars</option>
              <option value="archived">Archived Cars</option>
              <option value="all">All Cars</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.length > 0 ? filteredCars.map((car) => (
            <div key={car._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-opacity ${car.archived ? 'opacity-60' : ''}`}>
              <div className="h-48 bg-gray-200 relative">
                <img
                  src={car.images && car.images.length > 0 ? getImageUrl(car.images[0]) : 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {car.archived ? (
                    <>
                      <button onClick={() => handleRestore(car._id, `${car.brand} ${car.model}`)} className="p-2 bg-white rounded-full shadow-md" title="Restore Car"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                      <button onClick={() => handleDelete(car._id, `${car.brand} ${car.model}`)} className="p-2 bg-white rounded-full shadow-md" title="PERMANENTLY DELETE"><Trash className="w-4 h-4 text-red-700" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(car)} className="p-2 bg-white rounded-full shadow-md" title="Edit Car"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleAvailability(car)} className="p-2 bg-white rounded-full shadow-md" title={car.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{car.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleArchive(car._id, `${car.brand} ${car.model}`)} className="p-2 bg-white rounded-full shadow-md" title="Archive Car"><Archive className="w-4 h-4 text-red-600" /></button>
                    </>
                  )}
                </div>
                 <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${car.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {car.isAvailable ? 'Available' : 'Unavailable'}
                 </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{car.brand} {car.model} ({car.year})</h3>
                <p className="text-2xl font-bold text-blue-600">₱{car.pricePerDay?.toLocaleString()}/day</p>
                <p className="text-sm text-gray-500">{car.location}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No cars found.</h3>
              <p className="text-gray-500">
                {searchTerm ? `No cars match "${searchTerm}". ` : ''}
                {`There are no ${filterStatus} cars.`}
              </p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingCar ? 'Edit Car' : 'Add New Car'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form id="carForm" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-6 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label><input type="text" name="brand" required value={formData.brand} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Toyota, Honda, etc." /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Model *</label><input type="text" name="model" required value={formData.model} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Camry, Civic, etc." /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Year *</label><input type="number" name="year" required min="1990" max={new Date().getFullYear() + 1} value={formData.year} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Seats *</label><select name="seats" required value={formData.seats} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">{[2, 4, 5, 6, 7, 8, 9, 12, 15].map(num => (<option key={num} value={num}>{num} seats</option>))}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Transmission *</label><select name="transmission" required value={formData.transmission} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white"><option value="automatic">Automatic</option><option value="manual">Manual</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type *</label><select name="fuelType" required value={formData.fuelType} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white"><option value="gasoline">Gasoline</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Location *</label><input type="text" name="location" required value={formData.location} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Manila, Cebu, etc." /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Day (₱) *</label>
                        <input type="text" name="pricePerDay" required value={formData.pricePerDay} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="2500.00" inputMode="decimal" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                        <select name="isAvailable" value={formData.isAvailable ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({...prev, isAvailable: e.target.value === 'true'}))} className="w-full p-2 border rounded-lg bg-white">
                            <option value="true">Available</option>
                            <option value="false">Unavailable</option>
                        </select>
                     </div>
                </div>

                 {/* Payment Configuration */}
                 <div className="border p-4 rounded-md bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><DollarSign size={18}/> Payment Options</h3>
                    <div className="flex gap-6 mb-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" name="paymentType" value="full" checked={formData.paymentType === 'full'} onChange={handlePaymentTypeChange} className="mr-2"/>
                            Full Payment Only
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" name="paymentType" value="downpayment" checked={formData.paymentType === 'downpayment'} onChange={handlePaymentTypeChange} className="mr-2"/>
                            Allow Downpayment
                        </label>
                    </div>

                    {formData.paymentType === 'downpayment' && (
                        <div className="border-t pt-4 space-y-3 animate-in fade-in duration-300">
                            <p className="text-sm text-gray-600">Configure Downpayment:</p>
                            <div className="flex gap-6 mb-2">
                               <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="downpaymentType" value="percentage" checked={formData.downpaymentType === 'percentage'} onChange={handleInputChange} className="mr-2"/>
                                    Percentage (%)
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="downpaymentType" value="fixed" checked={formData.downpaymentType === 'fixed'} onChange={handleInputChange} className="mr-2"/>
                                    Fixed Amount (₱)
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {formData.downpaymentType === 'percentage' ? 'Percentage Value (1-99)' : 'Fixed Amount (PHP)'} *
                                </label>
                                 <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                                        {formData.downpaymentType === 'percentage' ? '%' : '₱'}
                                    </span>
                                    <input
                                        name="downpaymentValue"
                                        type="number"
                                        step={formData.downpaymentType === 'percentage' ? "1" : "0.01"}
                                        min="1"
                                        max={formData.downpaymentType === 'percentage' ? "99" : undefined}
                                        value={formData.downpaymentValue}
                                        onChange={handleInputChange}
                                        placeholder={formData.downpaymentType === 'percentage' ? 'e.g., 20' : 'e.g., 1000'}
                                        className="p-2 pl-7 border rounded w-full md:w-1/2"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={12}/> {formData.downpaymentType === 'fixed' ? 'This amount will be multiplied by the number of rental days.' : 'This percentage will be calculated based on the total booking price.'} </p>
                            </div>
                        </div>
                    )}
                 </div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" rows="4" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Describe the car features, condition, etc." /></div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={newFeature} 
                      onChange={(e) => setNewFeature(e.target.value)} 
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" 
                      placeholder="Add a feature (e.g., Air Conditioning)" 
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())} 
                    />
                    <button type="button" onClick={addFeature} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                  {Array.isArray(formData.features) && formData.features.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {formData.features.map((feature, index) => (
                          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {feature}
                            <button type="button" onClick={() => removeFeature(index)} className="text-blue-600 hover:text-blue-800">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images (First image is main)</label>
                  <ImageUpload
                    onImagesChange={handleImageUploadChange}
                    existingImages={formData.images}
                    maxImages={5}
                    category="cars"
                  />
                </div>
            </form>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button type="submit" form="carForm" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{editingCar ? 'Updating...' : 'Creating...'}</>) : (editingCar ? 'Update Car' : 'Create Car')}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCars;