import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Clock, Car, MapPin, Star, MessageSquare, Settings, User, Heart, Award, Upload, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import DataService, { getImageUrl } from '../../components/services/DataService.jsx';
import AccountSettings from '../shared/AccountSettings.jsx';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);

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
        return <div className="flex justify-center items-center min-h-screen bg-gray-50">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 flex flex-col shadow-2xl`}>
                {/* Sidebar Header */}
                <div className="p-6 border-b border-blue-500">
                    <div className="flex items-center justify-between">
                        {sidebarOpen && (
                            <div>
                                <h2 className="text-xl font-bold">DoRayd</h2>
                                <p className="text-blue-200 text-xs">Travel & Tours</p>
                            </div>
                        )}
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* User Info */}
                {sidebarOpen && (
                    <div className="p-6 border-b border-blue-500">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center font-bold text-lg">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div>
                                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                                <p className="text-blue-200 text-sm">Customer</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white text-blue-600 border-r-4 border-blue-600 shadow-lg'
                                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                                }`}
                            >
                                <Icon size={20} />
                                {sidebarOpen && <span className="font-medium">{tab.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                {sidebarOpen && (
                    <div className="p-4 border-t border-blue-500">
                        <p className="text-blue-200 text-xs text-center">© 2024 DoRayd Tours</p>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Top Bar */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h1>
                            <p className="text-gray-500 text-sm">Welcome back, {user?.firstName}!</p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8">
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {stats.map((stat, index) => (
                                    <StatCard key={index} {...stat} />
                                ))}
                            </div>
                            <OverviewTab bookings={bookings} />
                        </>
                    )}
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
            </main>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

const OverviewTab = ({ bookings }) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-900">Recent Bookings</h2>
        <div className="space-y-4">
            {bookings.slice(0, 5).map(booking => (
                <div key={booking._id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium text-gray-900">{booking.itemName}</p>
                            <p className="text-sm text-gray-500">{booking.bookingReference}</p>
                            <p className="text-sm text-gray-500">{new Date(booking.startDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                        </span>
                    </div>
                </div>
            ))}
            {bookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p>No bookings yet</p>
                </div>
            )}
        </div>
    </div>
);

const BookingsTab = ({ bookings }) => (
    <div className="space-y-4">
        {bookings.length > 0 ? bookings.map(booking => (
            <div key={booking._id} className="bg-white p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
                            {booking.itemType === 'car' ? 
                                <Car className="w-6 h-6 text-white" /> : 
                                <MapPin className="w-6 h-6 text-white" />
                            }
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">{booking.itemName}</h3>
                            <p className="text-gray-600">Ref: {booking.bookingReference}</p>
                            <p className="text-gray-600">
                                {new Date(booking.startDate).toLocaleDateString()}
                                {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                            </p>
                            <p className="font-semibold text-lg mt-2 text-blue-600">₱{booking.totalPrice.toLocaleString()}</p>
                        </div>
                    </div>
                    <span className={`px-4 py-2 text-sm rounded-lg font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                    </span>
                </div>
            </div>
        )) : (
            <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">You have no bookings yet.</p>
            </div>
        )}
    </div>
);

const MyReviewsTab = ({ reviews }) => (
    <div className="space-y-4">
        {reviews.length > 0 ? reviews.map(review => (
            <div key={review._id} className="bg-white p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {review.item?.title || `${review.item?.brand} ${review.item?.model}`}
                        </h3>
                        <div className="flex items-center gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        review.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {review.isApproved ? 'Approved' : 'Pending'}
                    </span>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{review.comment}</p>
                <p className="text-sm text-gray-500 mt-3">
                    {new Date(review.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>
        )) : (
            <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">You haven't submitted any reviews yet.</p>
            </div>
        )}
    </div>
);

const MyFeedbackTab = ({ feedback }) => (
    <div className="space-y-6">
        {feedback.length > 0 ? feedback.map(item => (
            <div key={item._id} className="bg-white p-8 border border-gray-200 rounded-xl hover:shadow-lg transition-all">
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
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        item.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {item.isApproved ? 'Approved' : 'Pending'}
                    </span>
                </div>
                <p className="text-gray-800 leading-relaxed mb-4 bg-gray-50 p-4 rounded-lg">"{item.comment}"</p>
                {item.image && (
                    <div className="mt-4">
                        <img src={getImageUrl(item.image)} alt="Feedback attachment" className="max-w-xs rounded-lg border shadow-md" />
                    </div>
                )}
                <p className="text-sm text-gray-500 mt-4">
                    Submitted on {new Date(item.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>
        )) : (
            <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
                <p className="text-gray-500 text-lg">You haven't submitted any feedback yet.</p>
            </div>
        )}
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
        <div className="max-w-3xl mx-auto">
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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
                        <p className="text-sm text-gray-500 mt-2">{comment.length}/1000 characters</p>
                    </div>

                    <div className="flex items-center bg-white p-6 rounded-xl border border-gray-200">
                        <input
                            type="checkbox"
                            id="anonymous-review"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="anonymous-review" className="ml-2 text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            ) : (
                <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed bookings available for review.</p>
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
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const availableBookings = useMemo(() => bookings.filter(b => !feedbackBookingIds.has(String(b._id))), [bookings, feedbackBookingIds]);
    
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

        try {
            const response = await DataService.submitFeedback(formData);
            
            if (response.success) {
                alert('Feedback submitted successfully! It will be visible after admin approval.');
                setSelectedBookingId('');
                setRating(0);
                setComment('');
                setIsAnonymous(false);
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
        <div className="max-w-3xl mx-auto">
            <p className="text-gray-600 mb-6">Share your overall experience with DoRayd Travel & Tours</p>
            
            {availableBookings.length > 0 ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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

                    <div className="bg-white p-6 rounded-xl border border-gray-200">
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
                        <p className="text-sm text-gray-500 mt-2">{comment.length}/1000 characters</p>
                    </div>

                    <div className="flex items-center bg-white p-6 rounded-xl border border-gray-200">
                        <input
                            type="checkbox"
                            id="anonymous-feedback"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="anonymous-feedback" className="ml-2 text-sm text-gray-700">
                            Submit anonymously
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            ) : (
                <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No completed bookings available for feedback.</p>
                    <p className="text-sm text-gray-400 mt-2">Complete a booking to share your experience!</p>
                </div>
            )}
        </div>
    );
};

const PublicFeedbackTab = ({ feedback }) => (
    <div>
        <p className="text-gray-600 mb-8">See what our customers are saying about DoRayd Travel & Tours</p>
        
        <div className="space-y-8">
            {feedback.length > 0 ? feedback.map(item => (
                <div key={item._id} className="bg-white p-8 border border-gray-200 rounded-xl hover:shadow-lg transition-all">
                    <div className="flex items-start gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                                <p className="font-bold text-lg text-gray-900">
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
                            <p className="text-gray-700 text-lg leading-relaxed mb-4 bg-gray-50 p-4 rounded-lg">"{item.comment}"</p>
                            {item.image && (
                                <div className="mb-4">
                                    <img 
                                        src={getImageUrl(item.image)} 
                                        alt="Feedback attachment" 
                                        className="max-w-xs rounded-lg border shadow-md hover:shadow-lg transition-shadow" 
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <Calendar className="w-4 h-4" />
                                {new Date(item.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                                <span className="mx-2">•</span>
                                <MapPin className="w-4 h-4" />
                                <span className="capitalize">{item.serviceType} Service</span>
                            </div>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="bg-white text-center py-16 rounded-xl border border-gray-200">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-700">No public feedback available yet.</h3>
                    <p className="text-gray-500 mt-2">Be the first to share your experience!</p>
                </div>
            )}
        </div>
    </div>
);

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