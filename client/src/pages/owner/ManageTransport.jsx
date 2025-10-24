import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Archive, Eye, EyeOff, Search, Trash2, X, RotateCcw, DollarSign, Percent, Info, MapPin, Clock, Users, Save } from 'lucide-react';
import DataService, { getImageUrl } from '../../components/services/DataService';
import ImageUpload from '../../components/ImageUpload';
import { useApi } from '../../hooks/useApi';

const ManageTransport = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const { data: servicesData, loading, refetch: fetchServices } = useApi(
    () => DataService.fetchAllTransportAdmin({ archived: filterStatus === 'archived' }), // Assuming this function exists in DataService
    [filterStatus]
  );
  const services = servicesData?.data || [];

  const initialFormState = {
    vehicleType: 'Tourist Bus',
    name: '',
    capacity: '',
    amenities: [],
    description: '',
    images: [],
    pricing: [],
    isAvailable: true,
    paymentType: 'full',
    downpaymentType: 'percentage',
    downpaymentValue: 20,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newAmenity, setNewAmenity] = useState('');
  const [newPriceRow, setNewPriceRow] = useState({
    region: '', destination: '', dayTourTime: '', dayTourPrice: '', ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: ''
  });

  const resetForm = () => {
    setFormData(initialFormState);
    setNewAmenity('');
    setNewPriceRow({ region: '', destination: '', dayTourTime: '', dayTourPrice: '', ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: '' });
    setEditingService(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  const handleImagesChange = (uploadedImages) => {
    setFormData(prev => ({ ...prev, images: uploadedImages.map(img => ({ url: img.url, serverId: img.serverId })) }));
  };

  // Amenities Handlers
  const addAmenity = () => { if (newAmenity.trim()) { setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] })); setNewAmenity(''); } };
  const removeAmenity = (index) => setFormData(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));

  // Pricing Handlers
  const handlePriceRowChange = (index, field, value) => {
    const updatedPricing = [...formData.pricing];
    updatedPricing[index] = { ...updatedPricing[index], [field]: value };
    setFormData(prev => ({ ...prev, pricing: updatedPricing }));
  };

  const handleNewPriceRowChange = (e) => {
    const { name, value } = e.target;
    setNewPriceRow(prev => ({ ...prev, [name]: value }));
  };

  const addPriceRow = () => {
    if (!newPriceRow.destination.trim()) {
      alert("Destination is required for pricing.");
      return;
    }
    setFormData(prev => ({ ...prev, pricing: [...prev.pricing, { ...newPriceRow }] }));
    setNewPriceRow({ region: '', destination: '', dayTourTime: '', dayTourPrice: '', ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: '' }); // Reset form
  };

  const removePriceRow = (index) => {
    setFormData(prev => ({ ...prev, pricing: prev.pricing.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Downpayment validation (similar to ManageCars)
    if (formData.paymentType === 'downpayment') {
       if (!formData.downpaymentType || !formData.downpaymentValue || parseFloat(formData.downpaymentValue) <= 0) {
            alert('Downpayment Type and a positive Value are required.');
            setSubmitting(false);
            return;
        }
        if (formData.downpaymentType === 'percentage' && (parseFloat(formData.downpaymentValue) < 1 || parseFloat(formData.downpaymentValue) > 99)) {
             alert('Percentage must be between 1 and 99.');
            setSubmitting(false);
            return;
        }
    }

    // Prepare payload
    const payload = {
      ...formData,
      images: formData.images.map(img => img.url), // Send only URLs
      // Convert price strings to numbers, defaulting to null if empty or invalid
      pricing: formData.pricing.map(p => ({
          ...p,
          dayTourPrice: parseFloat(p.dayTourPrice) || null,
          ovnPrice: parseFloat(p.ovnPrice) || null,
          threeDayTwoNightPrice: parseFloat(p.threeDayTwoNightPrice) || null,
          dropAndPickPrice: parseFloat(p.dropAndPickPrice) || null,
      })),
    };
     // Clean up payment fields if 'full'
     if (payload.paymentType === 'full') {
         delete payload.downpaymentType;
         delete payload.downpaymentValue;
     }

    try {
      if (editingService) {
        await DataService.updateTransport(editingService._id, payload); // Assuming this exists
        alert('Transport service updated successfully!');
      } else {
        await DataService.createTransport(payload); // Assuming this exists
        alert('Transport service created successfully!');
      }
      setShowModal(false);
      fetchServices();
    } catch (error) {
      console.error('Error saving transport service:', error);
      alert(`Failed to save transport service: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    const processedImages = Array.isArray(service.images)
      ? service.images.map((img, index) => ({
          url: img,
          serverId: img.split('/').pop() || `img-${index}`,
          name: img.split('/').pop() || 'image.jpg',
        }))
      : [];
    setFormData({
      ...initialFormState,
      ...service,
      images: processedImages,
      pricing: Array.isArray(service.pricing) ? service.pricing : [], // Ensure pricing is array
      paymentType: service.paymentType || 'full',
      downpaymentType: service.downpaymentType || 'percentage',
      downpaymentValue: service.downpaymentValue || (service.paymentType === 'downpayment' ? 20 : ''),
    });
    setShowModal(true);
  };

  const handleArchive = async (serviceId) => { if (window.confirm('Archive this service?')) { try { await DataService.archiveTransport(serviceId); fetchServices(); } catch (e) { alert('Archive failed.'); } } };
  const handleRestore = async (serviceId) => { if (window.confirm('Restore this service?')) { try { await DataService.unarchiveTransport(serviceId); fetchServices(); } catch (e) { alert('Restore failed.'); } } };
  const handleToggleAvailability = async (service) => { const action = service.isAvailable ? 'unavailable' : 'available'; if (window.confirm(`Mark as ${action}?`)) { try { await DataService.updateTransport(service._id, { isAvailable: !service.isAvailable }); fetchServices(); } catch (e) { alert('Toggle failed.'); } } };

  const filteredServices = Array.isArray(services) ? services.filter(service => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const serviceStatus = service.archived ? 'archived' : 'active';
    const matchesSearch = (
      service.vehicleType?.toLowerCase().includes(lowerSearchTerm) ||
      service.name?.toLowerCase().includes(lowerSearchTerm) ||
      service.capacity?.toLowerCase().includes(lowerSearchTerm) ||
      service.pricing?.some(p => p.destination?.toLowerCase().includes(lowerSearchTerm))
    );
    const matchesStatus = filterStatus === 'all' || serviceStatus === filterStatus;
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Transport Services</h1>
          <p className="text-gray-600">Add, edit, and manage Buses and Coasters</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add New Service
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Search by type, name, capacity, destination..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Active Services</option>
                <option value="archived">Archived Services</option>
                <option value="all">All Services</option>
            </select>
        </div>
      </div>

      {/* Service List */}
      {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.length > 0 ? filteredServices.map((service) => (
                  <div key={service._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-opacity ${service.archived ? 'opacity-60' : ''}`}>
                      <div className="h-48 bg-gray-200 relative">
                          <img src={service.images && service.images.length > 0 ? getImageUrl(service.images[0]) : 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'} alt={service.vehicleType} className="w-full h-full object-cover"/>
                          <div className="absolute top-2 right-2 flex gap-1">
                            {service.archived ? (
                              <button onClick={() => handleRestore(service._id)} className="p-2 bg-white rounded-full shadow-md" title="Restore"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                            ) : (
                              <>
                                <button onClick={() => handleEdit(service)} className="p-2 bg-white rounded-full shadow-md" title="Edit"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleToggleAvailability(service)} className="p-2 bg-white rounded-full shadow-md" title={service.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{service.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                <button onClick={() => handleArchive(service._id)} className="p-2 bg-white rounded-full shadow-md" title="Archive"><Archive className="w-4 h-4 text-red-600" /></button>
                              </>
                            )}
                          </div>
                          <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${service.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {service.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                      </div>
                      <div className="p-4">
                          <h3 className="text-lg font-semibold">{service.vehicleType} {service.name ? `(${service.name})` : ''}</h3>
                          <p className="text-sm text-gray-500">{service.capacity}</p>
                          <p className="text-sm text-gray-700 mt-2 truncate">{service.description || 'No description'}</p>
                      </div>
                  </div>
              )) : (
                  <div className="col-span-full text-center py-12"><Users className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium">No transport services found.</h3><p className="text-gray-500">Add a new service or adjust your filters.</p></div>
              )}
          </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{editingService ? 'Edit Transport Service' : 'Add New Transport Service'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            {/* Modal Form */}
            <form id="transportForm" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label><select name="vehicleType" required value={formData.vehicleType} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white"><option value="Tourist Bus">Tourist Bus</option><option value="Coaster">Coaster</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g., Bus Alpha, Coaster 1" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label><input type="text" name="capacity" required value={formData.capacity} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g., 49 Regular Seats" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Brief description of the vehicle..." /></div>

              {/* Amenities */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                  <div className="flex gap-2 mb-2"><input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} className="flex-1 p-2 border rounded-lg" placeholder="Add amenity (e.g., Airconditioned)" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())} /><button type="button" onClick={addAmenity} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button></div>
                  <div className="flex flex-wrap gap-2">{formData.amenities.map((item, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{item}<button type="button" onClick={() => removeAmenity(index)}><X className="w-3 h-3" /></button></span>))}</div>
              </div>

              {/* Payment Configuration */}
              <div className="border p-4 rounded-md bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><DollarSign size={18}/> Payment Options</h3>
                    <div className="flex gap-6 mb-4">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="paymentType" value="full" checked={formData.paymentType === 'full'} onChange={handlePaymentTypeChange} className="mr-2"/>Full Payment Only</label>
                        <label className="flex items-center cursor-pointer"><input type="radio" name="paymentType" value="downpayment" checked={formData.paymentType === 'downpayment'} onChange={handlePaymentTypeChange} className="mr-2"/>Allow Downpayment</label>
                    </div>
                    {formData.paymentType === 'downpayment' && (
                        <div className="border-t pt-4 space-y-3 animate-in fade-in duration-300">
                            <div className="flex gap-6 mb-2">
                               <label className="flex items-center cursor-pointer"><input type="radio" name="downpaymentType" value="percentage" checked={formData.downpaymentType === 'percentage'} onChange={handleInputChange} className="mr-2"/>Percentage (%)</label>
                                <label className="flex items-center cursor-pointer"><input type="radio" name="downpaymentType" value="fixed" checked={formData.downpaymentType === 'fixed'} onChange={handleInputChange} className="mr-2"/>Fixed Amount (₱)</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{formData.downpaymentType === 'percentage' ? 'Percentage Value (1-99)' : 'Fixed Amount (PHP)'} *</label>
                                 <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">{formData.downpaymentType === 'percentage' ? '%' : '₱'}</span><input name="downpaymentValue" type="number" step={formData.downpaymentType === 'percentage' ? "1" : "0.01"} min="1" max={formData.downpaymentType === 'percentage' ? "99" : undefined} value={formData.downpaymentValue} onChange={handleInputChange} placeholder={formData.downpaymentType === 'percentage' ? 'e.g., 20' : 'e.g., 1000'} className="p-2 pl-7 border rounded w-full md:w-1/2" required/></div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={12}/> {formData.downpaymentType === 'fixed' ? 'This fixed amount will apply per booking.' : 'Percentage of the selected trip price.'} </p>
                            </div>
                        </div>
                    )}
                 </div>

              {/* Pricing Table */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination Pricing</label>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Region</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Destination*</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Day Tour Time</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Day Tour Price</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">OVN Price</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">3D2N Price</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Drop & Pick</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.pricing.map((price, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2"><input type="text" value={price.region || ''} onChange={(e) => handlePriceRowChange(index, 'region', e.target.value)} className="w-full p-1 border rounded-md text-xs" placeholder="e.g., Quezon"/></td>
                          <td className="px-3 py-2"><input type="text" value={price.destination || ''} onChange={(e) => handlePriceRowChange(index, 'destination', e.target.value)} className="w-full p-1 border rounded-md text-xs font-medium" required placeholder="e.g., Lucena"/></td>
                          <td className="px-3 py-2"><input type="text" value={price.dayTourTime || ''} onChange={(e) => handlePriceRowChange(index, 'dayTourTime', e.target.value)} className="w-16 p-1 border rounded-md text-xs" placeholder="e.g., 12"/></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={price.dayTourPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dayTourPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs" placeholder="e.g., 25000"/></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={price.ovnPrice || ''} onChange={(e) => handlePriceRowChange(index, 'ovnPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs" placeholder="e.g., 38000"/></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={price.threeDayTwoNightPrice || ''} onChange={(e) => handlePriceRowChange(index, 'threeDayTwoNightPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs" placeholder="e.g., 60000"/></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={price.dropAndPickPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dropAndPickPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs" placeholder="e.g., 50000"/></td>
                          <td className="px-3 py-2 text-center"><button type="button" onClick={() => removePriceRow(index)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                        </tr>
                      ))}
                      {/* New Row Input */}
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2"><input type="text" name="region" value={newPriceRow.region} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Region"/></td>
                        <td className="px-3 py-2"><input type="text" name="destination" value={newPriceRow.destination} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Destination Name*"/></td>
                        <td className="px-3 py-2"><input type="text" name="dayTourTime" value={newPriceRow.dayTourTime} onChange={handleNewPriceRowChange} className="w-16 p-1 border rounded-md text-xs" placeholder="Time/Days"/></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" name="dayTourPrice" value={newPriceRow.dayTourPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="Day Tour ₱"/></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" name="ovnPrice" value={newPriceRow.ovnPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="OVN ₱"/></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" name="threeDayTwoNightPrice" value={newPriceRow.threeDayTwoNightPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="3D2N ₱"/></td>
                        <td className="px-3 py-2"><input type="number" step="0.01" name="dropAndPickPrice" value={newPriceRow.dropAndPickPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="Drop & Pick ₱"/></td>
                        <td className="px-3 py-2 text-center"><button type="button" onClick={addPriceRow} className="text-blue-600 hover:text-blue-800"><Plus size={16}/></button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                <ImageUpload onImagesChange={handleImagesChange} existingImages={formData.images} maxImages={5} category="transport" />
              </div>
            </form>
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
              <button type="submit" form="transportForm" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                <Save size={16}/> {submitting ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTransport;
