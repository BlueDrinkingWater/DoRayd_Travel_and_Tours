import React, { useState, useEffect } from 'react';
import { Save, Edit3, CreditCard, Image as ImageIcon, AlertCircle } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService';
import ImageUpload from '../../components/ImageUpload';
import { useApi } from '../../hooks/useApi';

const ManageQRCode = () => {
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const { data: qrData, loading, error, refetch: fetchQR } = useApi(() => DataService.fetchContent('paymentQR'));
    
    const [content, setContent] = useState({ title: 'Payment QR Code', content: '' });

    useEffect(() => {
        if (qrData && qrData.success && qrData.data) {
            setContent(qrData.data);
        }
    }, [qrData]);
    
    const handleQRImageChange = (uploadedImages) => {
        if (uploadedImages.length > 0) {
            setContent(prev => ({ ...prev, content: uploadedImages[0].url }));
        } else {
            setContent(prev => ({ ...prev, content: '' }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await DataService.updateContent('paymentQR', content);

            if (response.success && response.data) {
                setContent(response.data);
                alert('QR Code updated successfully!');
                setEditMode(false);
            } else {
                throw new Error(response.message || "Failed to save QR Code.");
            }
        } catch (error) {
            console.error("Failed to save QR Code:", error);
            alert(`Error saving QR Code: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        fetchQR();
    };

    return (
        <div className="p-6">
              <div className="flex items-center justify-between mb-6 text-white">
                <div>
                    <h1 className="text-3xl font-bold text-white">Manage Payment QR Code</h1>
                    <p className="text-white">Upload and update the QR code used for customer payments.</p>
                </div>
                <div>
                    {editMode ? (
                        <div className="flex gap-2">
                            <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                                {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> Save QR Code</>}
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                            <Edit3 size={16} className="mr-2" /> Edit QR Code
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {loading ? (
                    <div className="text-center py-12">Loading QR Code...</div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">
                        <AlertCircle className="mx-auto h-12 w-12" />
                        <p className="mt-2">Failed to load QR code data.</p>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" /> Current QR Code
                        </h3>
                        {editMode ? (
                            <ImageUpload
                                onImagesChange={handleQRImageChange}
                                existingImages={content.content ? [{ url: content.content, serverId: 'qr' }] : []}
                                maxImages={1}
                                category="qrcodes"
                            />
                        ) : (
                            <div className="w-full min-h-64 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                                {content.content ? (
                                    <img 
                                        src={content.content.startsWith('http') ? content.content : `${SERVER_URL}${content.content.startsWith('/') ? '' : '/'}${content.content}`} 
                                        alt="Payment QR Code" 
                                        className="max-w-xs max-h-64 object-contain rounded-md shadow-md" 
                                    />
                                ) : (
                                    <div className="text-center text-gray-500">
                                        <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                                        <p>No QR Code has been uploaded yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageQRCode;