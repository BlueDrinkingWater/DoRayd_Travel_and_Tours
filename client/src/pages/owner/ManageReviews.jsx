import React from 'react';
import { ThumbsUp, Trash2, Star, User } from 'lucide-react';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';

const ManageReviews = () => {
    const { data: reviewsData, loading, error, refetch: fetchReviews } = useApi(DataService.fetchAllReviews);
    const reviews = reviewsData?.data || [];

    const handleApprove = async (reviewId) => {
        await DataService.approveReview(reviewId);
        fetchReviews();
    };

    const handleDelete = async (reviewId) => {
        if (window.confirm('Are you sure you want to delete this review?')) {
            await DataService.deleteReview(reviewId);
            fetchReviews();
        }
    };

    if (loading) return <div className="text-center p-10">Loading reviews...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error.message}</div>;

    return (
        <div className="p-6 text-white">
            <div className="mb-6 text-white">
                <h1 className="text-3xl font-bold text-white">Manage Reviews</h1>
                <p className="text-white">Approve or delete reviews here</p>
            </div>

            {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.map(review => (
                        <div key={review._id} className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
                            <div className="p-4 flex-grow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-500"/>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-800">{review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Deleted User'}</span>
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {review.isApproved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                                {review.isAnonymous && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        <span className="font-semibold">(Anonymous)</span>
                                    </p>
                                )}
                            </div>
                            <div className="bg-gray-50 p-3 border-t flex justify-end items-center gap-2">
                                <button 
                                    onClick={() => !review.isApproved && handleApprove(review._id)} 
                                    className={`flex items-center gap-1 px-3 py-1.5 text-white text-sm font-medium rounded transition ${
                                        review.isApproved 
                                            ? 'bg-green-300 cursor-not-allowed opacity-60' 
                                            : 'bg-green-500 hover:bg-green-600 cursor-pointer'
                                    }`}
                                    disabled={review.isApproved}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    {review.isApproved ? 'Approved' : 'Approve'}
                                </button>
                                <button onClick={() => handleDelete(review._id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition">
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-10 bg-white rounded-lg">
                    <p className="text-gray-500">No reviews found.</p>
                </div>
            )}
        </div>
    );
};

export default ManageReviews;