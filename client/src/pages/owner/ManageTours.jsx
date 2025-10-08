import { useState, useEffect } from 'react';
import { Plus, Edit3, Archive, Eye, EyeOff, Search, MapPin, X, RotateCcw } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import { useApi } from '../../hooks/useApi.jsx';

const ManageTours = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [submitting, setSubmitting] = useState(false);

  const { data: toursData, loading, refetch: fetchTours } = useApi(() => DataService.fetchAllTours({ archived: filterStatus === 'archived' }), [filterStatus]);
  const tours = toursData?.data || [];

  const initialFormState = {
    title: '', description: '', destination: '', duration: '', price: '',
    startDate: '', endDate: '', // Add date fields
    maxGroupSize: 10, difficulty: 'easy', category: '', inclusions: [],
    exclusions: [], itinerary: [], images: [], isAvailable: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [newInclusion, setNewInclusion] = useState('');
  const [newExclusion, setNewExclusion] = useState('');

  const categoryOptions = ['Adventure', 'Cultural', 'Nature', 'City', 'Beach', 'Mountain', 'Historical', 'Food'];

  const resetForm = () => {
    setFormData(initialFormState);
    setNewInclusion('');
    setNewExclusion('');
    setEditingTour(null);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleImagesChange = (uploadedImages) => setFormData(prev => ({ ...prev, images: uploadedImages.map(img => ({ url: img.url, serverId: img.serverId })) }));

  const addInclusion = () => { if (newInclusion.trim()) { setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion.trim()] })); setNewInclusion(''); } };
  const removeInclusion = (index) => setFormData(prev => ({ ...prev, inclusions: prev.inclusions.filter((_, i) => i !== index) }));
  const addExclusion = () => { if (newExclusion.trim()) { setFormData(prev => ({ ...prev, exclusions: [...prev.exclusions, newExclusion.trim()] })); setNewExclusion(''); } };
  const removeExclusion = (index) => setFormData(prev => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== index) }));
  const addItineraryDay = () => setFormData(prev => ({ ...prev, itinerary: [...prev.itinerary, { day: prev.itinerary.length + 1, activities: '' }] }));
  const removeItineraryDay = (index) => setFormData(prev => ({ ...prev, itinerary: prev.itinerary.filter((_, i) => i !== index) }));
  const updateItinerary = (index, value) => { const newItinerary = [...formData.itinerary]; newItinerary[index].activities = value; setFormData(prev => ({ ...prev, itinerary: newItinerary })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...formData, images: formData.images.map(img => img.url) };
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
      alert('Failed to save tour');
    } finally {
      setSubmitting(false);
    }
  };

