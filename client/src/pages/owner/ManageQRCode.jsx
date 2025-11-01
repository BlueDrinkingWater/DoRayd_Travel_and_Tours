import React, { useState, useEffect, useCallback } from 'react';
import { Save, Edit3, CreditCard, Image as ImageIcon, AlertCircle, Loader, X } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService';
import ImageUpload from '../../components/ImageUpload';

// Define the 5 QR code slots
const QR_CODE_TYPES = [
    { type: 'paymentQR1', defaultTitle: 'Payment Method 1 (e.g., GCash)' },
    { type: 'paymentQR2', defaultTitle: 'Payment Method 2 (e.g., PayMaya)' },
    { type: 'paymentQR3', defaultTitle: 'Payment Method 3 (e.g., BPI)' },
    { type: 'paymentQR4', defaultTitle: 'Payment Method 4 (e.g., UnionBank)' },
    { type: 'paymentQR5', defaultTitle: 'Payment Method 5' },
];

// --- Child Component ---
// This component is now "dumb". It just displays data and reports changes.
// It does not fetch or save its own data.
const QRCodeEditor = ({ type, data, editMode, onChange }) => {

    const handleTitleChange = (e) => {
        onChange(type, { ...data, title: e.target.value });
    };

    const handleQRImageChange = (uploadedImages) => {
        const newContent = uploadedImages.length > 0 ? uploadedImages[0].url : '';
        onChange(type, { ...data, content: newContent });
    };

    const imageUrl = data.content 
        ? (data.content.startsWith('http') ? data.content : `${SERVER_URL}${data.content.startsWith('/') ? '' : '/'}${data.content}`) 
        : null;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> 
                {data.title}
            </h3>
            
            {editMode ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method Name</label>
                        <input
                            type="text"
                            value={data.title}
                            onChange={handleTitleChange}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <ImageUpload
                        onImagesChange={handleQRImageChange}
                        existingImages={data.content ? [{ url: data.content, serverId: 'qr-' + type }] : []}
                        maxImages={1}
                        category="qrcodes"
                    />
                    {/* NO SAVE/CANCEL BUTTONS HERE ANYMORE */}
                </div>
            ) : (
                <div className="w-full min-h-64 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={data.title}
                            className="max-w-xs max-h-64 object-contain rounded-md shadow-md" 
                        />
                    ) : (
                        <div className="text-center text-gray-500">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                            <p>No QR Code has been uploaded.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Parent Component ---
// This component now manages all state and saving.
const ManageQRCode = () => {
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [qrStates, setQrStates] = useState({}); // Holds the state for all 5 QRs

    // Fetches all 5 QR codes at once
    const fetchAllQRData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchPromises = QR_CODE_TYPES.map(async (qr) => {
                const res = await DataService.fetchContent(qr.type);
                if (res.success && res.data) {
                    // Ensure a title exists, falling back to defaultTitle
                    return { [qr.type]: { ...res.data, title: res.data.title || qr.defaultTitle } };
                }
                // Handle new/empty content
                return { [qr.type]: { type: qr.type, title: qr.defaultTitle, content: '' } };
            });

            // Promise.allSettled will run all promises even if some fail
            const results = await Promise.allSettled(fetchPromises);
            
            const newStates = {};
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    Object.assign(newStates, result.value);
                } else {
                    // Handle individual fetch error
                    const qrType = QR_CODE_TYPES[index].type;
                    newStates[qrType] = { type: qrType, title: QR_CODE_TYPES[index].defaultTitle, content: '', error: true };
                }
            });

            setQrStates(newStates);

        } catch (err) {
            console.error("Failed to fetch QR codes:", err);
            setError("Failed to load all QR code data. Please refresh the page.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data on initial component load
    useEffect(() => {
        fetchAllQRData();
    }, [fetchAllQRData]);

    // This function is passed down to the child to update the parent's state
    // --- THIS IS THE CORRECTED LINE ---
    const handleQrChange = (type, newData) => {
        setQrStates(prev => ({
            ...prev,
            [type]: newData
        }));
    };

    // --- NEW SAVE ALL FUNCTION ---
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Create an array of save promises
            const savePromises = Object.keys(qrStates).map(type => {
                const { title, content } = qrStates[type];
                return DataService.updateContent(type, { title, content });
            });

            // Run all save promises
            await Promise.all(savePromises);

            alert('All QR Codes updated successfully!');
            setEditMode(false);
            // Refetch data to confirm
            await fetchAllQRData();

        } catch (err) {
            console.error("Failed to save QR Codes:", err);
            alert(`Error saving QR Codes: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        // Refetch the original data to discard any changes
        fetchAllQRData();
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6 text-white">
                <div>
                    <h1 className="text-3xl font-bold text-white">Manage Payment QR Codes</h1>
                    <p className="text-white">Upload and update the QR codes used for customer payments.</p>
                </div>
                <div>
                    {/* --- NEW BUTTON LOGIC --- */}
                    {editMode ? (
                        <div className="flex gap-2">
                            <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 rounded-lg flex items-center">
                                <X size={16} className="mr-2" /> Cancel
                            </button>
                            <button onClick={handleSaveAll} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                                {saving ? <Loader size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} 
                                Save All Changes
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                            <Edit3 size={16} className="mr-2" /> Edit All
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-white">Loading QR Codes...</div>
            ) : error ? (
                <div className="text-center py-12 text-red-300 bg-red-900/50 rounded-lg p-6">
                    <AlertCircle className="mx-auto h-12 w-12" />
                    <p className="mt-2">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {QR_CODE_TYPES.map(qr => {
                        const data = qrStates[qr.type];
                        if (!data) return null; // Don't render if data isn't ready
                        
                        // Handle individual load error
                        if (data.error) {
                             return (
                                <div className="bg-white rounded-lg shadow-sm border border-red-300 p-6" key={qr.type}>
                                    <h3 className="text-lg font-semibold text-red-700 mb-4">{qr.defaultTitle}</h3>
                                    <p className="text-red-600">Failed to load data for this item.</p>
                                </div>
                             )
                        }

                        return (
                            <QRCodeEditor
                                key={qr.type}
                                type={qr.type}
                                data={data} // Pass the specific QR state
                                editMode={editMode}
                                onChange={handleQrChange} // Pass the update function
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ManageQRCode;