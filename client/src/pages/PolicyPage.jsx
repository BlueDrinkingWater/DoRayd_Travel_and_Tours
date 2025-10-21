import React from 'react';
import { useApi } from '../hooks/useApi';
import DataService from '../components/services/DataService';
import { Shield, FileText } from 'lucide-react';

const PolicyPage = () => {
    const { data: termsData, loading: termsLoading, error: termsError } = useApi(() => DataService.fetchContent('terms'));
    const { data: privacyData, loading: privacyLoading, error: privacyError } = useApi(() => DataService.fetchContent('privacy'));
    const { data: bookingTermsData, loading: bookingTermsLoading, error: bookingTermsError } = useApi(() => DataService.fetchContent('bookingTerms'));

    const loading = termsLoading || privacyLoading || bookingTermsLoading;
    const error = termsError || privacyError || bookingTermsError;

    const renderContentSection = (title, contentData, Icon) => (
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
                <Icon className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
            </div>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {contentData || 'Content not available.'}
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
                {renderContentSection('Terms & Agreement', termsData?.data?.content, FileText)}
                {renderContentSection('Booking Terms', bookingTermsData?.data?.content, FileText)}
                {renderContentSection('Privacy Policy', privacyData?.data?.content, Shield)}
            </div>
        </div>
    );
};

export default PolicyPage;