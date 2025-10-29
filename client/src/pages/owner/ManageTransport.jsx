import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Archive,
  Eye,
  EyeOff,
  Search,
  MapPin,
  X,
  RotateCcw,
  DollarSign,
  Percent,
  Info,
  Bus,
  Trash2,
  Tag,
  Calendar,
  CircleDot,
  Trash,
} from 'lucide-react';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import { toast } from 'react-toastify'; 

const ManageTransport = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  // Use useApi for fetching transport services
  const { data: transportData, loading, refetch: fetchTransport } = useApi(
    () => DataService.fetchAllTransportAdmin({ archived: filterStatus === 'archived' }),
    [filterStatus]
  );
  const transports = transportData?.data || [];

  const initialFormState = {
    vehicleType: 'Tourist Bus',
    name: '',
    capacity: '49', // Default to 49 for Tourist Bus
    amenities: [],
    description: '',
    images: [], // Holds image objects { url, serverId, name }
    isAvailable: true,
    archived: false,
    pricing: [],
    // Payment options similar to ManageTours
    paymentType: 'full',
    downpaymentType: 'percentage', // Default type if downpayment is enabled
    downpaymentValue: 20, // Default value if downpayment is enabled
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newAmenity, setNewAmenity] = useState('');
  const [newPriceRow, setNewPriceRow] = useState({
    region: '',
    destination: '',
    dayTourTime: '', // This will be hours (1-24)
    dayTourPrice: '',
    ovnPrice: '',
    threeDayTwoNightPrice: '',
    dropAndPickPrice: '',
  });

  const resetForm = () => {
    setFormData(initialFormState);
    setNewAmenity('');
    setNewPriceRow({
      region: '', destination: '', dayTourTime: '', dayTourPrice: '',
      ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: ''
    });
    setEditingTransport(null);
  };

  // Handle capacity limits based on vehicle type
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'capacity') {
      const vehicleType = formData.vehicleType;
      let maxCap = 999;
      if (vehicleType === 'Coaster') maxCap = 28;
      if (vehicleType === 'Tourist Bus') maxCap = 49;
      
      let numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        numValue = ''; // Allow empty
      } else if (numValue > maxCap) {
        numValue = maxCap; // Enforce max
      }
      
      setFormData((prev) => ({ ...prev, capacity: numValue.toString() }));

    } else if (name === 'vehicleType') {
      // When type changes, check existing capacity
      const currentCap = parseInt(formData.capacity, 10);
      let maxCap = 999;
      if (value === 'Coaster') maxCap = 28;
      if (value === 'Tourist Bus') maxCap = 49;
      
      setFormData((prev) => ({
        ...prev,
        vehicleType: value,
        capacity: (currentCap > maxCap || !prev.capacity) ? maxCap.toString() : prev.capacity,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handlePaymentTypeChange = (e) => {
     const { value } = e.target;
      setFormData(prev => ({
        ...prev,
        paymentType: value,
        downpaymentType: value === 'full' ? prev.downpaymentType : (prev.downpaymentType || 'percentage'),
        downpaymentValue: value === 'full' ? '' : (prev.downpaymentValue || 20),
      }));
  };

  const handleImagesChange = (uploadedImages) => {
    setFormData(prev => ({ ...prev, images: uploadedImages }));
  };

  // Amenity Handlers
  const addAmenity = () => {
    if (newAmenity.trim()) {
      setFormData(prev => ({ ...prev, amenities: [...prev.amenities, newAmenity.trim()] }));
      setNewAmenity('');
    }
  };
  const removeAmenity = (index) => {
    setFormData(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== index) }));
  };

  // --- MODIFIED: Pricing Handlers ---
  const handlePriceRowChange = (index, field, value) => {
    const updatedPricing = [...formData.pricing];
    let processedValue = value;
    
    if (field.includes('Price')) { // For price fields
      processedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    
    } else if (field === 'dayTourTime') { // For hours field
      // Allow only integers, min 1, max 24
      let numValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (isNaN(numValue)) {
        processedValue = ''; // Allow empty
      } else if (numValue < 1) {
        processedValue = '1';
      } else if (numValue > 24) {
        processedValue = '24';
      } else {
        processedValue = numValue.toString();
      }
    } 
    // else, it's a string field like region/destination, do nothing

    updatedPricing[index] = { ...updatedPricing[index], [field]: processedValue };
    setFormData(prev => ({ ...prev, pricing: updatedPricing }));
  };

  const handleNewPriceRowChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    if (name.includes('Price')) { // For price fields
      processedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    
    } else if (name === 'dayTourTime') { // For hours field
      // Allow only integers, min 1, max 24
      let numValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (isNaN(numValue)) {
        processedValue = ''; // Allow empty
      } else if (numValue < 1 && value !== '') { // prevent setting 1 if user deletes
        processedValue = '1';
      } else if (numValue > 24) {
        processedValue = '24';
      } else {
        processedValue = numValue.toString();
      }
    }
    
    setNewPriceRow(prev => ({ ...prev, [name]: processedValue }));
  };
  // --- END MODIFICATION ---


  const addPriceRow = () => {
    if (!newPriceRow.destination || !newPriceRow.destination.trim()) {
      alert('Destination is required for a price row.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      pricing: [...prev.pricing, { ...newPriceRow }]
    }));
    setNewPriceRow({ region: '', destination: '', dayTourTime: '', dayTourPrice: '', ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: '' });
  };

  const removePriceRow = (index) => {
    setFormData(prev => ({
      ...prev,
      pricing: prev.pricing.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

     if (formData.paymentType === 'downpayment') {
        if (!formData.downpaymentType || !formData.downpaymentValue || parseFloat(formData.downpaymentValue) <= 0) {
            alert('Downpayment Type and a positive Value are required when downpayment is enabled.');
            setSubmitting(false);
            return;
        }
        if (formData.downpaymentType === 'percentage' && (parseFloat(formData.downpaymentValue) < 1 || parseFloat(formData.downpaymentValue) > 99)) {
            alert('Percentage must be between 1 and 99.');
            setSubmitting(false);
            return;
        }
    }

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // !!! THIS IS THE FIX !!!
    // Check if there's a pending new price row that hasn't been added
    let finalPricing = [...formData.pricing];
    if (newPriceRow.destination && newPriceRow.destination.trim()) {
      // User typed in the new row but didn't click 'Add'
      // Let's add it for them before submitting.
      finalPricing.push({ ...newPriceRow });
    }
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


    // Prepare payload
    const payload = {
       ...formData,
       capacity: parseInt(formData.capacity, 10) || 0, // Ensure capacity is saved as a number
       images: formData.images.map(img => img.url), // Send only URLs
       
       // --- USE THE 'finalPricing' ARRAY ---
       pricing: finalPricing.map(p => ({
           ...p,
           dayTourTime: p.dayTourTime ? parseInt(p.dayTourTime, 10) : null, // Send as number
           dayTourPrice: p.dayTourPrice ? parseFloat(p.dayTourPrice) : null,
           ovnPrice: p.ovnPrice ? parseFloat(p.ovnPrice) : null,
           threeDayTwoNightPrice: p.threeDayTwoNightPrice ? parseFloat(p.threeDayTwoNightPrice) : null,
           dropAndPickPrice: p.dropAndPickPrice ? parseFloat(p.dropAndPickPrice) : null,
       })),
    };

     if (payload.paymentType === 'full') {
         delete payload.downpaymentType;
         delete payload.downpaymentValue;
     }

    try {
      if (editingTransport) {
        await DataService.updateTransport(editingTransport._id, payload);
        toast.success('Transport updated successfully!');
      } else {
        await DataService.createTransport(payload);
        toast.success('Transport created successfully!');
      }
      setShowModal(false);
      fetchTransport();
    } catch (error) {
      console.error('Error saving transport:', error);
      toast.error(`Failed to save transport: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (transport) => {
    setEditingTransport(transport);

    const processedImages = Array.isArray(transport.images)
      ? transport.images.map((imgUrl, index) => ({
          url: imgUrl,
          serverId: imgUrl.split('/').pop() || `img-${index}`,
          name: imgUrl.split('/').pop() || `image-${index}.jpg`,
        }))
      : [];

    setFormData({
      ...initialFormState,
      ...transport,
      images: processedImages,
      pricing: Array.isArray(transport.pricing) ? transport.pricing : [],
      paymentType: transport.paymentType || 'full',
      downpaymentType: transport.downpaymentType || 'percentage',
      downpaymentValue: transport.downpaymentValue || (transport.paymentType === 'downpayment' ? 20 : ''),
    });
    setNewPriceRow({ region: '', destination: '', dayTourTime: '', dayTourPrice: '', ovnPrice: '', threeDayTwoNightPrice: '', dropAndPickPrice: '' });
    setShowModal(true);
  };

  const handleArchive = async (transportId, transportName) => {
    if (window.confirm(`Are you sure you want to archive this transport (${transportName})?`)) {
      try {
        await DataService.archiveTransport(transportId);
        toast.success('Transport archived successfully!');
        fetchTransport();
      } catch (error) {
        toast.error('Failed to archive transport.');
      }
    }
  };

  const handleRestore = async (transportId, transportName) => {
    if (window.confirm(`Are you sure you want to restore this transport (${transportName})?`)) {
      try {
        await DataService.unarchiveTransport(transportId);
        toast.success('Transport restored successfully!');
        fetchTransport();
      } catch (error) {
        toast.error('Failed to restore transport.');
      }
    }
  };

  // Delete Handler (from previous step)
 const handleDelete = async (transportId, transportName) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE (${transportName})? This action cannot be undone and will fail if there are active bookings.`)) {
      try {
        await DataService.deleteTransport(transportId);
        toast.success('Transport permanently deleted!');
        fetchTransport();
      } catch (error) {
        console.error('Failed to delete transport:', error);
        // This will display the specific error from the server
        const errorMessage = error.response?.data?.message || `Failed to delete: ${error.message || 'Server error'}`;
        toast.error(errorMessage);
      }
    }
  };

  const handleToggleAvailability = async (transport) => {
    const action = transport.isAvailable ? 'unavailable' : 'available';
    if (window.confirm(`Are you sure you want to mark this transport (${transport.name || transport.vehicleType}) as ${action}?`)) {
      try {
        await DataService.updateTransport(transport._id, { isAvailable: !transport.isAvailable });
        fetchTransport();
      } catch (error) {
        toast.error('Failed to toggle availability.');
      }
    }
  };

  // Filter logic
  const filteredTransports = Array.isArray(transports) ? transports.filter(transport => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return (
        (transport.vehicleType?.toLowerCase().includes(lowerSearchTerm) ||
        transport.name?.toLowerCase().includes(lowerSearchTerm) ||
        transport.capacity?.toString().includes(lowerSearchTerm))
    );
  }) : [];


  return (
    <div className="p-6">
      {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Transport</h1>
          <p className="text-white">Add, edit, and manage your transport fleet</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Transport
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search by type, name, or capacity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-4">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active Transport</option>
              <option value="archived">Archived Transport</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTransports.length > 0 ? filteredTransports.map((transport) => (
            <div key={transport._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-opacity ${transport.archived ? 'opacity-60' : ''}`}>
              <div className="h-48 bg-gray-200 relative">
                <img src={transport.images && transport.images.length > 0 ? getImageUrl(transport.images[0]) : 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'}
                  alt={transport.name || transport.vehicleType}
                  className="w-full h-full object-cover"
                />
                {/* Delete button (from previous step) */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {transport.archived ? (
                    <>
                      <button onClick={() => handleRestore(transport._id, transport.name || transport.vehicleType)} className="p-2 bg-white rounded-full shadow-md" title="Restore Transport"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                      <button onClick={() => handleDelete(transport._id, transport.name || transport.vehicleType)} className="p-2 bg-white rounded-full shadow-md" title="PERMANENTLY DELETE"><Trash className="w-4 h-4 text-red-700" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(transport)} className="p-2 bg-white rounded-full shadow-md" title="Edit Transport"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleAvailability(transport)} className="p-2 bg-white rounded-full shadow-md" title={transport.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{transport.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleArchive(transport._id, transport.name || transport.vehicleType)} className="p-2 bg-white rounded-full shadow-md" title="Archive Transport"><Archive className="w-4 h-4 text-red-600" /></button>
                    </>
                  )}
                </div>
                 <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${transport.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {transport.isAvailable ? 'Available' : 'Unavailable'}
                 </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{transport.vehicleType} {transport.name ? `(${transport.name})` : ''}</h3>
                <p className="text-sm text-gray-500">Capacity: {transport.capacity} passengers</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No {filterStatus} transport found.</h3>
              <p className="text-gray-500">There are no transport services matching your current filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{editingTransport ? 'Edit Transport Service' : 'Add Transport Service'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <form id="transportFormModal" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-6 scrollbar-thin">

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                        <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} required className="w-full p-2 border rounded-lg bg-white">
                            <option value="Tourist Bus">Tourist Bus</option>
                            <option value="Coaster">Coaster</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g., Bus Alpha"/>
                    </div>
                    {/* Capacity Input (from previous step) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Max Passengers) *</label>
                        <input
                           type="number"
                           name="capacity"
                           value={formData.capacity}
                           onChange={handleInputChange}
                           required
                           min="1"
                           max={formData.vehicleType === 'Coaster' ? 28 : (formData.vehicleType === 'Tourist Bus' ? 49 : 999)}
                           className="w-full p-2 border rounded-lg"
                           placeholder={formData.vehicleType === 'Coaster' ? 'Max 28' : 'Max 49'}
                         />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="Describe the vehicle, features, etc." />
                </div>

                {/* Amenities */}
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                  <div className="flex gap-2 mb-2">
                      <input type="text" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add amenity (e.g., Wifi, Karaoke)" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())} />
                      <button type="button" onClick={addAmenity} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                  {Array.isArray(formData.amenities) && formData.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                          {formData.amenities.map((amenity, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                  {amenity}
                                  <button type="button" onClick={() => removeAmenity(index)} className="text-blue-600 hover:text-blue-800">
                                      <X className="w-3 h-3" />
                                  </button>
                              </span>
                          ))}
                      </div>
                  )}
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
                                        placeholder={formData.downpaymentType === 'percentage' ? 'e.g., 20' : 'e.g., 5000'}
                                        className="p-2 pl-7 border rounded w-full md:w-1/2"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={12}/> {formData.downpaymentType === 'fixed' ? 'This amount will be requested upfront.' : 'This percentage will be calculated based on the total quote price.'} </p>

                            </div>
                        </div>
                    )}
                 </div>
                 {/* End Payment Configuration */}

                {/* Availability */}
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                   <select name="isAvailable" value={formData.isAvailable ? 'true' : 'false'} onChange={(e) => setFormData(prev => ({...prev, isAvailable: e.target.value === 'true'}))} className="w-full p-2 border rounded-lg bg-white">
                       <option value="true">Available</option>
                       <option value="false">Unavailable</option>
                   </select>
                </div>

                {/* --- MODIFIED: Pricing Table --- */}
                <div className="md:col-span-2">
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Destination Pricing Guide
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Add pricing rows for different destinations and service types. Leave price fields blank if not applicable.</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Region</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Destination*</th>
                          {/* --- HEADER CHANGED --- */}
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Day Tour (Hours)</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Day Tour Price</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">OVN Price</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">3D2N Price</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Drop & Pick</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-500">Act</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.pricing.map((price, index) => (
                          <tr key={index}>
                            <td className="px-2 py-1"><input type="text" value={price.region || ''} onChange={(e) => handlePriceRowChange(index, 'region', e.target.value)} className="w-full p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="text" value={price.destination || ''} onChange={(e) => handlePriceRowChange(index, 'destination', e.target.value)} className="w-full p-1 border rounded-md text-xs font-medium" required/></td>
                            {/* --- INPUT CHANGED --- */}
                            <td className="px-2 py-1">
                               <input
                                  type="number"
                                  min="1"
                                  max="24"
                                  step="1"
                                  value={price.dayTourTime || ''}
                                  onChange={(e) => handlePriceRowChange(index, 'dayTourTime', e.target.value)}
                                  className="w-20 p-1 border rounded-md text-xs"
                                  placeholder="Hours"
                                />
                            </td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.dayTourPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dayTourPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.ovnPrice || ''} onChange={(e) => handlePriceRowChange(index, 'ovnPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            
                            {/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
                            {/* !!! NO TYPO HERE, THIS WAS CORRECT !!! */}
                            {/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.threeDayTwoNightPrice || ''} onChange={(e) => handlePriceRowChange(index, 'threeDayTwoNightPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.dropAndPickPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dropAndPickPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1 text-center"><button type="button" onClick={() => removePriceRow(index)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                          </tr>
                        ))}
                        {/* New Row Input */}
                        <tr className="bg-gray-50">
                          <td className="px-2 py-1"><input type="text" name="region" value={newPriceRow.region} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Region"/></td>
                          <td className="px-2 py-1"><input type="text" name="destination" value={newPriceRow.destination} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Destination Name*"/></td>
                           {/* --- INPUT CHANGED --- */}
                          <td className="px-2 py-1">
                              <input
                                type="number"
                                min="1"
                                max="24"
                                step="1"
                                name="dayTourTime"
                                value={newPriceRow.dayTourTime}
                                onChange={handleNewPriceRowChange}
                                className="w-20 p-1 border rounded-md text-xs"
                                placeholder="Hours (1-24)"
                              />
                          </td>
                          {/* --- NO TYPO HERE EITHER --- */}
                          <td className="px-2 py-1"><input type="number" step="0.01" name="dayTourPrice" value={newPriceRow.dayTourPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="Day Tour ₱"/></td>
                          <td className="px-2 py-1"><input type="number" step="0.01" name="ovnPrice" value={newPriceRow.ovnPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="OVN ₱"/></td>
                          <td className="px-2 py-1"><input type="number" step="0.01" name="threeDayTwoNightPrice" value={newPriceRow.threeDayTwoNightPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="3D2N ₱"/></td>
                          <td className="px-2 py-1"><input type="number" step="0.01" name="dropAndPickPrice" value={newPriceRow.dropAndPickPrice} onChange={handleNewPriceRowChange} className="w-24 p-1 border rounded-md text-xs" placeholder="Drop & Pick ₱"/></td>
                          <td className="px-2 py-1 text-center"><button type="button" onClick={addPriceRow} className="text-blue-600 hover:text-blue-800"><Plus size={16}/></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images (First image is main)</label>
                  <ImageUpload
                    onImagesChange={handleImagesChange}
                    existingImages={formData.images}
                    maxImages={10}
                    category="transport" // Specify category for uploads
                  />
                </div>
            </form>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button type="submit" form="transportFormModal" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {submitting ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{editingTransport ? 'Updating...' : 'Creating...'}</>) : (editingTransport ? 'Update Transport' : 'Create Transport')}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTransport;