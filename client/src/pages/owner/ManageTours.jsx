import { useState, useEffect } from 'react';
import { Plus, Edit3, Archive, Eye, EyeOff, Search, MapPin, X, RotateCcw, DollarSign, Percent, Info, Trash } from 'lucide-react';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import { toast } from 'react-toastify';

const ManageTours = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // Default to showing active tours
  const [submitting, setSubmitting] = useState(false);

  // Fetch tours based on the selected filter status (active/archived/all)
  const { data: toursData, loading, refetch: fetchTours } = useApi(
    () => DataService.fetchAllTours({
        archived: filterStatus === 'archived',
        includeArchived: filterStatus === 'all'
     }),
    [filterStatus] // Refetch when filterStatus changes
  );
  const tours = toursData?.data || [];

  const initialFormState = {
    title: '', description: '', destination: '', duration: '', price: '',
    startDate: '', endDate: '',
    maxGroupSize: 10, category: '', inclusions: [], // Removed difficulty
    exclusions: [], itinerary: [], images: [],
    isAvailable: true, // Default new tours to available
    paymentType: 'full',
    downpaymentType: 'percentage',
    downpaymentValue: 20,
    availabilityStatus: 'available', // Corresponds to isAvailable: true
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [newItineraryDay, setNewItineraryDay] = useState({ day: 1, title: '', activities: '' });

  // Removed categoryOptions as it's now a text input

  const resetForm = () => {
    setFormData(initialFormState);
    setNewInclusion('');
    setNewExclusion('');
    setNewItineraryDay({ day: 1, title: '', activities: '' });
    setEditingTour(null);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset*60*1000));
        return adjustedDate.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
     if (name === 'availabilityStatus') {
        setFormData(prev => ({
            ...prev,
            availabilityStatus: value,
            isAvailable: value === 'available'
        }));
     } else {
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
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

  const addInclusion = () => { if (newInclusion.trim()) { setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion.trim()] })); setNewInclusion(''); } };
  const removeInclusion = (index) => setFormData(prev => ({ ...prev, inclusions: prev.inclusions.filter((_, i) => i !== index) }));
  const addExclusion = () => { if (newExclusion.trim()) { setFormData(prev => ({ ...prev, exclusions: [...prev.exclusions, newExclusion.trim()] })); setNewExclusion(''); } };
  const removeExclusion = (index) => setFormData(prev => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== index) }));

  const addItineraryDay = () => {
    if (!newItineraryDay.title.trim() || !newItineraryDay.activities.trim()) {
        alert("Please fill in both title and activities for the itinerary day.");
        return;
    }
    const dayNumber = formData.itinerary.length + 1;
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { ...newItineraryDay, day: dayNumber }]
    }));
    setNewItineraryDay({ day: dayNumber + 1, title: '', activities: '' });
  };

  const removeItineraryDay = (index) => {
    setFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== index)
                         .map((item, i) => ({ ...item, day: i + 1 }))
    }));
    setNewItineraryDay(prev => ({ ...prev, day: formData.itinerary.length }));
  };

  const updateItineraryField = (index, field, value) => {
    const newItinerary = [...formData.itinerary];
    newItinerary[index] = { ...newItinerary[index], [field]: value };
    setFormData(prev => ({ ...prev, itinerary: newItinerary }));
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

    // Prepare payload
    const payload = {
       ...formData,
       images: formData.images.map(img => img.url), // Send only URLs
       itinerary: JSON.stringify(formData.itinerary), // Send itinerary as a JSON string
    };

    // Clean up payment fields if 'full'
    if (payload.paymentType === 'full') {
        delete payload.downpaymentType;
        delete payload.downpaymentValue;
    }

    // Remove availabilityStatus before sending, use isAvailable
    delete payload.availabilityStatus;
    delete payload.difficulty; // Remove difficulty before sending

    try {
      if (editingTour) {
        await DataService.updateTour(editingTour._id, payload);
        alert('Tour updated successfully!');
      } else {
        await DataService.createTour(payload);
        alert('Tour created successfully!');
      }
      setShowModal(false);
      fetchTours();
    } catch (error) {
      console.error('Error saving tour:', error);
      const message = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Failed to save tour: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };


const handleEdit = (tour) => {
  setEditingTour(tour);

  const processedImages = Array.isArray(tour.images)
    ? tour.images.map((imgUrl, index) => ({
        url: imgUrl,
        serverId: imgUrl.split('/').pop() || `img-${index}`,
        name: imgUrl.split('/').pop() || `image-${index}.jpg`,
      }))
    : [];

  setFormData({
    ...initialFormState,
    ...tour,
    startDate: formatDateForInput(tour.startDate),
    endDate: formatDateForInput(tour.endDate),
    images: processedImages,
    itinerary: Array.isArray(tour.itinerary) ? tour.itinerary : [],
    paymentType: tour.paymentType || 'full',
    downpaymentType: tour.downpaymentType || 'percentage',
    downpaymentValue: tour.downpaymentValue || (tour.paymentType === 'downpayment' ? 20 : ''),
    availabilityStatus: tour.isAvailable ? 'available' : 'unavailable',
    category: tour.category || '', // Ensure category is set
    difficulty: undefined, // Explicitly undefined as it's removed
  });

  setNewItineraryDay({ day: (Array.isArray(tour.itinerary) ? tour.itinerary.length : 0) + 1, title: '', activities: '' });

  setShowModal(true);
};

  const handleArchive = async (tourId) => { if (window.confirm('Are you sure you want to archive this tour?')) { try { await DataService.archiveTour(tourId); alert('Tour archived successfully!'); fetchTours(); } catch (error) { alert('Failed to archive tour.'); } } };
  const handleRestore = async (tourId) => { if (window.confirm('Are you sure you want to restore this tour?')) { try { await DataService.unarchiveTour(tourId); alert('Tour restored successfully!'); fetchTours(); } catch (error) { alert('Failed to restore tour.'); } } };
  const handleDelete = async (tourId, tourTitle) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE (${tourTitle})? This action cannot be undone and will fail if there are active bookings.`)) {
      try {
        await DataService.deleteTour(tourId);
        toast.success('Tour permanently deleted!'); // Changed from alert()
        fetchTours();
      } catch (error) {
        console.error('Failed to delete tour:', error);
        // This will display the specific error from the server
        const errorMessage = error.response?.data?.message || `Failed to delete tour: ${error.message || 'Unknown error'}`;
        toast.error(errorMessage); // Changed from alert()
      }
    }
  };
  const handleToggleAvailability = async (tour) => { const action = tour.isAvailable ? 'unavailable' : 'available'; if (window.confirm(`Are you sure you want to mark this tour as ${action}?`)) { try { await DataService.updateTour(tour._id, { isAvailable: !tour.isAvailable }); fetchTours(); } catch (error) { alert('Failed to toggle availability.'); } } };

  const filteredTours = Array.isArray(tours) ? tours.filter(tour => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
        tour.title?.toLowerCase().includes(lowerSearchTerm) ||
        tour.destination?.toLowerCase().includes(lowerSearchTerm) ||
        tour.category?.toLowerCase().includes(lowerSearchTerm)
    );
  }) : [];


   return (
    <div className="p-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Tours</h1>
          <p className="text-gray-600">Add, edit, and manage your tour packages</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Tour
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search by title, destination, or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-4">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Active Tours</option>
              <option value="archived">Archived Tours</option>
              <option value="all">All Tours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tour Cards Grid */}
       {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.length > 0 ? filteredTours.map((tour) => (
            <div key={tour._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-opacity ${tour.archived ? 'opacity-60' : ''}`}>
              {/* Card Image and Actions */}
              <div className="h-48 bg-gray-200 relative">
                <img
                  src={tour.images && tour.images.length > 0 ? getImageUrl(tour.images[0]) : 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'}
                  alt={tour.title}
                  className="w-full h-full object-cover"
                />
                 <div className="absolute top-2 right-2 flex gap-1">
                  {tour.archived ? (
                    <>
                      <button onClick={() => handleRestore(tour._id)} className="p-2 bg-white rounded-full shadow-md" title="Restore Tour"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                      <button onClick={() => handleDelete(tour._id, tour.title)} className="p-2 bg-white rounded-full shadow-md" title="PERMANENTLY DELETE"><Trash className="w-4 h-4 text-red-700" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(tour)} className="p-2 bg-white rounded-full shadow-md" title="Edit Tour"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleAvailability(tour)} className="p-2 bg-white rounded-full shadow-md" title={tour.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{tour.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleArchive(tour._id)} className="p-2 bg-white rounded-full shadow-md" title="Archive Tour"><Archive className="w-4 h-4 text-red-600" /></button>
                    </>
                  )}
                </div>
                 <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${tour.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tour.isAvailable ? 'Available' : 'Unavailable'}
                 </span>
              </div>
              {/* Card Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold truncate">{tour.title}</h3>
                <p className="text-2xl font-bold text-blue-600">₱{tour.price?.toLocaleString()}/person</p>
                <p className="text-sm text-gray-500 truncate">{tour.destination}</p>
                 <p className="text-xs text-gray-400 mt-1">{tour.duration}</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No {filterStatus} tours found.</h3>
               <p className="text-gray-500">
                {searchTerm ? `No tours match "${searchTerm}".` : `There are no ${filterStatus} tours.`}
               </p>
            </div>
          )}
        </div>
      )}

      {/* Modal for Add/Edit Tour */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingTour ? 'Edit Tour' : 'Add New Tour'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
              <form id="tourForm" onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-6 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Tour Title *</label><input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                    <input
                        type="text"
                        name="destination"
                        required
                        value={formData.destination}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-lg"
                        pattern="[A-Za-z ]*" // Only allow letters and spaces
                        title="Destination should only contain letters and spaces."
                     />
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label><input type="text" name="duration" required value={formData.duration} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g., 3 Days, 2 Nights" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label><input type="date" name="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label><input type="date" name="endDate" required value={formData.endDate} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Price per Person (₱) *</label><input type="number" name="price" required min="0" value={formData.price} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Group Size *</label><input type="number" name="maxGroupSize" required min="1" value={formData.maxGroupSize} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <input
                        type="text"
                        name="category"
                        required
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-lg"
                        placeholder="e.g., Adventure, Nature, Beach"
                      />
                  </div>
                   <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                        <select name="availabilityStatus" value={formData.availabilityStatus} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">
                           <option value="available">Available</option>
                           <option value="unavailable">Unavailable</option>
                        </select>
                   </div>
                </div>

                 <div className="border p-4 rounded-md bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><DollarSign size={18}/> Payment Options</h3>
                    <div className="flex gap-6 mb-4">
                        <label className="flex items-center cursor-pointer"><input type="radio" name="paymentType" value="full" checked={formData.paymentType === 'full'} onChange={handlePaymentTypeChange} className="mr-2"/> Full Payment Only</label>
                        <label className="flex items-center cursor-pointer"><input type="radio" name="paymentType" value="downpayment" checked={formData.paymentType === 'downpayment'} onChange={handlePaymentTypeChange} className="mr-2"/> Allow Downpayment</label>
                    </div>
                    {formData.paymentType === 'downpayment' && (
                        <div className="border-t pt-4 space-y-3 animate-in fade-in duration-300">
                             <p className="text-sm text-gray-600">Configure Downpayment:</p>
                             <div className="flex gap-6 mb-2">
                               <label className="flex items-center cursor-pointer"><input type="radio" name="downpaymentType" value="percentage" checked={formData.downpaymentType === 'percentage'} onChange={handleInputChange} className="mr-2"/> Percentage (%)</label>
                               <label className="flex items-center cursor-pointer"><input type="radio" name="downpaymentType" value="fixed" checked={formData.downpaymentType === 'fixed'} onChange={handleInputChange} className="mr-2"/> Fixed Amount (₱)</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{formData.downpaymentType === 'percentage' ? 'Percentage Value (1-99)' : 'Fixed Amount (PHP)'} *</label>
                                 <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">{formData.downpaymentType === 'percentage' ? '%' : '₱'}</span>
                                    <input name="downpaymentValue" type="number" step={formData.downpaymentType === 'percentage' ? "1" : "0.01"} min="1" max={formData.downpaymentType === 'percentage' ? "99" : undefined} value={formData.downpaymentValue} onChange={handleInputChange} placeholder={formData.downpaymentType === 'percentage' ? 'e.g., 20' : 'e.g., 500'} className="p-2 pl-7 border rounded w-full md:w-1/2" required/>
                                </div>
                                 <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={12}/> {formData.downpaymentType === 'fixed' ? 'This amount will be multiplied by the number of guests.' : 'This percentage will be calculated based on the total booking price.'} </p>
                            </div>
                        </div>
                    )}
                 </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea name="description" required rows="4" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inclusions</label>
                  <div className="flex gap-2 mb-2"><input type="text" value={newInclusion} onChange={(e) => setNewInclusion(e.target.value)} className="flex-1 p-2 border rounded-lg" placeholder="Add inclusion" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInclusion(); } }} /><button type="button" onClick={addInclusion} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button></div>
                  <div className="flex flex-wrap gap-2">{formData.inclusions?.map((item, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{item}<button type="button" onClick={() => removeInclusion(index)}><X className="w-3 h-3" /></button></span>))}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exclusions</label>
                  <div className="flex gap-2 mb-2"><input type="text" value={newExclusion} onChange={(e) => setNewExclusion(e.target.value)} className="flex-1 p-2 border rounded-lg" placeholder="Add exclusion" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExclusion(); } }} /><button type="button" onClick={addExclusion} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button></div>
                   <div className="flex flex-wrap gap-2">{formData.exclusions?.map((item, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{item}<button type="button" onClick={() => removeExclusion(index)}><X className="w-3 h-3" /></button></span>))}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Itinerary</label>
                   <div className="space-y-3 mb-4">{formData.itinerary?.map((item, index) => (<div key={index} className="p-3 border rounded-lg bg-gray-50"><div className="flex justify-between items-center mb-2"><label className="font-semibold text-gray-800">Day {item.day}</label><button type="button" onClick={() => removeItineraryDay(index)} className="text-red-500 text-xs hover:text-red-700">Remove</button></div><input value={item.title || ''} onChange={(e) => updateItineraryField(index, 'title', e.target.value)} className="w-full p-2 border rounded-lg mb-2" placeholder="Day Title"/><textarea value={item.activities || ''} onChange={(e) => updateItineraryField(index, 'activities', e.target.value)} className="w-full p-2 border rounded-lg" rows="2" placeholder="Activities & Details..."/></div>))}</div>
                   <div className="p-3 border-2 border-dashed rounded-lg"><h4 className="font-semibold text-gray-700">Add Day {newItineraryDay.day}</h4><div className="space-y-2 mt-2"><input value={newItineraryDay.title} onChange={(e) => setNewItineraryDay(prev => ({ ...prev, title: e.target.value }))} className="w-full p-2 border rounded-lg" placeholder="Day Title"/><textarea value={newItineraryDay.activities} onChange={(e) => setNewItineraryDay(prev => ({ ...prev, activities: e.target.value }))} className="w-full p-2 border rounded-lg" rows="2" placeholder="Activities & Details..."/><button type="button" onClick={addItineraryDay} className="text-sm px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Add Day {newItineraryDay.day}</button></div></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images (First image is main)</label>
                  <ImageUpload onImagesChange={handleImagesChange} existingImages={formData.images} maxImages={10} category="tours"/>
                </div>
              </form>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" form="tourForm" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{submitting ? 'Saving...' : (editingTour ? 'Update Tour' : 'Create Tour')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTours;