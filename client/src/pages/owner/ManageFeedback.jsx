import React from 'react';
import { ThumbsUp, Trash2, Star, User, Heart } from 'lucide-react';
import DataService, { SERVER_URL } from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';

const ManageFeedback = () => {
    const { data: feedbackData, loading, error, refetch: fetchFeedback } = useApi(DataService.fetchAllFeedback);
    const feedbacks = feedbackData?.data || [];

    const handleApprove = async (feedbackId) => {
        await DataService.approveFeedback(feedbackId);
        fetchFeedback();
    };

    const handleDelete = async (feedbackId) => {
        if (window.confirm('Are you sure you want to delete this feedback?')) {
            await DataService.deleteFeedback(feedbackId);
            fetchFeedback();
        }
    };

    if (loading) return <div className="text-center p-10">Loading feedback...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error.message}</div>;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Manage Customer Feedback</h1>
                <p className="text-gray-600">Approve or delete feedback submitted by customers.</p>
            </div>

            {feedbacks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feedbacks.map(feedback => (
                        <div key={feedback._id} className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                            <div className="p-4 flex-grow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-500"/>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800">{feedback.user ? `${feedback.user.firstName} ${feedback.user.lastName}` : 'Anonymous'}</span>
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${feedback.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {feedback.isApproved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{feedback.comment}"</p>
                                {feedback.image && (
                                    <div className="mt-3">
                                        <img src={`${SERVER_URL}${feedback.image}`} alt="Feedback attachment" className="rounded-md max-h-40 w-auto" />
                                    </div>
                                )}
                            </div>
                            <div className="bg-gray-50 p-3 border-t flex justify-end items-center gap-2">
                                <button onClick={() => handleApprove(feedback._id)} disabled={feedback.isApproved} className={`p-2 rounded-lg flex items-center gap-1 text-sm ${feedback.isApproved ? 'text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
                                    <ThumbsUp size={16} /> Approve
                                </button>
                                <button onClick={() => handleDelete(feedback._id)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-1 text-sm">
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Heart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No feedback yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Customer feedback will appear here once submitted.</p>
                </div>
            )}
        </div>
    );
};

export default ManageFeedback;