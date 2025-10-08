import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Archive, Eye, EyeOff, Search, Car, Users, Fuel, Settings2, X, MapPin, RotateCcw } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService';
import ImageUpload from '../../components/ImageUpload';
import { useApi } from '../../hooks/useApi';

const ManageCars = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const { data: carsData, loading, refetch: fetchCars } = useApi(() => DataService.fetchAllCars({ archived: filterStatus === 'archived' }), [filterStatus]);
  const cars = carsData?.data || [];
  
  const initialFormState = {
    brand: '', model: '', year: new Date().getFullYear(), seats: 5,
    transmission: 'automatic', fuelType: 'gasoline', pricePerDay: '',
    location: '', description: '', features: [], images: [],
    isAvailable: true,
    pickupLocations: []
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newFeature, setNewFeature] = useState('');
  const [newPickupLocation, setNewPickupLocation] = useState('');

  const resetForm = () => {
    setFormData(initialFormState);
    setNewFeature('');
    setNewPickupLocation('');
    setEditingCar(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (uploadedImages) => {
    setFormData(prev => ({ ...prev, images: uploadedImages.map(img => ({ url: img.url, serverId: img.serverId })) }));
  };
  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  const addPickupLocation = () => {
    if (newPickupLocation.trim()) {
      setFormData(prev => ({ ...prev, pickupLocations: [...prev.pickupLocations, newPickupLocation.trim()] }));
      setNewPickupLocation('');
    }
  };

  const removePickupLocation = (index) => {
    setFormData(prev => ({ ...prev, pickupLocations: prev.pickupLocations.filter((_, i) => i !== index) }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...formData, images: formData.images.map(img => img.url) };
    try {
      if (editingCar) {
        await DataService.updateCar(editingCar._id, payload);
        alert('Car updated successfully!');
      } else {
        await DataService.createCar(payload);
        alert('Car created successfully!');
      }
      setShowModal(false);
      fetchCars();
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Failed to save car');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    
    const processedImages = Array.isArray(car.images) 
      ? car.images.map(img => {
          if (typeof img === 'string') {
            return { 
              url: img, 
              serverId: img.split('/').pop().split('.')[0],
              name: img.split('/').pop(),
              uploadedAt: new Date().toISOString()
            };
          } else {
            return {
              url: img.url || img,
              serverId: img.serverId || img._id || img.url?.split('/').pop().split('.')[0],
              name: img.name || img.url?.split('/').pop() || 'image',
              uploadedAt: img.uploadedAt || new Date().toISOString()
            };
          }
        })
      : [];

    setFormData({
      ...initialFormState,
      ...car,
      images: processedImages
    });
    setShowModal(true);
  };
  const handleArchive = async (carId) => {
    if (window.confirm('Are you sure you want to archive this car?')) {
      try {
        await DataService.archiveCar(carId);
        alert('Car archived successfully!');
        fetchCars();
      } catch (error) {
        alert('Failed to archive car.');
      }
    }
  };

  const handleRestore = async (carId) => {
    if (window.confirm('Are you sure you want to restore this car?')) {
      try {
        await DataService.unarchiveCar(carId);
        alert('Car restored successfully!');
        fetchCars();
      } catch (error) {
        alert('Failed to restore car.');
      }
    }
  };

  const handleToggleAvailability = async (carId) => {
    try {
      const car = cars.find(c => c._id === carId);
      if (car) {
        await DataService.updateCar(carId, { ...car, isAvailable: !car.isAvailable });
        fetchCars();
      }
    } catch (error) {
      alert('Failed to toggle availability.');
    }
  };
  const filteredCars = Array.isArray(cars) ? cars.filter(car => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      car.brand?.toLowerCase().includes(lowerSearchTerm) ||
      car.model?.toLowerCase().includes(lowerSearchTerm) ||
      car.location?.toLowerCase().includes(lowerSearchTerm)
    );
  }) : [];


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Cars</h1>
          <p className="text-gray-600">Add, edit, and manage your car fleet</p>
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
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.length > 0 ? filteredCars.map((car) => (
            <div key={car._id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="h-48 bg-gray-200 relative">
                <img
                  src={car.images && car.images.length > 0 ? `${SERVER_URL}${car.images[0]}` : ''}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {car.archived ? (
                    <button onClick={() => handleRestore(car._id)} className="p-2 bg-white rounded-full shadow-md" title="Restore Car"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(car)} className="p-2 bg-white rounded-full shadow-md" title="Edit Car"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleAvailability(car._id)} className="p-2 bg-white rounded-full shadow-md" title={car.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{car.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleArchive(car._id)} className="p-2 bg-white rounded-full shadow-md" title="Archive Car"><Archive className="w-4 h-4 text-red-600" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{car.brand} {car.model} ({car.year})</h3>
                <p className="text-2xl font-bold text-blue-600">₱{car.pricePerDay?.toLocaleString()}/day</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No {filterStatus} cars found.</h3>
              <p className="text-gray-500">There are no cars matching your current filter.</p>
            </div>
          )}
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900">{editingCar ? 'Edit Car' : 'Add New Car'}</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label><input type="text" name="brand" required value={formData.brand} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Toyota, Honda, etc." /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Model *</label><input type="text" name="model" required value={formData.model} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Camry, Civic, etc." /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Year *</label><input type="number" name="year" required min="1990" max={new Date().getFullYear() + 1} value={formData.year} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Seats *</label><select name="seats" required value={formData.seats} onChange={handleInputChange} className="w-full p-2 border rounded-lg">{[2, 4, 5, 6, 7, 8, 9, 12, 15].map(num => (<option key={num} value={num}>{num} seats</option>))}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Transmission *</label><select name="transmission" required value={formData.transmission} onChange={handleInputChange} className="w-full p-2 border rounded-lg"><option value="automatic">Automatic</option><option value="manual">Manual</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type *</label><select name="fuelType" required value={formData.fuelType} onChange={handleInputChange} className="w-full p-2 border rounded-lg"><option value="gasoline">Gasoline</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Price Per Day (₱) *</label><input type="number" name="pricePerDay" required min="0" step="0.01" value={formData.pricePerDay} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="2500.00" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Location *</label><input type="text" name="location" required value={formData.location} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Manila, Cebu, etc." /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" rows="4" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Describe the car features, condition, etc." /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                  <div className="flex gap-2 mb-2"><input type="text" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add a feature (e.g., Air Conditioning, GPS)" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())} /><button type="button" onClick={addFeature} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button></div>
                  {formData.features.length > 0 && (<div className="flex flex-wrap gap-2">{formData.features.map((feature, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{feature}<button type="button" onClick={() => removeFeature(index)} className="text-blue-600 hover:text-blue-800"><X className="w-3 h-3" /></button></span>))}</div>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Locations</label>
                  <div className="flex gap-2 mb-2"><input type="text" value={newPickupLocation} onChange={(e) => setNewPickupLocation(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add a pickup location" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPickupLocation())} /><button type="button" onClick={addPickupLocation} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button></div>
                  {formData.pickupLocations.length > 0 && (<div className="flex flex-wrap gap-2">{formData.pickupLocations.map((location, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{location}<button type="button" onClick={() => removePickupLocation(index)} className="text-blue-600 hover:text-blue-800"><X className="w-3 h-3" /></button></span>))}</div>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                  <ImageUpload 
                    onImagesChange={handleImagesChange} 
                    existingImages={formData.images} 
                    maxImages={5} 
                    category="cars"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{editingCar ? 'Updating...' : 'Creating...'}</>) : (editingCar ? 'Update Car' : 'Create Car')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCars;