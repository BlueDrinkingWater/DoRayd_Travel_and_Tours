import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X, Tag, Calendar, Percent, CircleDot } from 'lucide-react';
import DataService from '../../components/services/DataService';
import { useApi } from '../../hooks/useApi';

const ManagePromotions = () => {
    const { data: promotionsData, loading, error, refetch: fetchPromotions } = useApi(() => DataService.fetchAllPromotionsAdmin(), []);
    const promotions = promotionsData?.data || [];
    const [cars, setCars] = useState([]);
    const [tours, setTours] = useState([]);
    const [transportServices, setTransportServices] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    
    // --- MODIFIED: Removed description, added time fields ---
    const [formData, setFormData] = useState({
        title: '',
        discountType: 'percentage',
        discountValue: '',
        applicableTo: 'all',
        itemIds: [],
        startDate: '',
        startTime: '', // Added
        endDate: '',
        endTime: '',   // Added
        isActive: true
    });

    useEffect(() => {
        if (showModal) {
            const fetchServices = async () => {
                const [carsResponse, toursResponse, transportResponse] = await Promise.all([
                    DataService.fetchAllCars({ limit: 1000 }),
                    DataService.fetchAllTours({ limit: 1000 }),
                    DataService.fetchAllTransportAdmin({ limit: 1000 })
                ]);
                if (carsResponse.success) setCars(carsResponse.data);
                if (toursResponse.success) setTours(toursResponse.data);
                if (transportResponse.success) setTransportServices(transportResponse.data);
            };
            fetchServices();
        }
    }, [showModal]);
    
    // --- NEW: Helper function to format timestamp into local date and time ---
    const formatISODateToInput = (isoString) => {
        if (!isoString) return { date: '', time: '' };
        // Use local date/time for the user's inputs
        const dateObj = new Date(isoString);
        
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');

        const date = `${year}-${month}-${day}`; // YYYY-MM-DD
        const time = `${hours}:${minutes}`; // HH:MM
        
        return { date, time };
    };

    // --- MODIFIED: To handle splitting date/time ---
    const handleOpenModal = (promo = null) => {
        if (promo) {
            // Split timestamps back into local date and time for the inputs
            const { date: sDate, time: sTime } = formatISODateToInput(promo.startDate);
            const { date: eDate, time: eTime } = formatISODateToInput(promo.endDate);
            
            setEditingPromotion(promo);
            // --- FIX: Populate all fields from the promo object ---
            setFormData({
                title: promo.title,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                applicableTo: promo.applicableTo,
                itemIds: promo.itemIds || [],
                isActive: promo.isActive,
                startDate: sDate,
                startTime: sTime,
                endDate: eDate,
                endTime: eTime,
            });
        } else {
            setEditingPromotion(null);
            setFormData({
                title: '',
                discountType: 'percentage',
                discountValue: '',
                applicableTo: 'all',
                itemIds: [],
                startDate: '',
                startTime: '',
                endDate: '',
                endTime: '',
                isActive: true
            });
        }
        setShowModal(true);
    };

    // --- MODIFIED: To combine date/time and remove description ---
    const handleSave = async () => {
        setSubmitting(true);
        try {
            // Combine local date and time.
            const fullStartDate = new Date(`${formData.startDate}T${formData.startTime || '00:00:00'}`);
            const fullEndDate = new Date(`${formData.endDate}T${formData.endTime || '23:59:59'}`);

            // Create a clean payload with only fields the model expects
            const payload = { 
                title: formData.title,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue) || 0,
                applicableTo: formData.applicableTo,
                itemIds: formData.itemIds,
                isActive: formData.isActive,
                startDate: fullStartDate.toISOString(), // Convert to UTC timestamp
                endDate: fullEndDate.toISOString(),     // Convert to UTC timestamp
            };

            if (editingPromotion) {
                await DataService.updatePromotion(editingPromotion._id, payload);
            } else {
                await DataService.createPromotion(payload);
            }
            fetchPromotions();
            setShowModal(false);
        } catch (err) {
            // Show the specific error message from the server (like the conflict error)
            const errorMessage = err.response?.data?.message || err.message || 'Please check your inputs';
            alert('Failed to save promotion: ' + errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this promotion?')) {
            try {
                await DataService.deletePromotion(id);
                fetchPromotions();
            } catch (err) {
                alert('Failed to delete promotion');
            }
        }
    };

    const handleApplicableToChange = (e) => setFormData({ ...formData, applicableTo: e.target.value, itemIds: [] });
    const handleItemIdsChange = (e) => setFormData({ ...formData, itemIds: Array.from(e.target.selectedOptions, option => option.value) });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Promotions</h1>
                    <p className="text-gray-600">Offer discounts and special deals to your customers.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <Plus size={18} /> Add Promotion
                </button>
            </div>
            
            {loading && <p className="text-center py-10">Loading promotions...</p>}
            {error && <p className="text-center py-10 text-red-500">{error.message}</p>}

            {!loading && !error && (
                promotions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {promotions.map(promo => (
                            <div key={promo._id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-gray-800">{promo.title}</h3>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {promo.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {/* description field is removed */}
                                    <div className="text-sm space-y-2 mt-2">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            {promo.discountType === 'percentage' ? <Percent size={14}/> : <Tag size={14}/>}
                                            <span>
                                                {promo.discountValue}{promo.discountType === 'percentage' ? '%' : ' PHP'} Discount
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <CircleDot size={14}/>
                                            <span className="capitalize">Applies to: {promo.applicableTo}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Calendar size={14}/>
                                            {/* --- MODIFIED: Show time as well --- */}
                                            <span>
                                                {new Date(promo.startDate).toLocaleString()} - {new Date(promo.endDate).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2 border-t pt-3">
                                    <button onClick={() => handleOpenModal(promo)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(promo._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full"><Trash size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                        <Tag className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No promotions found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new promotion.</p>
                    </div>
                )
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-bold">{editingPromotion ? 'Edit Promotion' : 'Add Promotion'}</h2>
                          <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-sm font-medium">Title</label><input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 border rounded-md mt-1" /></div>
                            
                            {/* --- REMOVED DESCRIPTION TEXTAREA --- */}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium">Discount Type</label><select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })} className="w-full p-2 border rounded-md mt-1"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                                <div><label className="text-sm font-medium">Discount Value</label><input type="number" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} className="w-full p-2 border rounded-md mt-1" /></div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Applicable To</label>
                                <select value={formData.applicableTo} onChange={handleApplicableToChange} className="w-full p-2 border rounded-md mt-1">
                                    <option value="all">All Services</option>
                                    <option value="car">Specific Cars</option>
                                    <option value="tour">Specific Tours</option>
                                    <option value="transport">Specific Transport</option>
                                </select>
                            </div>
                            {formData.applicableTo === 'car' && (<>
                                <label className="text-sm font-medium">Select Cars</label>
                                <select multiple value={formData.itemIds} onChange={handleItemIdsChange} className="w-full p-2 border rounded-md h-40 mt-1">{cars.map(car => (<option key={car._id} value={car._id}>{car.brand} {car.model}</option>))}</select>
                            </>)}
                            {formData.applicableTo === 'tour' && (<>
                                <label className="text-sm font-medium">Select Tours</label>
                                <select multiple value={formData.itemIds} onChange={handleItemIdsChange} className="w-full p-2 border rounded-md h-40 mt-1">{tours.map(tour => (<option key={tour._id} value={tour._id}>{tour.title}</option>))}</select>
                            </>)}
                            {formData.applicableTo === 'transport' && (<>
                                <label className="text-sm font-medium">Select Transport Services</label>
                                <select multiple value={formData.itemIds} onChange={handleItemIdsChange} className="w-full p-2 border rounded-md h-40 mt-1">
                                    {transportServices.map(transport => (
                                        <option key={transport._id} value={transport._id}>
                                            {transport.vehicleType} {transport.name ? `(${transport.name})` : ''} - Cap: {transport.capacity}
                                        </option>
                                    ))}
                                </select>
                            </>)}
                            
                            {/* --- MODIFIED: Added time inputs --- */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Start Date</label>
                                    <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-2 border rounded-md mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Start Time</label>
                                    <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full p-2 border rounded-md mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">End Date</label>
                                    <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2 border rounded-md mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">End Time</label>
                                    <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full p-2 border rounded-md mt-1" />
                                </div>
                            </div>
                            {/* --- END MODIFICATION --- */}

                        </div>
                        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button onClick={handleSave} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                                {submitting ? 'Saving...' : <><Save size={16} /> Save</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePromotions;