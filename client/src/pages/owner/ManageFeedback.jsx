import React from 'react';
import { ThumbsUp, Trash2, Star } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Manage Customer Feedback</h1>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="space-y-4">
                    {feedbacks.map(feedback => (
                        <div key={feedback._id} className="border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{feedback.user.firstName} {feedback.user.lastName}</span>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-4 h-4 ${i < feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{feedback.comment}</p>
                                    <p className={`text-sm mt-2 ${feedback.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {feedback.isApproved ? 'Approved' : 'Pending Approval'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleApprove(feedback._id)} className={`p-2 rounded-lg ${feedback.isApproved ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                                        <ThumbsUp size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(feedback._id)} className="p-2 rounded-lg bg-red-100 text-red-600">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManageFeedback;