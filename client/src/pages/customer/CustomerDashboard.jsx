import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Clock, Car, MapPin, Star, MessageSquare, Settings, User, Heart, Award, Upload 
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import DataService, { SERVER_URL } from '../../components/services/DataService.jsx';
import AccountSettings from '../shared/AccountSettings.jsx'; // Import the new component

const CustomerDashboard = () => {
    // ... (logic remains the same)

    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch user data
    const { data: bookingsData, loading: bookingsLoading, refetch: refetchBookings } = useApi(() => DataService.fetchUserBookings(), [user]);
    const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useApi(() => DataService.getMyReviews(), [user]);
    const { data: feedbackData, loading: feedbackLoading, refetch: refetchFeedback } = useApi(() => DataService.getMyFeedback(), [user]);
    const { data: publicFeedbackData, loading: publicFeedbackLoading } = useApi(() => DataService.getPublicFeedback(), []);

    const bookings = bookingsData?.data || [];
    const myReviews = reviewsData?.data || [];
    const myFeedback = feedbackData?.data || [];
    const publicFeedback = publicFeedbackData?.data || [];

    const completedBookings = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);
    const reviewedBookingIds = useMemo(() => new Set(myReviews.map(r => String(r.booking))), [myReviews]);
    const feedbackBookingIds = useMemo(() => new Set(myFeedback.map(f => String(f.booking))), [myFeedback]);
    

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'bookings', label: 'My Bookings', icon: Calendar },
        { id: 'reviews', label: 'My Reviews', icon: Star },
        { id: 'feedback', label: 'My Feedback', icon: MessageSquare },
        { id: 'leave-review', label: 'Leave Review', icon: Award },
        { id: 'leave-feedback', label: 'Leave Feedback', icon: Heart },
        { id: 'public-feedback', label: 'Customer Feedback', icon: MessageSquare },
        { id: 'settings', label: 'Account Settings', icon: Settings }
    ];

    const stats = [
        { title: 'Total Bookings', value: bookings.length, icon: Calendar },
        { title: 'Completed', value: completedBookings.length, icon: Clock },
        { title: 'My Reviews', value: myReviews.length, icon: Star },
        { title: 'My Feedback', value: myFeedback.length, icon: MessageSquare }
    ];

    if (bookingsLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
                    <p className="text-gray-600 mt-2">Manage your bookings, reviews, and account settings</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <StatCard key={index} {...stat} />
                    ))}
                </div>

                {/* Navigation Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 overflow-x-auto px-6">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600'
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
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    {activeTab === 'overview' && <OverviewTab bookings={bookings} />}
                    {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
                    {activeTab === 'reviews' && <MyReviewsTab reviews={myReviews} />}
                    {activeTab === 'feedback' && <MyFeedbackTab feedback={myFeedback} />}
                    {activeTab === 'leave-review' && (
                        <LeaveReviewTab 
                            bookings={completedBookings} 
                            reviewedBookingIds={reviewedBookingIds}
                            onReviewSubmit={refetchReviews}
                        />
                    )}
                    {activeTab === 'leave-feedback' && (
                        <LeaveFeedbackTab 
                            bookings={completedBookings} 
                            feedbackBookingIds={feedbackBookingIds}
                            onFeedbackSubmit={refetchFeedback}
                        />
                    )}
                    {activeTab === 'public-feedback' && <PublicFeedbackTab feedback={publicFeedback} />}
                    {activeTab === 'settings' && <AccountSettings />}
                </div>
            </div>
        </div>
    );
};

// ... (All sub-components like StatCard, OverviewTab, BookingsTab, etc. remain unchanged)
const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
                <Icon className="w-6 h-6 text-blue-600" />
            </div>
        </div>
    </div>
);

const OverviewTab = ({ bookings }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
                <div className="space-y-3">
                    {bookings.slice(0, 3).map(booking => (
                        <div key={booking._id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{booking.itemName}</p>
                                    <p className="text-sm text-gray-500">{booking.bookingReference}</p>
                                    <p className="text-sm text-gray-500">{new Date(booking.startDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const BookingsTab = ({ bookings }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
        <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking._id} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                {booking.itemType === 'car' ? 
                                    <Car className="w-6 h-6 text-blue-600" /> : 
                                    <MapPin className="w-6 h-6 text-green-600" />
                                }
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{booking.itemName}</h3>
                                <p className="text-gray-600">Ref: {booking.bookingReference}</p>
                                <p className="text-gray-600">
                                    {new Date(booking.startDate).toLocaleDateString()}
                                    {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                                </p>
                                <p className="font-semibold text-lg mt-2">₱{booking.totalPrice.toLocaleString()}</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                        </span>
                    </div>
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">You have no bookings yet.</p>
            )}
        </div>
    </div>
);

const MyReviewsTab = ({ reviews }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Reviews</h2>
        <div className="space-y-4">
            {reviews.length > 0 ? reviews.map(review => (
                <div key={review._id} className="p-6 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-semibold">{review.item?.title || `${review.item?.brand} ${review.item?.model}`}</h3>
                            <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                            </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {review.isApproved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                </div>
            )) : (
                <p className="text-center text-gray-500 py-8">You haven't submitted any reviews yet.</p>
            )}
        </div>
    </div>
);

const MyFeedbackTab = ({ feedback }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">My Feedback</h2>
        <div className="space-y-6">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="p-6 border rounded-lg bg-gray-50 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                ))}
                            </div>
                            <span className="font-semibold text-gray-800">({item.rating}/5)</span>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            item.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {item.isApproved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                    <p className="text-gray-800 leading-relaxed mb-4">"{item.comment}"</p>
                     {item.image && (
                        <div className="mt-4">
                            <img src={`${SERVER_URL}${item.image}`} alt="Feedback attachment" className="max-w-xs rounded-lg border shadow-md" />
                        </div>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                        Submitted on {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            )) : (
                <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
                    <h3 className="text-lg font-semibold">You haven't submitted any feedback yet.</h3>
                </div>
            )}
        </div>
    </div>
);

const LeaveReviewTab = ({ bookings, reviewedBookingIds, onReviewSubmit }) => {
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const availableBookings = useMemo(() => bookings.filter(b => !reviewedBookingIds.has(String(b._id))), [bookings, reviewedBookingIds]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBookingId || !rating || !comment.trim()) {
            alert('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        const reviewData = {
            bookingId: selectedBookingId,
            rating,
            comment: comment.trim(),
            isAnonymous
        };

        try {
            const response = await DataService.submitReview(reviewData);
            
            if (response.success) {
                alert('Review submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                setIsAnonymous(false);
                onReviewSubmit();
            } else {
                alert('Failed to submit review: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting review: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Leave a Review</h2>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select a completed booking to review *
                        </label>
                        <select 
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Choose a service to review...</option>
                            {availableBookings.map(booking => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.itemName} - {booking.bookingReference} ({new Date(booking.startDate).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rating *
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star 
                                        className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Review *
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Share your experience with this service..."
                            maxLength={1000}
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">{comment.length}/1000 characters</p>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="anonymous-review"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="anonymous-review" className="text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            ) : (
                <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed bookings available for review.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to leave a review!</p>
                </div>
            )}
        </div>
    );
};

const LeaveFeedbackTab = ({ bookings, feedbackBookingIds, onFeedbackSubmit }) => {
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [image, setImage] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const availableBookings = useMemo(() => bookings.filter(b => !feedbackBookingIds.has(String(b._id))), [bookings, feedbackBookingIds]);

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBookingId || !rating || !comment.trim()) {
            alert('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('bookingId', selectedBookingId);
        formData.append('rating', rating);
        formData.append('comment', comment.trim());
        formData.append('isAnonymous', isAnonymous);
        if (image) {
            formData.append('image', image);
        }

        try {
            const response = await DataService.submitFeedback(formData);
            
            if (response.success) {
                alert('Feedback submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                setIsAnonymous(false);
                setImage(null);
                onFeedbackSubmit();
            } else {
                alert('Failed to submit feedback: ' + response.message);
            }
        } catch (error) {
            alert('Error submitting feedback: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Leave Feedback</h2>
            <p className="text-gray-600 mb-6">Share your overall experience with DoRayd Travel & Tours</p>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select a completed booking *
                        </label>
                        <select 
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Choose a service experience...</option>
                            {availableBookings.map(booking => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.itemName} - {booking.bookingReference} ({new Date(booking.startDate).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Overall Rating *
                        </label>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star 
                                        className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Feedback *
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tell us about your overall experience with our service..."
                            maxLength={1000}
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">{comment.length}/1000 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload an Image (Optional)
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label
                                        htmlFor="feedback-file-upload"
                                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                    >
                                        <span>Upload a file</span>
                                        <input id="feedback-file-upload" name="feedback-file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                {image && <p className="text-sm text-green-600 mt-2">{image.name}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="anonymous-feedback"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="anonymous-feedback" className="text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            ) : (
                <div className="text-center py-8">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed bookings available for feedback.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to share your experience!</p>
                </div>
            )}
        </div>
    );
};

const PublicFeedbackTab = ({ feedback }) => (
    <div>
        <h2 className="text-2xl font-bold mb-6">Customer Feedback</h2>
        <p className="text-gray-600 mb-8">See what our customers are saying about DoRayd Travel & Tours</p>
        
        <div className="space-y-8">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="p-8 border rounded-xl bg-white shadow-lg transition-shadow hover:shadow-xl">
                    <div className="flex items-start gap-6">
                        <div className="bg-blue-100 p-4 rounded-full">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                                <p className="font-bold text-lg text-gray-800">
                                    {item.isAnonymous ? 'Anonymous Customer' : `${item.user?.firstName} ${item.user?.lastName}`}
                                </p>
                                <div className="flex items-center gap-1 mt-2 sm:mt-0">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">"{item.comment}"</p>
                            {item.image && (
                                <div className="mb-4">
                                    <img src={`${SERVER_URL}${item.image}`} alt="Feedback attachment" className="max-w-xs rounded-lg border shadow-md" />
                                </div>
                            )}
                            <p className="text-sm text-gray-500 font-medium">
                                {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                <span className="mx-2">•</span>
                                <span className="capitalize">{item.serviceType} Service</span>
                            </p>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-700">No public feedback available yet.</h3>
                </div>
            )}
        </div>
    </div>
);


// THIS COMPONENT WAS REPLACED
const AccountSettingsTab = ({ user }) => (
    <AccountSettings />
);

// Helper function
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-gray-100 text-gray-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default CustomerDashboard;