const handleEdit = (tour) => {
  setEditingTour(tour);
  
  // Handle images properly - check if they're strings or objects
  const processedImages = Array.isArray(tour.images) 
    ? tour.images.map(img => {
        if (typeof img === 'string') {
          // If it's a string URL
          return { 
            url: img, 
            serverId: img.split('/').pop().split('.')[0],
            name: img.split('/').pop(),
            uploadedAt: new Date().toISOString()
          };
        } else {
          // If it's already an object
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
    ...tour,
    startDate: formatDateForInput(tour.startDate),
    endDate: formatDateForInput(tour.endDate),
    images: processedImages
  });
  setShowModal(true);
};
  
  const handleArchive = async (tourId) => { if (window.confirm('Are you sure you want to archive this tour?')) { try { await DataService.archiveTour(tourId); alert('Tour archived successfully!'); fetchTours(); } catch (error) { alert('Failed to archive tour.'); } } };
  const handleRestore = async (tourId) => { if (window.confirm('Are you sure you want to restore this tour?')) { try { await DataService.unarchiveTour(tourId); alert('Tour restored successfully!'); fetchTours(); } catch (error) { alert('Failed to restore tour.'); } } };
  const handleToggleAvailability = async (tourId) => { const tour = tours.find(t => t._id === tourId); if (tour) { try { await DataService.updateTour(tourId, { ...tour, isAvailable: !tour.isAvailable }); fetchTours(); } catch (error) { alert('Failed to toggle availability.'); } } };
  
  const filteredTours = Array.isArray(tours) ? tours.filter(tour => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return tour.title?.toLowerCase().includes(lowerSearchTerm) || tour.destination?.toLowerCase().includes(lowerSearchTerm) || tour.category?.toLowerCase().includes(lowerSearchTerm);
  }) : [];

  return (
    <div className="p-6">
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
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.length > 0 ? filteredTours.map((tour) => (
            <div key={tour._id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="h-48 bg-gray-200 relative">
                <img src={tour.images && tour.images.length > 0 ? (typeof tour.images[0] === 'string' ? `${SERVER_URL}${tour.images[0]}` : `${SERVER_URL}${tour.images[0].url || tour.images[0]}`): ''} 
  alt={tour.title} 
  className="w-full h-full object-cover" 
/>
                <div className="absolute top-2 right-2 flex gap-1">
                  {tour.archived ? (
                    <button onClick={() => handleRestore(tour._id)} className="p-2 bg-white rounded-full shadow-md" title="Restore Tour"><RotateCcw className="w-4 h-4 text-green-600" /></button>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(tour)} className="p-2 bg-white rounded-full shadow-md" title="Edit Tour"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleAvailability(tour._id)} className="p-2 bg-white rounded-full shadow-md" title={tour.isAvailable ? 'Mark Unavailable' : 'Mark Available'}>{tour.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleArchive(tour._id)} className="p-2 bg-white rounded-full shadow-md" title="Archive Tour"><Archive className="w-4 h-4 text-red-600" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{tour.title}</h3>
                <p className="text-2xl font-bold text-blue-600">₱{tour.price?.toLocaleString()}/person</p>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No {filterStatus} tours found.</h3>
              <p className="text-gray-500">There are no tours matching your current filter.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900">{editingTour ? 'Edit Tour' : 'Add New Tour'}</h2><button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button></div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Tour Title *</label><input type="text" name="title" required value={formData.title} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label><input type="text" name="destination" required value={formData.destination} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label><input type="text" name="duration" required value={formData.duration} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label><input type="date" name="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label><input type="date" name="endDate" required value={formData.endDate} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Price per Person (₱) *</label><input type="number" name="price" required min="0" value={formData.price} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Group Size *</label><input type="number" name="maxGroupSize" required min="1" value={formData.maxGroupSize} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Difficulty *</label><select name="difficulty" required value={formData.difficulty} onChange={handleInputChange} className="w-full p-2 border rounded-lg"><option value="easy">Easy</option><option value="moderate">Moderate</option><option value="challenging">Challenging</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Category *</label><select name="category" required value={formData.category} onChange={handleInputChange} className="w-full p-2 border rounded-lg"><option value="">Select a category</option>{categoryOptions.map(cat => <option key={cat} value={cat.toLowerCase()}>{cat}</option>)}</select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea name="description" required rows="4" value={formData.description} onChange={handleInputChange} className="w-full p-2 border rounded-lg" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inclusions</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={newInclusion} onChange={(e) => setNewInclusion(e.target.value)} className="flex-1 p-2 border rounded-lg" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInclusion(); } }} />
                    <button type="button" onClick={addInclusion} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">{formData.inclusions.map((item, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{item}<button type="button" onClick={() => removeInclusion(index)}><X className="w-3 h-3" /></button></span>))}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exclusions</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={newExclusion} onChange={(e) => setNewExclusion(e.target.value)} className="flex-1 p-2 border rounded-lg" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExclusion(); } }} />
                    <button type="button" onClick={addExclusion} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">{formData.exclusions.map((item, index) => (<span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{item}<button type="button" onClick={() => removeExclusion(index)}><X className="w-3 h-3" /></button></span>))}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Itinerary</label>
                  {formData.itinerary.map((item, index) => (
                    <div key={index} className="mb-2 p-2 border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-semibold">Day {index + 1}</label>
                        <button type="button" onClick={() => removeItineraryDay(index)} className="text-red-500 text-xs">Remove</button>
                      </div>
                      <textarea value={item.activities} onChange={(e) => updateItinerary(index, e.target.value)} className="w-full p-2 border rounded-lg" rows="2" placeholder="Activities..." />
                    </div>
                  ))}
                  <button type="button" onClick={addItineraryDay} className="text-sm px-4 py-2 bg-gray-200 rounded-lg">Add Day</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                  <ImageUpload onImagesChange={handleImagesChange} existingImages={formData.images} maxImages={10} category="tours" />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{submitting ? 'Saving...' : (editingTour ? 'Update Tour' : 'Create Tour')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTours;