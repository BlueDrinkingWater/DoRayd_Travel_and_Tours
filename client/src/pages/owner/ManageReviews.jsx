import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, Trash2, Star, Filter, Search } from 'lucide-react';
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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Manage Reviews</h1>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review._id} className="border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{review.user.firstName} {review.user.lastName}</span>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {review.isAnonymous && <span className="font-semibold">(Anonymous)</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleApprove(review._id)} className={`p-2 rounded-lg ${review.isApproved ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                                        <ThumbsUp size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(review._id)} className="p-2 rounded-lg bg-red-100 text-red-600">
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

export default ManageReviews;