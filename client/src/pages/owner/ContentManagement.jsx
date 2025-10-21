import React, { useState, useEffect, useCallback } from 'react';
import { Save, Edit3, Eye, FileText, Globe, Shield, Phone, CreditCard, Image as ImageIcon, MapPin, Clock } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';
import LocationPickerMap from './LocationPickerMap.jsx';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const contentTabs = [
    { key: 'about', label: 'About Us', icon: FileText, description: 'Company background and story.', type: 'textarea' },
    { key: 'aboutImage', label: 'About Page Image', icon: ImageIcon, description: 'The main image displayed on the About Us page.', type: 'image' },
    { key: 'mission', label: 'Mission', icon: Globe, description: 'Company mission statement.', type: 'textarea' },
    { key: 'vision', label: 'Vision', icon: Eye, description: 'Company vision and goals.', type: 'textarea' },
    { key: 'terms', label: 'Terms & Conditions', icon: Shield, description: 'Terms of service and conditions.', type: 'textarea' },
    { key: 'privacy', label: 'Privacy Policy', icon: Shield, description: 'Privacy policy and data protection.', type: 'textarea' },
    { key: 'bookingTerms', label: 'Booking Terms', icon: FileText, description: 'Text for the booking modal agreement.', type: 'textarea' },
    { key: 'bookingDisclaimer', label: 'Booking Disclaimer', icon: FileText, description: 'A short disclaimer in the booking modal.', type: 'textarea' },
    { key: 'contactPhone', label: 'Contact Phone', icon: Phone, description: 'Publicly displayed phone number.', type: 'input' },
    { key: 'contactEmail', label: 'Contact Email', icon: Phone, description: 'Publicly displayed email address.', type: 'input' },
    { key: 'contactAddress', label: 'Contact Address', icon: MapPin, description: 'Main office or contact address.', type: 'textarea' },
    { key: 'contactHours', label: 'Business Hours', icon: Clock, description: 'Company operating hours.', type: 'input' },
    { key: 'officeLocation', label: 'Office Location Map', icon: MapPin, description: 'Click on the map to set the office location.', type: 'map' },
  ];

  const { data: initialContentData, loading, refetch: fetchAllContent } = useApi(
    () => Promise.all(contentTabs.map(tab => DataService.fetchContent(tab.key)))
  );
  
  const [content, setContent] = useState({});

  useEffect(() => {
    if (initialContentData) {
      const newContentState = {};
      initialContentData.forEach((result, index) => {
        const tabKey = contentTabs[index].key;
        if (result.success && result.data) {
          newContentState[tabKey] = result.data;
        } else {
          newContentState[tabKey] = { title: contentTabs[index].label, content: '' };
        }
      });
      setContent(newContentState);
    }
  }, [initialContentData]);

  const handleContentChange = useCallback((tabKey, field, value) => {
    setContent(prev => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        [field]: value
      }
    }));
  }, []);

  const handleActiveTabContentChange = useCallback((field, value) => {
    handleContentChange(activeTab, field, value);
  }, [activeTab, handleContentChange]);

  const handleImageChange = useCallback((uploadedImages) => {
    handleActiveTabContentChange('content', uploadedImages.length > 0 ? uploadedImages[0].url : '');
  }, [handleActiveTabContentChange]);

  const handleLocationSelect = useCallback((latlng) => {
    if (latlng) {
      const { lat, lng } = latlng;
      handleContentChange('officeLocation', 'content', `${lat},${lng}`);
      
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.display_name) {
            handleContentChange('contactAddress', 'content', data.display_name);
          }
        })
        .catch(error => console.error("Error fetching address:", error));
    }
  }, [handleContentChange]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all modified content instead of just the active tab
      const updatePromises = Object.keys(content).map(key => {
        // A simple check to see if the content might have been modified
        // This could be improved with a more robust dirty-checking mechanism if needed
        const originalContent = initialContentData.find((res, index) => contentTabs[index].key === key)?.data?.content;
        if (content[key].content !== originalContent) {
          return DataService.updateContent(key, content[key]);
        }
        return Promise.resolve(null);
      });

      const results = await Promise.all(updatePromises);
      
      const failed = results.filter(res => res && !res.success);
      if (failed.length > 0) {
        throw new Error('Some content failed to save.');
      }

      alert('Content updated successfully!');
      setEditMode(false);
      fetchAllContent(); // Refetch all content to get fresh state
    } catch (error) {
      console.error("Failed to save content:", error);
      alert(`Error saving content: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    fetchAllContent();
  }

  const activeContent = content[activeTab] || { title: '', content: '' };
  const activeTabInfo = contentTabs.find(tab => tab.key === activeTab);

  const renderInputField = (tabKey) => {
    const currentTabInfo = contentTabs.find(tab => tab.key === tabKey);
    const currentContent = content[tabKey] || { title: '', content: '' };

    if (currentTabInfo.type === 'image') {
      return editMode && activeTab === tabKey ? (
        <ImageUpload
          onImagesChange={(images) => handleContentChange(tabKey, 'content', images.length > 0 ? images[0].url : '')}
          existingImages={currentContent.content ? [{ url: currentContent.content, serverId: 'content-image' }] : []}
          maxImages={1}
          category="content"
        />
      ) : (
        <div className="p-4 bg-gray-100 rounded mt-1 min-h-[200px] flex items-center justify-center">
            {currentContent.content ? (
              <img src={currentContent.content} alt={currentContent.title} className="max-w-sm rounded max-h-64 object-contain" />
            ) : (<p className="text-gray-500">No image uploaded.</p>)}
        </div>
      );
    }

    if (currentTabInfo.type === 'map') {
        const coords = currentContent.content?.split(',').map(parseFloat);
        const initialPosition = coords?.length === 2 && coords.every(isFinite) 
            ? { lat: coords[0], lng: coords[1] } 
            : null;

        return editMode && activeTab === tabKey ? (
            <LocationPickerMap onLocationSelect={handleLocationSelect} initialPosition={initialPosition} />
        ) : (
            <div className="p-4 bg-gray-100 rounded mt-1 min-h-[200px] flex items-center justify-center text-gray-700">
                {currentContent.content || 'No location set.'}
            </div>
        );
    }

    if (editMode && activeTab === tabKey) {
      return currentTabInfo.type === 'textarea' ? (
        <textarea
          value={currentContent.content}
          onChange={(e) => handleContentChange(tabKey, 'content', e.target.value)}
          rows="15"
          className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      ) : (
        <input
          type={tabKey === 'contactPhone' ? 'tel' : 'text'}
          pattern={tabKey === 'contactPhone' ? '[0-9]*' : undefined}
          value={currentContent.content}
          onChange={(e) => handleContentChange(tabKey, 'content', e.target.value)}
          className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      );
    }
    
    return (
        <div className="p-4 bg-gray-100 rounded mt-1 whitespace-pre-wrap min-h-[200px] text-gray-800">
            {currentContent.content || 'No content set.'}
        </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage website content, policies, and information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border p-4 space-y-1 sticky top-24">
            {contentTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setEditMode(false); }}
                  disabled={editMode && activeTab !== tab.key}
                  className={`flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:text-gray-400 disabled:bg-gray-50 ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                </button>
              );
            })}
            </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border p-6">
            {loading ? (
                <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{activeTabInfo?.label}</h2>
                            <p className="text-sm text-gray-500 mt-1">{activeTabInfo?.description}</p>
                        </div>
                        <div>
                            {editMode ? (
                                <div className="flex gap-2">
                                <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center text-sm font-semibold">
                                    {saving ? 'Saving...' : <><Save size={14} className="mr-2" /> Save Changes</>}
                                </button>
                                </div>
                            ) : (
                                <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center text-sm font-semibold">
                                <Edit3 size={14} className="mr-2" /> Edit
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="border-t pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        {editMode ? (
                        <input type="text" value={activeContent.title} onChange={(e) => handleActiveTabContentChange('title', e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                        ) : (
                        <p className="p-3 bg-gray-100 rounded-lg font-semibold">{activeContent.title}</p>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                        {renderInputField(activeTab)}
                    </div>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;