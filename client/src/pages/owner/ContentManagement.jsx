import React, { useState, useEffect } from 'react';
import { Save, Edit3, Eye, FileText, Globe, Shield, Phone, CreditCard, Image as ImageIcon } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService';
import { useApi } from '../../hooks/useApi';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('about');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const contentTabs = [
    { key: 'about', label: 'About Us', icon: FileText, description: 'Company background and story' },
    { key: 'mission', label: 'Mission', icon: Globe, description: 'Company mission statement' },
    { key: 'vision', label: 'Vision', icon: Eye, description: 'Company vision and goals' },
    { key: 'terms', label: 'Terms & Conditions', icon: Shield, description: 'Terms of service and conditions' },
    { key: 'privacy', label: 'Privacy Policy', icon: Shield, description: 'Privacy policy and data protection' },
    { key: 'contact', label: 'Contact Info', icon: Phone, description: 'Contact details and locations' },
    { key: 'bookingTerms', label: 'Booking Terms', icon: FileText, description: 'Text for the booking modal agreement.' },
  ];

  const { data: initialContentData, loading, error, refetch: fetchAllContent } = useApi(
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

  const handleContentChange = (field, value) => {
    setContent(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentToSave = content[activeTab];
      const response = await DataService.updateContent(activeTab, contentToSave);

      if (response.success && response.data) {
        setContent(prev => ({ ...prev, [activeTab]: response.data }));
        alert('Content updated successfully!');
        setEditMode(false);
      } else {
        throw new Error(response.message || "Failed to save content.");
      }
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          <p className="text-gray-600">Manage website content, policies, and information</p>
        </div>
        <div>
          {editMode ? (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="bg-gray-200 px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                {saving ? 'Saving...' : <><Save size={16} className="mr-2" /> Save</>}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
              <Edit3 size={16} className="mr-2" /> Edit Content
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {contentTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={editMode}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors disabled:cursor-not-allowed disabled:text-gray-400 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  {activeTabInfo?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                {editMode ? (
                  <input
                    type="text"
                    value={activeContent.title}
                    onChange={(e) => handleContentChange('title', e.target.value)}
                    className="w-full p-2 border rounded mt-1"
                  />
                ) : (
                  <p className="p-2 bg-gray-100 rounded mt-1">{activeContent.title}</p>
                )}
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  {editMode ? (
                    <textarea
                      value={activeContent.content}
                      onChange={(e) => handleContentChange('content', e.target.value)}
                      rows="15"
                      className="w-full p-2 border rounded mt-1"
                    />
                  ) : (
                    <div className="p-4 bg-gray-100 rounded mt-1 whitespace-pre-wrap min-h-[200px]">{activeContent.content}</div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;