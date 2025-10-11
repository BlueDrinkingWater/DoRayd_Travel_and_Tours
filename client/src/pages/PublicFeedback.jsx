import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import DataService from '../components/services/DataService';

const PublicFeedback = () => {
    const { data: publicFeedbackData, loading, error } = useApi(DataService.getPublicFeedback);
    const feedback = publicFeedbackData?.data || [];

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return <div className="text-center py-24">Loading feedback...</div>;
    }

    if (error) {
        return <div className="text-center py-24 text-red-500">Error: {error.message}</div>;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 py-16" id="reviews">
            <div className="max-w-7xl mx-auto px-6 md:px-12 xl:px-6">
                <div className="mb-10 space-y-4 px-6 md:px-0">
                    <h2 className="text-center text-3xl font-bold text-gray-800 dark:text-white md:text-4xl">
                        We have some fans.
                    </h2>
                    <p className="text-center text-lg text-gray-600 dark:text-gray-300">See what our valued customers are saying about their experience.</p>
                </div>

                {feedback.length > 0 ? (
                    <div className="md:columns-2 lg:columns-3 gap-8 space-y-8">
                        {feedback.map(item => (
                            <div key={item._id} className="aspect-auto p-8 border border-gray-100 rounded-3xl bg-white dark:bg-gray-800 dark:border-gray-700 shadow-2xl shadow-gray-600/10 dark:shadow-none break-inside-avoid">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <img
                                            className="w-12 h-12 rounded-full object-cover"
                                            src={`https://ui-avatars.com/api/?name=${item.isAnonymous ? 'A' : `${item.user?.firstName}+${item.user?.lastName}`}&background=random&color=fff`}
                                            alt="user avatar"
                                            width="400"
                                            height="400"
                                            loading="lazy"
                                        />
                                        <div>
                                            <h6 className="text-lg font-medium text-gray-700 dark:text-white">
                                                {item.isAnonymous ? 'Anonymous Customer' : `${item.user?.firstName} ${item.user?.lastName}`}
                                            </h6>
                                            <p className="text-sm text-gray-500 dark:text-gray-300">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {renderStars(item.rating)}
                                </div>
                                <p className="mt-8 text-gray-700 dark:text-gray-300">
                                    {item.comment}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg shadow-md">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No public feedback yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Be the first to share your experience!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicFeedback;