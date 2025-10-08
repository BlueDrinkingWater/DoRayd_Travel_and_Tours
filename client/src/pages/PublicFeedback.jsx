import React from 'react';
import { Star, User, MessageSquare } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import DataService from '../components/services/DataService';

const PublicFeedback = () => {
    const { data: publicFeedbackData, loading, error } = useApi(DataService.getPublicFeedback);
    const feedback = publicFeedbackData?.data || [];

    if (loading) {
        return <div className="text-center py-12">Loading feedback...</div>;
    }

    if (error) {
        return <div className="text-center py-12 text-red-500">Error: {error.message}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Customer Feedback</h1>
                    <p className="text-lg text-gray-600">See what our valued customers are saying about their experience.</p>
                </div>

                <div className="space-y-8">
                    {feedback.length > 0 ? feedback.map(item => (
                        <div key={item._id} className="p-6 border rounded-lg bg-white shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-semibold text-gray-800">
                                            {item.isAnonymous ? 'Anonymous Customer' : `${item.user?.firstName} ${item.user?.lastName}`}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 mb-3">{item.comment}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                        <span className="mx-2">•</span>
                                        {item.serviceType} service
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-16">
                            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No public feedback available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicFeedback;