// client/src/components/services/DataService.jsx

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
export const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending httpOnly cookies
});

// Helper function remains the same
export const getImageUrl = (path) => {
  if (!path) {
    return 'https://placehold.co/600x400/e2e8f0/475569?text=No+Image';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};


const handleError = (error, defaultMessage = 'An unknown error occurred.') => {
  console.error('API Call Failed:', error.response || error);
  // Prioritize backend error message
  const message = error.response?.data?.message || error.message || defaultMessage;
  // Include validation errors if present (from express-validator)
  const errors = error.response?.data?.errors;
  return { success: false, data: null, message, errors };
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
      // Use handleError to standardize error response
      return handleError(error, 'Registration failed.');
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      // Use specific message from backend if available
       return handleError(error, 'Login failed. Please check credentials.');
    }
  },

  socialLogin: async (provider, tokenData) => {
    try {
      const response = await api.post(`/api/auth/${provider}-login`, tokenData);
      return response.data;
    } catch (error) {
       return handleError(error, `${provider} login failed.`);
    }
  },

  logout: async () => {
    try {
      // Still attempt server logout, but don't throw error if it fails
      await api.get('/api/auth/logout');
      return { success: true };
    } catch (error) {
      console.warn('Server logout endpoint failed:', error.message);
      // Proceed with client-side cleanup regardless
      return { success: true, message: "Server logout failed, cleared client session." };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      // Ensure the response structure is consistent
      if (response.data.success && response.data.user) {
          return { success: true, user: response.data.user };
      }
      // If backend says success: false or user is missing
      return { success: false, message: response.data.message || 'Failed to get user data.' };
    } catch (error) {
      // Handle network errors or 401 Unauthorized
      if (error.response?.status === 401) {
          return { success: false, message: 'Unauthorized. Please log in.' };
      }
      return handleError(error, 'Could not fetch current user.');
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

  // --- Secure Image Retrieval ---
  getSecureImageUrl: async (publicId) => {
    try {
      const encodedId = encodeURIComponent(publicId);
      const response = await api.get(`/api/images/secure/${encodedId}`);
      // Ensure data format is consistent
      if (response.data.success && response.data.data?.url) {
        return { success: true, data: { url: response.data.data.url } };
      }
      return { success: false, message: response.data.message || 'URL not found in response.' };
    } catch (error) {
      return handleError(error, 'Failed to fetch secure image URL. Authentication required or image not found.');
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
  uploadImage: async (file, category = 'general') => { // Added default category
    const formData = new FormData();
    formData.append('category', category);
    formData.append('image', file);

    try {
      const response = await api.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Ensure data format is consistent
       if (response.data.success && response.data.data?.url && response.data.data?.id) {
          return { success: true, data: { url: response.data.data.url, id: response.data.data.id } };
       }
       return { success: false, message: response.data.message || 'Upload succeeded but response format is invalid.' };
    } catch (error) {
      return handleError(error, `File upload failed: ${error.response?.data?.message || error.message}`);
    }
  },

  deleteImage: async (publicId) => {
    try {
      // No need to encode here, backend controller handles decoding
      const response = await api.delete(`/api/upload/image/${publicId}`);
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
      return handleError(error, 'Failed to fetch cars.');
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
      return handleError(error, 'Failed to fetch tours.');
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
   createBooking: async (bookingFormData) => { // Expect FormData
    try {
      const response = await api.post('/api/bookings', bookingFormData, {
          headers: { 'Content-Type': 'multipart/form-data' } // Ensure header is set
      });
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
      return handleError(error, 'Failed to fetch your bookings.');
    }
  },

  fetchAllBookings: async (params = {}) => {
    try {
      const response = await api.get('/api/bookings', { params: params });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch all bookings.');
    }
  },

  // **MODIFIED:** Expect FormData for status updates to handle attachments and new fields
  updateBookingStatus: async (id, formData) => { // Expect FormData directly
    try {
      // The formData object already contains status, adminNotes, attachment (if any),
      // paymentDueDuration, and paymentDueUnit (if applicable).
      const response = await api.put(`/api/bookings/${id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Important for file uploads
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update booking status.');
    }
  },

  // **MODIFIED:** Expect FormData for cancellation to handle attachments
  cancelBooking: async (id, formData) => { // Expect FormData
    try {
      // The formData object contains adminNotes and attachment (if any)
      const response = await api.patch(`/api/bookings/${id}/cancel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }, // Important for file uploads
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to cancel booking.');
    }
  },


  addPaymentProof: async (bookingId, paymentData) => { // Expect FormData
    try {
        const response = await api.post(`/api/bookings/${bookingId}/add-payment`, paymentData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (error) {
        return handleError(error, 'Failed to add payment.');
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

  fetchAllReviews: async () => { // Renamed from fetchAllReviewsAdmin for clarity
    try {
      const response = await api.get('/api/reviews'); // Uses admin-protected route
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
  submitFeedback: async (feedbackData) => { // Expect FormData
    try {
      const response = await api.post('/api/feedback', feedbackData, {
          headers: { 'Content-Type': 'multipart/form-data' } // For potential image upload
      });
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

  fetchAllFeedback: async () => { // Renamed for clarity
    try {
      const response = await api.get('/api/feedback'); // Uses admin-protected route
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

  // --- Admin/Employee Functions (User Management) ---
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

  // --- Admin Functions (Service Management) ---
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
      return handleError(error, 'Failed to restore car.'); // Corrected message
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
      return handleError(error, 'Failed to restore tour.'); // Corrected message
    }
  },

  // --- Messages (Admin/Employee) ---
  getAllMessages: async (params = {}) => { // Use getAllMessages now
    try {
      const response = await api.get('/api/messages', { params });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch messages.');
    }
  },

   getMessageById: async (id) => { // Added function to fetch single message
    try {
      const response = await api.get(`/api/messages/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch message details.');
    }
  },

  // **MODIFIED:** Expect FormData for reply to handle attachments
  replyToMessage: async (messageId, replyText, attachmentFile) => {
    try {
        const formData = new FormData();
        formData.append('replyMessage', replyText);
        if (attachmentFile) {
            formData.append('attachment', attachmentFile);
        }

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

   deleteMessage: async (id) => { // Added delete message function
    try {
      const response = await api.delete(`/api/messages/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete message.');
    }
  },

  // --- Analytics ---
  fetchDashboardAnalytics: async () => {
    try {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch dashboard analytics.');
    }
  },

  // --- Content Management ---
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

  // --- Activity Log ---
  fetchActivityLogs: async () => {
    try {
      const response = await api.get('/api/activity-log');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch activity logs.');
    }
  },

  // --- FAQs ---
  fetchAllFaqs: async () => { // Public fetch
    try {
      const response = await api.get('/api/faq');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch FAQs.');
    }
  },

  fetchAllFaqsAdmin: async () => { // Admin fetch
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

  // --- Promotions ---
  fetchAllPromotions: async () => { // Public fetch
    try {
      const response = await api.get('/api/promotions');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch promotions.');
    }
  },

  fetchAllPromotionsAdmin: async () => { // Admin fetch
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

   // --- Messages (Public/Contact Form) ---
  createMessage: async (messageData) => {
    try {
      const response = await api.post('/api/messages', messageData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send your message.');
    }
  },
};

export default DataService;