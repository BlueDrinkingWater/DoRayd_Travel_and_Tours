import axios from 'axios';

// Get the base URL for the API from environment variables.
// For production, this will be an empty string, making API calls relative to the domain.
// For local development, this can be your backend URL (e.g., 'http://localhost:5000'), but the proxy is recommended.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create a single, configured Axios instance.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true // Crucial for sending secure httpOnly cookies
});

// Use the same base URL for constructing server resource URLs (like images).
export const SERVER_URL = API_BASE_URL;

// This function is now simplified as the browser handles the cookie automatically.
const getAuthHeader = () => {
  return {};
};

// Centralized error handler.
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
      if (response.data.user) {
        // We only store user info now, not the token.
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  },
  
  socialLogin: async (provider, tokenData) => {
    try {
      const response = await api.post(`/api/auth/${provider}-login`, tokenData);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || `${provider} login failed.`);
    }
  },

  logout: () => {
    // Only user info is removed from local storage. The cookie is cleared by the browser/server.
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateUserProfile: async (userData) => {
    try {
      const response = await api.put('/api/users/profile', userData, { headers: getAuthHeader() });
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
              headers: {
                  ...getAuthHeader(),
                  'Content-Type': 'multipart/form-data',
              },
          });
          return response.data;
      } catch (error) {
          return handleError(error, 'Failed to upload profile picture.');
      }
  },

  deleteAccount: async () => {
      try {
          const response = await api.delete('/api/users/profile', { headers: getAuthHeader() });
          return response.data;
      } catch (error) {
          return handleError(error, 'Failed to delete account.');
      }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/api/auth/change-password', passwordData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to change password.');
    }
  },

  // --- Forgot Password ---
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send password reset email.');
    }
  },

  // --- Reset Password ---
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
      const response = await api.get('/api/notifications', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch notifications.');
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const response = await api.patch(`/api/notifications/${id}/read`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark notification as read.');
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const response = await api.patch('/api/notifications/read-all', {}, { headers: getAuthHeader() });
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
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'File upload failed.');
    }
  },

  deleteImage: async (category, filename) => {
    try {
      const response = await api.delete(`/api/upload/image/${category}/${filename}`, { 
        headers: getAuthHeader() 
      });
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
      const authHeader = getAuthHeader();
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...authHeader
      };
      
      const response = await api.post('/api/bookings', bookingData, { headers });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create booking.');
    }
  },

  fetchUserBookings: async () => {
    try {
      const response = await api.get('/api/bookings/my-bookings', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchAllBookings: async () => {
    try {
      const response = await api.get('/api/bookings', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateBookingStatus: async (id, status, adminNotes) => {
    try {
      const response = await api.put(`/api/bookings/${id}/status`, { status, adminNotes }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  
  cancelBooking: async (id, adminNotes) => {
    try {
      const response = await api.patch(`/api/bookings/${id}/cancel`, { adminNotes }, { headers: getAuthHeader() });
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

  // --- Reviews (for specific items) ---
  submitReview: async (reviewData) => {
    try {
      const response = await api.post('/api/reviews', reviewData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit review.');
    }
  },

  getMyReviews: async () => {
    try {
      const response = await api.get('/api/reviews/my-reviews', { headers: getAuthHeader() });
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
      const response = await api.get('/api/reviews', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch all reviews.');
    }
  },

  approveReview: async (reviewId) => {
    try {
      const response = await api.patch(`/api/reviews/${reviewId}/approve`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve review.');
    }
  },

  disapproveReview: async (reviewId) => {
    try {
      const response = await api.patch(`/api/reviews/${reviewId}/disapprove`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to disapprove review.');
    }
  },

  deleteReview: async (id) => {
    try {
      const response = await api.delete(`/api/reviews/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete review.');
    }
  },

  // --- Feedback (for dashboard) ---
  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/api/feedback', feedbackData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit feedback.');
    }
  },

  submitGeneralFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/api/feedback', feedbackData, { headers: getAuthHeader() });
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

  fetchPublicFeedback: async () => {
    try {
      const response = await api.get('/api/feedback/public');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch public feedback.');
    }
  },

  getMyFeedback: async () => {
    try {
      const response = await api.get('/api/feedback/my-feedback', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch your feedback.');
    }
  },

  fetchAllFeedback: async () => {
    try {
      const response = await api.get('/api/feedback', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch feedback.');
    }
  },

  approveFeedback: async (feedbackId) => {
    try {
      const response = await api.patch(`/api/feedback/${feedbackId}/approve`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve feedback.');
    }
  },

  disapproveFeedback: async (feedbackId) => {
    try {
      const response = await api.patch(`/api/feedback/${feedbackId}/disapprove`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to disapprove feedback.');
    }
  },

  // --- Customer Management ---
  fetchAllCustomers: async () => {
    try {
      const response = await api.get('/api/users/customers', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch customers.');
    }
  },

  resetCustomerPassword: async (customerId, password) => {
    try {
      const response = await api.put(`/api/users/customers/${customerId}/reset-password`, { password }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to reset customer password.');
    }
  },

  // --- Car Management Functions (Admin) ---
  createCar: async (carData) => {
    try {
      const response = await api.post('/api/cars', carData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create car.');
    }
  },

  updateCar: async (id, carData) => {
    try {
      const response = await api.put(`/api/cars/${id}`, carData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update car.');
    }
  },

  archiveCar: async (id) => {
    try {
      const response = await api.patch(`/api/cars/${id}/archive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive car.');
    }
  },

  unarchiveCar: async (id) => {
    try {
      const response = await api.patch(`/api/cars/${id}/unarchive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive car.');
    }
  },

  // --- Tour Management Functions (Admin) ---
  createTour: async (tourData) => {
    try {
      const response = await api.post('/api/tours', tourData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create tour.');
    }
  },

  updateTour: async (id, tourData) => {
    try {
      const response = await api.put(`/api/tours/${id}`, tourData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update tour.');
    }
  },

  archiveTour: async (id) => {
    try {
      const response = await api.patch(`/api/tours/${id}/archive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive tour.');
    }
  },

  unarchiveTour: async (id) => {
    try {
      const response = await api.patch(`/api/tours/${id}/unarchive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive tour.');
    }
  },

  // --- Message Management ---
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
      const response = await api.get('/api/messages', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch messages.');
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      const response = await api.put(`/api/messages/${messageId}/status`, { status: 'read' }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark message as read.');
    }
  },

  replyToMessage: async (messageId, formData) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/reply`, formData, { 
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'multipart/form-data',
        }
      });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send reply.');
    }
  },

  // --- Employee Management ---
  fetchAllEmployees: async () => {
    try {
      const response = await api.get('/api/users/employees', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch employees.');
    }
  },

  createEmployee: async (employeeData) => {
    try {
      const response = await api.post('/api/users/employees', employeeData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create employee.');
    }
  },

  updateEmployee: async (id, employeeData) => {
    try {
      const response = await api.put(`/api/users/employees/${id}`, employeeData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update employee.');
    }
  },

  deleteEmployee: async (id) => {
    try {
      const response = await api.delete(`/api/users/employees/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete employee.');
    }
  },

  // --- Analytics ---
  fetchDashboardAnalytics: async () => {
    try {
      const response = await api.get('/api/analytics/dashboard', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  // --- Content Management ---
  fetchContent: async (type) => {
    try {
      const response = await api.get(`/api/content/${type}`, {
        params: {
          _: new Date().getTime(),
        }
      });
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to fetch '${type}' content.`);
    }
  },

  updateContent: async (type, contentData) => {
    try {
      const response = await api.put(`/api/content/${type}`, contentData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to update '${type}' content.`);
    }
  },
    // --- Activity Log ---
  fetchActivityLogs: async () => {
    try {
      const response = await api.get('/api/activity-log', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch activity logs.');
    }
  },

  // --- FAQ Management ---
  fetchAllFaqs: async () => {
    try {
      const response = await api.get('/api/faqs');
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch FAQs.');
    }
  },

  fetchAllFaqsAdmin: async () => {
    try {
      const response = await api.get('/api/faqs/admin', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch FAQs for admin.');
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/api/faqs', faqData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create FAQ.');
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/api/faqs/${id}`, faqData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update FAQ.');
    }
  },

  deleteFaq: async (id) => {
    try {
      const response = await api.delete(`/api/faqs/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete FAQ.');
    }
  },

  // --- Promotion Management ---
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
      const response = await api.get('/api/promotions/admin', { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch promotions for admin.');
    }
  },

  createPromotion: async (promoData) => {
    try {
      const response = await api.post('/api/promotions', promoData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create promotion.');
    }
  },

  updatePromotion: async (id, promoData) => {
    try {
      const response = await api.put(`/api/promotions/${id}`, promoData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update promotion.');
    }
  },

  deletePromotion: async (id) => {
    try {
      const response = await api.delete(`/api/promotions/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete promotion.');
    }
  },
};

export default DataService;
