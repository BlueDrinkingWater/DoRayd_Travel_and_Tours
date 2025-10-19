import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This is crucial for sending httpOnly cookies
});

export const getImageUrl = (path) => {
  if (!path) {
    // Return a placeholder or an empty string if there's no path to avoid errors
    return 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image';
  }
  // If the path is already a full, absolute URL (like from Cloudinary),
  // return it directly without any changes.
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise, it's a relative path for a locally-hosted image.
  // Construct the full URL by combining the server URL and the path.
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


const handleError = (error, defaultMessage = 'An unknown error occurred.') => {
  console.error('API Call Failed:', error);
  const message = error.response?.data?.message || error.message || defaultMessage;
  return { success: false, data: null, message };
};

const DataService = {
  // --- Health Check ---
  checkHealth: async () => {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      return handleError(error, 'Server health check failed.');
    }
  },

  // --- Authentication & User Account ---
  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed.');
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  },

  socialLogin: async (provider, tokenData) => {
    try {
      const response = await api.post(`/api/auth/${provider}-login`, tokenData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || `${provider} login failed.`);
    }
  },

  logout: async () => {
    try {
      await api.get('/api/auth/logout');
    } catch (error) {
      console.error('Server logout failed, proceeding with client-side logout:', error);
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateUserProfile: async (userData) => {
    try {
      const response = await api.put('/api/users/profile', userData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update profile.');
    }
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    try {
      const response = await api.post('/api/users/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to upload profile picture.');
    }
  },

  deleteAccount: async () => {
    try {
      const response = await api.delete('/api/users/profile');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete account.');
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/api/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to change password.');
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send password reset email.');
    }
  },

  resetPassword: async (token, password) => {
    try {
      const response = await api.post(`/api/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to reset password.');
    }
  },

  // --- Notifications ---
  fetchMyNotifications: async () => {
    try {
      const response = await api.get('/api/notifications');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch notifications.');
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const response = await api.patch(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark notification as read.');
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const response = await api.patch('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark all notifications as read.');
    }
  },

  // --- File Upload ---
  uploadImage: async (file, category) => {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('image', file);
   
    try {
      const response = await api.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'File upload failed.');
    }
  },

  deleteImage: async (publicId) => {
    try {
      const response = await api.delete(`/api/upload/image/${encodeURIComponent(publicId)}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete image.');
    }
  },

  // --- Cars & Tours (Public) ---
  fetchAllCars: async (filters = {}) => {
    try {
      const response = await api.get('/api/cars', { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchCarById: async (id) => {
    try {
      const response = await api.get(`/api/cars/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch car details.');
    }
  },

  fetchAllTours: async (filters = {}) => {
    try {
      const response = await api.get('/api/tours', { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchTourById: async (id) => {
    try {
      const response = await api.get(`/api/tours/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch tour details.');
    }
  },

  // --- Bookings ---
   createBooking: async (bookingData) => {
    try {
      const headers = { 'Content-Type': 'multipart/form-data' };
      const response = await api.post('/api/bookings', bookingData, { headers });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create booking.');
    }
  },

  fetchUserBookings: async () => {
    try {
      const response = await api.get('/api/bookings/my-bookings');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchAllBookings: async (params = {}) => {
    try {
      const response = await api.get('/api/bookings', { params: params });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateBookingStatus: async (id, status, adminNotes) => {
    try {
      const response = await api.put(`/api/bookings/${id}/status`, { status, adminNotes });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
 
  cancelBooking: async (id, adminNotes) => {
    try {
      const response = await api.patch(`/api/bookings/${id}/cancel`, { adminNotes });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to cancel booking.');
    }
  },

  // --- Availability Check ---
  getAvailability: async (serviceId) => {
    try {
      const response = await api.get(`/api/bookings/availability/${serviceId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch availability.');
    }
  },

  // --- Reviews ---
  submitReview: async (reviewData) => {
    try {
      const response = await api.post('/api/reviews', reviewData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit review.');
    }
  },

  getMyReviews: async () => {
    try {
      const response = await api.get('/api/reviews/my-reviews');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch your reviews.');
    }
  },

  fetchReviewsForItem: async (itemId) => {
    try {
      const response = await api.get(`/api/reviews/item/${itemId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch reviews for item.');
    }
  },

  fetchAllReviews: async () => {
    try {
      const response = await api.get('/api/reviews');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch all reviews.');
    }
  },

  approveReview: async (reviewId) => {
    try {
      const response = await api.patch(`/api/reviews/${reviewId}/approve`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve review.');
    }
  },
 
  deleteReview: async (id) => {
    try {
      const response = await api.delete(`/api/reviews/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete review.');
    }
  },

  // --- Feedback ---
  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/api/feedback', feedbackData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit feedback.');
    }
  },

  getPublicFeedback: async () => {
    try {
      const response = await api.get('/api/feedback/public');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch public feedback.');
    }
  },
 
  getMyFeedback: async () => {
    try {
      const response = await api.get('/api/feedback/my-feedback');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch your feedback.');
    }
  },

  fetchAllFeedback: async () => {
    try {
      const response = await api.get('/api/feedback');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch feedback.');
    }
  },

  approveFeedback: async (feedbackId) => {
    try {
      const response = await api.patch(`/api/feedback/${feedbackId}/approve`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve feedback.');
    }
  },
 
  deleteFeedback: async (id) => {
    try {
      const response = await api.delete(`/api/feedback/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete feedback.');
    }
  },
 
  // --- Admin Functions ---
  fetchAllCustomers: async () => {
    try {
      const response = await api.get('/api/users/customers');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch customers.');
    }
  },

  resetCustomerPassword: async (customerId, password) => {
    try {
      const response = await api.put(`/api/users/customers/${customerId}/reset-password`, { password });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to reset customer password.');
    }
  },

  createCar: async (carData) => {
    try {
      const response = await api.post('/api/cars', carData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create car.');
    }
  },

  updateCar: async (id, carData) => {
    try {
      const response = await api.put(`/api/cars/${id}`, carData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update car.');
    }
  },

  archiveCar: async (id) => {
    try {
      const response = await api.patch(`/api/cars/${id}/archive`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive car.');
    }
  },

  unarchiveCar: async (id) => {
    try {
      const response = await api.patch(`/api/cars/${id}/unarchive`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive car.');
    }
  },

  createTour: async (tourData) => {
    try {
      const response = await api.post('/api/tours', tourData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create tour.');
    }
  },

  updateTour: async (id, tourData) => {
    try {
      const response = await api.put(`/api/tours/${id}`, tourData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update tour.');
    }
  },

  archiveTour: async (id) => {
    try {
      const response = await api.patch(`/api/tours/${id}/archive`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive tour.');
    }
  },

  unarchiveTour: async (id) => {
    try {
      const response = await api.patch(`/api/tours/${id}/unarchive`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive tour.');
    }
  },

  createMessage: async (messageData) => {
    try {
      const response = await api.post('/api/messages', messageData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create message.');
    }
  },

  fetchAllMessages: async () => {
    try {
      const response = await api.get('/api/messages');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch messages.');
    }
  },
 
  replyToMessage: async (messageId, formData) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/reply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send reply.');
    }
  },

  updateMessageStatus: async (messageId, status) => {
    try {
      const response = await api.put(`/api/messages/${messageId}/status`, { status });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update message status.');
    }
  },

  fetchAllEmployees: async () => {
    try {
      const response = await api.get('/api/users/employees');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch employees.');
    }
  },

  createEmployee: async (employeeData) => {
    try {
      const response = await api.post('/api/users/employees', employeeData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create employee.');
    }
  },

  updateEmployee: async (id, employeeData) => {
    try {
      const response = await api.put(`/api/users/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update employee.');
    }
  },

  deleteEmployee: async (id) => {
    try {
      const response = await api.delete(`/api/users/employees/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete employee.');
    }
  },

  fetchDashboardAnalytics: async () => {
    try {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchContent: async (type) => {
    try {
      const response = await api.get(`/api/content/${type}`);
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to fetch '${type}' content.`);
    }
  },

  updateContent: async (type, contentData) => {
    try {
      const response = await api.put(`/api/content/${type}`, contentData);
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to update '${type}' content.`);
    }
  },

  fetchActivityLogs: async () => {
    try {
      const response = await api.get('/api/activity-log');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch activity logs.');
    }
  },
 
  fetchAllFaqs: async () => {
    try {
      const response = await api.get('/api/faq');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch FAQs.');
    }
  },

  fetchAllFaqsAdmin: async () => {
    try {
      const response = await api.get('/api/faq/admin');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch FAQs for admin.');
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/api/faq', faqData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create FAQ.');
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/api/faq/${id}`, faqData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update FAQ.');
    }
  },

  deleteFaq: async (id) => {
    try {
      const response = await api.delete(`/api/faq/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete FAQ.');
    }
  },
 
  fetchAllPromotions: async () => {
    try {
      const response = await api.get('/api/promotions');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch promotions.');
    }
  },

  fetchAllPromotionsAdmin: async () => {
    try {
      const response = await api.get('/api/promotions/admin');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch promotions for admin.');
    }
  },

  createPromotion: async (promoData) => {
    try {
      const response = await api.post('/api/promotions', promoData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create promotion.');
    }
  },

  updatePromotion: async (id, promoData) => {
    try {
      const response = await api.put(`/api/promotions/${id}`, promoData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update promotion.');
    }
  },

  deletePromotion: async (id) => {
    try {
      const response = await api.delete(`/api/promotions/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete promotion.');
    }
  },
  
  searchCars: async (searchTerm) => {
    try {
      const response = await api.post('/api/cars/search', { searchTerm });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to search cars.');
    }
  },

  filterCars: async (filterOptions) => {
    try {
      const response = await api.post('/api/cars/filter', filterOptions);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to filter cars.');
    }
  },

  searchTours: async (searchTerm) => {
    try {
      const response = await api.post('/api/tours/search', { searchTerm });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to search tours.');
    }
  },

  filterTours: async (filterOptions) => {
    try {
      const response = await api.post('/api/tours/filter', filterOptions);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to filter tours.');
    }
  },
};

export default DataService;