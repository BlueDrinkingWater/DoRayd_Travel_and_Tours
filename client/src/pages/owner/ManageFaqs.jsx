import React, { useState } from 'react';
import { Plus, Edit, Trash, Save, X, HelpCircle } from 'lucide-react';
import DataService from '../../components/services/DataService';
import { useApi } from '../../hooks/useApi';

const ManageFaqs = () => {
    const { data: faqsData, loading, error, refetch: fetchFaqs } = useApi(DataService.fetchAllFaqsAdmin);
    const faqs = faqsData?.data || [];

    const [showModal, setShowModal] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [formData, setFormData] = useState({ question: '', answer: '', keywords: '', category: 'General' });
    const [submitting, setSubmitting] = useState(false);

    const handleOpenModal = (faq = null) => {
        if (faq) {
            setEditingFaq(faq);
            setFormData({ ...faq, keywords: faq.keywords.join(', ') });
        } else {
            setEditingFaq(null);
            setFormData({ question: '', answer: '', keywords: '', category: 'General' });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        const payload = { ...formData, keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean) };
        try {
            if (editingFaq) {
                await DataService.updateFaq(editingFaq._id, payload);
            } else {
                await DataService.createFaq(payload);
            }
            fetchFaqs();
            setShowModal(false);
        } catch (err) {
            alert('Failed to save FAQ');
        } finally {
            setSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this FAQ?')) {
            try {
                await DataService.deleteFaq(id);
                fetchFaqs();
            } catch (err) {
                alert('Failed to delete FAQ');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage FAQs</h1>
                    <p className="text-gray-600">Create, edit, and delete frequently asked questions.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <Plus size={18} /> Add FAQ
                </button>
            </div>

            {loading && <p className="text-center py-10">Loading FAQs...</p>}
            {error && <p className="text-center py-10 text-red-500">{error.message}</p>}
            
            {!loading && !error && (
                faqs.length > 0 ? (
                    <div className="space-y-4">
                        {faqs.map(faq => (
                            <div key={faq._id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 transition-shadow hover:shadow-md">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">{faq.question}</h3>
                                        <p className="text-sm text-gray-600 mt-2">{faq.answer}</p>
                                        {faq.keywords.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {faq.keywords.map((kw, index) => (
                                                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{kw}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={() => handleOpenModal(faq)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(faq._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full"><Trash size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                        <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No FAQs found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by adding a new frequently asked question.</p>
                    </div>
                )
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                                <input value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} placeholder="Enter the question" className="w-full p-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                                <textarea value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} placeholder="Provide the answer" className="w-full p-2 border rounded-md" rows="5"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                                <input value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} placeholder="booking, payment, cancellation" className="w-full p-2 border rounded-md" />
                                <p className="text-xs text-gray-500 mt-1">Separate keywords with a comma.</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                            <button onClick={handleSave} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                                {submitting ? 'Saving...' : <><Save size={16} /> Save FAQ</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageFaqs;