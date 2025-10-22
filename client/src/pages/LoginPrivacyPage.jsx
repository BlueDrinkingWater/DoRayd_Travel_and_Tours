import React from 'react';
import { useApi } from '../hooks/useApi';
import DataService from '../components/services/DataService';
import { Shield } from 'lucide-react';

const LoginPrivacyPage = () => {
    // Fetch ONLY the loginPrivacy content
    const { data: loginPrivacyData, loading, error } = useApi(() => DataService.fetchContent('loginPrivacy'));

    const renderContentSection = (title, contentData, Icon) => (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
                <Icon className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
            </div>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {contentData || 'Content not available. Please configure the "Login Privacy Policy" in Content Management.'}
            </div>
        </div>
    );

    if (loading) {
        return <div className="text-center py-24">Loading...</div>;
    }

    if (error) {
        return <div className="text-center py-24 text-red-500">Error loading content.</div>;
    }

    return (
        <div className="bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {renderContentSection(
                    loginPrivacyData?.data?.title || 'Login Privacy Policy', 
                    loginPrivacyData?.data?.content, 
                    Shield
                )}
            </div>
        </div>
    );
};

export default LoginPrivacyPage;