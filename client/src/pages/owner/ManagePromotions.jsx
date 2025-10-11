import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X, Tag, Calendar, Percent, CircleDot } from 'lucide-react';
import DataService from '../../components/services/DataService';
import { useApi } from '../../hooks/useApi';

const ManagePromotions = () => {
    const { data: promotionsData, loading, error, refetch: fetchPromotions } = useApi(() => DataService.fetchAllPromotionsAdmin(), []);
    const promotions = promotionsData?.data || [];
    const [cars, setCars] = useState([]);
    const [tours, setTours] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', discountType: 'percentage', discountValue: '',
        applicableTo: 'all', itemIds: [], startDate: '', endDate: '', isActive: true
    });

    useEffect(() => {
        if (showModal) {
            const fetchServices = async () => {
                const [carsResponse, toursResponse] = await Promise.all([
                    DataService.fetchAllCars({ limit: 1000 }), // fetch all for selection
                    DataService.fetchAllTours({ limit: 1000 })
                ]);
                if (carsResponse.success) setCars(carsResponse.data);
                if (toursResponse.success) setTours(toursResponse.data);
            };
            fetchServices();
        }
    }, [showModal]);

    const handleOpenModal = (promo = null) => {
        if (promo) {
            setEditingPromotion(promo);
            setFormData({
                ...promo,
                startDate: promo.startDate.split('T')[0],
                endDate: promo.endDate.split('T')[0],
                itemIds: promo.itemIds || [],
            });
        } else {
            setEditingPromotion(null);
            setFormData({
                title: '', description: '', discountType: 'percentage', discountValue: '',
                applicableTo: 'all', itemIds: [], startDate: '', endDate: '', isActive: true
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            if (editingPromotion) {
                await DataService.updatePromotion(editingPromotion._id, formData);
            } else {
                await DataService.createPromotion(formData);
            }
            fetchPromotions();
            setShowModal(false);
        } catch (err) {
            alert('Failed to save promotion: ' + (err.message || 'Please check your inputs'));
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
                                    <p className="text-sm text-gray-600 mb-4">{promo.description}</p>
                                    <div className="text-sm space-y-2">
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
                                            <span>{new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}</span>
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
                            <div><label className="text-sm font-medium">Description</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded-md mt-1" rows="3"></textarea></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium">Discount Type</label><select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })} className="w-full p-2 border rounded-md mt-1"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                                <div><label className="text-sm font-medium">Discount Value</label><input type="number" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: e.target.value })} className="w-full p-2 border rounded-md mt-1" /></div>
                            </div>
                            <div><label className="text-sm font-medium">Applicable To</label><select value={formData.applicableTo} onChange={handleApplicableToChange} className="w-full p-2 border rounded-md mt-1"><option value="all">All Services</option><option value="car">Specific Cars</option><option value="tour">Specific Tours</option></select></div>
                            {formData.applicableTo === 'car' && (<>
                                <label className="text-sm font-medium">Select Cars</label>
                                <select multiple value={formData.itemIds} onChange={handleItemIdsChange} className="w-full p-2 border rounded-md h-40 mt-1">{cars.map(car => (<option key={car._id} value={car._id}>{car.brand} {car.model}</option>))}</select>
                            </>)}
                            {formData.applicableTo === 'tour' && (<>
                                <label className="text-sm font-medium">Select Tours</label>
                                <select multiple value={formData.itemIds} onChange={handleItemIdsChange} className="w-full p-2 border rounded-md h-40 mt-1">{tours.map(tour => (<option key={tour._id} value={tour._id}>{tour.title}</option>))}</select>
                            </>)}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium">Start Date</label><input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-2 border rounded-md mt-1" /></div>
                                <div><label className="text-sm font-medium">End Date</label><input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2 border rounded-md mt-1" /></div>
                            </div>
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