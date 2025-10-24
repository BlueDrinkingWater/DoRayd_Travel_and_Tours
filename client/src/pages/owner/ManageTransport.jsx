// client/src/pages/owner/ManageTransport.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { toast } from 'react-toastify';
import {
  Edit,
  Trash,
  PlusCircle,
  Archive,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import DataService from '../../components/services/DataService'; // Import DataService
import ImageUpload from '../../components/ImageUpload';
import { formatPrice, formatDate } from '../../utils/helpers';
// Removed useApi as it's not the correct pattern for this component

const initialFormState = {
  vehicleType: 'Tourist Bus',
  name: '',
  capacity: '',
  amenities: [],
  description: '',
  images: [], // Will now hold image objects: { url, serverId, ... }
  downpaymentRate: 0.2,
  requiresDownpayment: true,
  isAvailable: true,
  archived: false,
  pricing: [],
};

const initialNewPriceRow = {
  region: '',
  destination: '',
  dayTourTime: '',
  dayTourPrice: '',
  ovnPrice: '',
  threeDayTwoNightPrice: '',
  dropAndPickPrice: '',
};

const ManageTransport = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [currentAmenity, setCurrentAmenity] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [viewArchived, setViewArchived] = useState(false);
  const [newPriceRow, setNewPriceRow] = useState(initialNewPriceRow);

  // --- Start of Fix: Correct Data Fetching & Actions ---

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch using DataService directly
      const data = await DataService.fetchAllTransportAdmin({ archived: viewArchived });
      if (data.success) {
        // The API returns data in the 'data' field
        setServices(data.data || []); // Use data.data and default to empty array
        setError(null); // Clear previous errors on success
      } else {
        throw new Error(data.message || 'Unknown error fetching data');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch transport services');
      toast.error(err.message || 'Failed to fetch transport services');
    } finally {
      setLoading(false);
    }
  }, [viewArchived]); // Dependency is viewArchived

  useEffect(() => {
    fetchServices();
  }, [fetchServices]); // useEffect depends on the fetchServices callback

  const openModal = (service = null) => {
    if (service) {
      // Correctly map image URLs to the format ImageUpload expects
      const imageObjects =
        service.images?.map((url) => ({
          url: url, // Assuming URL is the Cloudinary path/URL
          serverId: url,
          name: 'Existing Image',
        })) || [];

      setFormData({
        vehicleType: service.vehicleType || 'Tourist Bus',
        name: service.name || '',
        capacity: service.capacity || '',
        amenities: service.amenities || [],
        description: service.description || '',
        images: imageObjects, // Use the processed image objects
        downpaymentRate: service.downpaymentRate || 0,
        requiresDownpayment: service.requiresDownpayment !== false,
        isAvailable: service.isAvailable !== false,
        archived: service.archived || false,
        pricing: service.pricing || [],
      });
      setEditingId(service._id);
    } else {
      setFormData(initialFormState);
      setEditingId(null); // Ensure editingId is null for new service
    }
    setNewPriceRow(initialNewPriceRow);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
    setCurrentAmenity('');
    setNewPriceRow(initialNewPriceRow);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? parseFloat(value)
          : value,
    }));
  };

  const handleAmenityChange = (e) => {
    setCurrentAmenity(e.target.value);
  };

  const addAmenity = () => {
    if (currentAmenity.trim() && !formData.amenities.includes(currentAmenity.trim())) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, currentAmenity.trim()],
      }));
      setCurrentAmenity('');
    }
  };

  const removeAmenity = (amenityToRemove) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((amenity) => amenity !== amenityToRemove),
    }));
  };

  // This function receives the array of image objects from ImageUpload
  const handleImagesChange = (images) => {
    setFormData((prev) => ({
      ...prev,
      images: images,
    }));
  };

  // --- Pricing Handlers (No change needed) ---

  const handlePriceRowChange = (index, field, value) => {
    const updatedPricing = [...formData.pricing];
    const numValue =
      field.includes('Price') && value !== '' ? parseFloat(value) : value;
    updatedPricing[index] = { ...updatedPricing[index], [field]: numValue };
    setFormData((prev) => ({ ...prev, pricing: updatedPricing }));
  };

  const handleNewPriceRowChange = (e) => {
    const { name, value } = e.target;
    const numValue =
      name.includes('Price') && value !== '' ? parseFloat(value) : value;
    setNewPriceRow((prev) => ({ ...prev, [name]: numValue }));
  };

  const addPriceRow = () => {
    if (!newPriceRow.destination || !newPriceRow.destination.trim()) {
      toast.error('Destination is required for a price row.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      pricing: [...prev.pricing, { ...newPriceRow }],
    }));
    setNewPriceRow(initialNewPriceRow);
  };

  // Remove price row logic remains the same
  const removePriceRow = (index) => {
    if (
      window.confirm(
        `Are you sure you want to remove the price for "${formData.pricing[index].destination}"?`
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        pricing: prev.pricing.filter((_, i) => i !== index),
      }));
    }
  };

  // --- End Pricing Handlers ---

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Extract just the URLs for the API payload
    const imagesForApi = formData.images.map((img) => img.url);

    try {
      // Create the data payload for the API
      const dataToSend = { ...formData, images: imagesForApi };

      let response;
      if (editingId) {
        // Use DataService to update
        response = await DataService.updateTransport(editingId, dataToSend);
        if (!response.success) throw new Error(response.message || 'Update failed');
        toast.success(response.message || 'Transport service updated!');
      } else {
        // Use DataService to create
        response = await DataService.createTransport(dataToSend);
        if (!response.success) throw new Error(response.message || 'Creation failed');
        toast.success(response.message || 'Transport service created!');
      }
      fetchServices();
      closeModal();
    } catch (err) {
      setError(err.message || 'Failed to save transport service');
      toast.error(err.message || 'Failed to save transport service');
    }
  };

  const handleToggleArchive = async (service) => {
    const action = service.archived ? 'unarchive' : 'archive';
    if (
      window.confirm(
        `Are you sure you want to ${action} "${service.name || service.vehicleType}"?`
      )
    ) {
      try {
        let response;
        // Use DataService to archive/unarchive
        if (service.archived) {
          response = await DataService.unarchiveTransport(service._id);
        } else {
          response = await DataService.archiveTransport(service._id);
        }
        if (!response.success) throw new Error(response.message || `Failed to ${action}`);
        
        toast.success(response.message || `Service ${action}d!`);
        fetchServices(); // Refetch the list
      } catch (err) {
        toast.error(err.message || `Failed to ${action} service`);
      }
    }
  };
  
  // --- End of Fix ---

  // Use useMemo for filtering if needed, though API might handle it
  const filteredServices = useMemo(() => services.filter(
    (service) => service.archived === viewArchived
  ), [services, viewArchived]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Transport Services</h1>
        <div>
          <button
            onClick={() => setViewArchived(!viewArchived)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg mr-4 flex items-center gap-2" // Added flex items-center gap-2
          >
            {viewArchived ? <Eye size={18} /> : <Archive size={18} />}
            {viewArchived ? ' View Active' : ' View Archived'}
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2" // Use inline-flex
          >
            <PlusCircle className="w-5 h-5" />
            Add Transport
          </button>
        </div>
      </div>

      {/* Transport List Table */}
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Downpayment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <tr key={service._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.vehicleType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.isAvailable ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Not Available
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.requiresDownpayment
                      ? `${(service.downpaymentRate * 100).toFixed(0)}%`
                      : 'Not Required'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => openModal(service)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center" // Use inline-flex
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button // Button styles remain the same for toggle
                      onClick={() => handleToggleArchive(service)}
                      className={
                        service.archived
                          ? 'text-green-600 hover:text-green-900'
                          : 'text-red-600 hover:text-red-900'
                      }
                    >
                      {service.archived ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <Archive className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-4 text-center text-gray-500"
                >
                  No {viewArchived ? 'archived' : 'active'} services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Edit Transport Service' : 'Add Transport Service'}
            </h2>
            <form id="transportForm" onSubmit={handleSubmit} className="space-y-6"> {/* Added space-y-6 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Type */}
                <div>
                  <label
                    htmlFor="vehicleType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="Tourist Bus">Tourist Bus</option>
                    <option value="Coaster">Coaster</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name (e.g., "Bus 01", "Coaster A")
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label
                    htmlFor="capacity"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Capacity
                  </label>
                  <input
                    type="text"
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    placeholder="e.g., 49 Regular Seats"
                  />
                </div>

                {/* Amenities */}
                <div className="md:col-span-1">
                  <label
                    htmlFor="amenities"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Amenities
                  </label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      id="amenityInput"
                      value={currentAmenity}
                      onChange={handleAmenityChange}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                      className="flex-grow p-2 border border-gray-300 rounded-l-md shadow-sm"
                      placeholder="Type amenity and press Add"
                    />
                    <button
                      type="button"
                      onClick={addAmenity}
                      className="px-4 py-2 bg-blue-500 text-white rounded-r-md"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-sm flex items-center"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  ></textarea>
                </div>

                {/* --- Pricing Table (No changes needed) --- */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Pricing
                  </label>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Region</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Destination*</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Day Tour Time</th>
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
                            <td className="px-2 py-1"><input type="text" value={price.dayTourTime || ''} onChange={(e) => handlePriceRowChange(index, 'dayTourTime', e.target.value)} className="w-16 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.dayTourPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dayTourPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.ovnPrice || ''} onChange={(e) => handlePriceRowChange(index, 'ovnPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.threeDayTwoNightPrice || ''} onChange={(e) => handlePriceRowChange(index, 'threeDayTwoNightPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1"><input type="number" step="0.01" value={price.dropAndPickPrice || ''} onChange={(e) => handlePriceRowChange(index, 'dropAndPickPrice', e.target.value)} className="w-24 p-1 border rounded-md text-xs"/></td>
                            <td className="px-2 py-1 text-center"><button type="button" onClick={() => removePriceRow(index)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button></td>
                          </tr>
                        ))}
                        {/* New Row Input */}
                        <tr className="bg-gray-50">
                          <td className="px-2 py-1"><input type="text" name="region" value={newPriceRow.region} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Region"/></td>
                          <td className="px-2 py-1"><input type="text" name="destination" value={newPriceRow.destination} onChange={handleNewPriceRowChange} className="w-full p-1 border rounded-md text-xs" placeholder="Destination Name*"/></td>
                          <td className="px-2 py-1"><input type="text" name="dayTourTime" value={newPriceRow.dayTourTime} onChange={handleNewPriceRowChange} className="w-16 p-1 border rounded-md text-xs" placeholder="Time/Days"/></td>
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

                {/* Downpayment Rate */}
                <div>
                  <label
                    htmlFor="downpaymentRate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Downpayment Rate (e.g., 0.2 for 20%)
                  </label>
                  <input
                    type="number"
                    id="downpaymentRate"
                    name="downpaymentRate"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.downpaymentRate}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <input
                      id="requiresDownpayment"
                      name="requiresDownpayment"
                      type="checkbox"
                      checked={formData.requiresDownpayment}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="requiresDownpayment"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Requires Downpayment
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="isAvailable"
                      name="isAvailable"
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isAvailable"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Is Available
                    </label>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Images
                  </label>
                  <ImageUpload
                    onImagesChange={handleImagesChange}
                    existingImages={formData.images}
                    category="transport"
                    maxImages={10}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button" // Important to prevent form submission
                  onClick={closeModal}
                  className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button // Submit button remains the same
                  type="submit"
                  form="transportForm"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {editingId ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTransport;