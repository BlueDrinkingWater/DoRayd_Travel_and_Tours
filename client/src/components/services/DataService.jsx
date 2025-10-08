import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
export const SERVER_URL = import.meta.env.VITE_API_URL || '';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      const response = await axios.get(`${API_URL}/health`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Server health check failed.');
    }
  },

  // --- Authentication & User Account ---
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Registration failed.');
    }
  },

  login: async (credentials) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  },
  
  socialLogin: async (provider, tokenData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/${provider}-login`, tokenData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || `${provider} login failed.`);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateUserProfile: async (userData) => {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update profile.');
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to change password.');
    }
  },

  // --- Forgot Password ---
  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to send password reset email.');
    }
  },

  // --- Reset Password ---
  resetPassword: async (token, password) => {
    try {
      const response = await axios.put(`${API_URL}/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to reset password.');
    }
  },

  // --- Notifications ---
  fetchMyNotifications: async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch notifications.');
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/${id}/read`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark notification as read.');
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const response = await axios.patch(`${API_URL}/notifications/read-all`, {}, { headers: getAuthHeader() });
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
      const response = await axios.post(`${API_URL}/upload/image`, formData, {
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
      const response = await axios.delete(`${API_URL}/upload/image/${category}/${filename}`, { 
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
      const response = await axios.get(`${API_URL}/cars`, { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchCarById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/cars/${id}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch car details.');
    }
  },

  fetchAllTours: async (filters = {}) => {
    try {
      const response = await axios.get(`${API_URL}/tours`, { params: filters });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchTourById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/tours/${id}`);
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
      
      const response = await axios.post(`${API_URL}/bookings`, bookingData, { headers });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create booking.');
    }
  },

  fetchUserBookings: async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings/my-bookings`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  fetchAllBookings: async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  updateBookingStatus: async (id, status, adminNotes) => {
    try {
      const response = await axios.put(`${API_URL}/bookings/${id}/status`, { status, adminNotes }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },
  
  cancelBooking: async (id, adminNotes) => {
    try {
      const response = await axios.patch(`${API_URL}/bookings/${id}/cancel`, { adminNotes }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to cancel booking.');
    }
  },

  // --- Availability Check ---
  getAvailability: async (serviceId) => {
    try {
      const response = await axios.get(`${API_URL}/bookings/availability/${serviceId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch availability.');
    }
  },

  // --- Reviews (for specific items) ---
  submitReview: async (reviewData) => {
    try {
      const response = await axios.post(`${API_URL}/reviews`, reviewData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit review.');
    }
  },

  getMyReviews: async () => {
    try {
      const response = await axios.get(`${API_URL}/reviews/my-reviews`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch your reviews.');
    }
  },

  fetchReviewsForItem: async (itemId) => {
    try {
      const response = await axios.get(`${API_URL}/reviews/item/${itemId}`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch reviews for item.');
    }
  },

  fetchAllReviews: async () => {
    try {
      const response = await axios.get(`${API_URL}/reviews`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch all reviews.');
    }
  },

  approveReview: async (reviewId) => {
    try {
      const response = await axios.patch(`${API_URL}/reviews/${reviewId}/approve`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve review.');
    }
  },

  disapproveReview: async (reviewId) => {
    try {
      const response = await axios.patch(`${API_URL}/reviews/${reviewId}/disapprove`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to disapprove review.');
    }
  },

  deleteReview: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/reviews/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete review.');
    }
  },

  // --- Feedback (for dashboard) ---
  submitFeedback: async (feedbackData) => {
    try {
      const response = await axios.post(`${API_URL}/feedback`, feedbackData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit feedback.');
    }
  },

  submitGeneralFeedback: async (feedbackData) => {
    try {
      const response = await axios.post(`${API_URL}/feedback`, feedbackData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to submit feedback.');
    }
  },

  getPublicFeedback: async () => {
    try {
      const response = await axios.get(`${API_URL}/feedback/public`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch public feedback.');
    }
  },

  fetchPublicFeedback: async () => {
    try {
      const response = await axios.get(`${API_URL}/feedback/public`);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch public feedback.');
    }
  },

  getMyFeedback: async () => {
    try {
      const response = await axios.get(`${API_URL}/feedback/my-feedback`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch your feedback.');
    }
  },

  fetchAllFeedback: async () => {
    try {
      const response = await axios.get(`${API_URL}/feedback`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch feedback.');
    }
  },

  approveFeedback: async (feedbackId) => {
    try {
      const response = await axios.patch(`${API_URL}/feedback/${feedbackId}/approve`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to approve feedback.');
    }
  },

  disapproveFeedback: async (feedbackId) => {
    try {
      const response = await axios.patch(`${API_URL}/feedback/${feedbackId}/disapprove`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to disapprove feedback.');
    }
  },

  // --- Customer Management ---
  fetchAllCustomers: async () => {
    try {
      const response = await axios.get(`${API_URL}/users/customers`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch customers.');
    }
  },

  resetCustomerPassword: async (customerId, password) => {
    try {
      const response = await axios.put(`${API_URL}/users/customers/${customerId}/reset-password`, { password }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to reset customer password.');
    }
  },

  // --- Car Management Functions (Admin) ---
  createCar: async (carData) => {
    try {
      const response = await axios.post(`${API_URL}/cars`, carData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create car.');
    }
  },

  updateCar: async (id, carData) => {
    try {
      const response = await axios.put(`${API_URL}/cars/${id}`, carData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update car.');
    }
  },

  archiveCar: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/cars/${id}/archive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive car.');
    }
  },

  unarchiveCar: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/cars/${id}/unarchive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive car.');
    }
  },

  // --- Tour Management Functions (Admin) ---
  createTour: async (tourData) => {
    try {
      const response = await axios.post(`${API_URL}/tours`, tourData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create tour.');
    }
  },

  updateTour: async (id, tourData) => {
    try {
      const response = await axios.put(`${API_URL}/tours/${id}`, tourData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update tour.');
    }
  },

  archiveTour: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/tours/${id}/archive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to archive tour.');
    }
  },

  unarchiveTour: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/tours/${id}/unarchive`, {}, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to unarchive tour.');
    }
  },

  // --- Message Management ---
  createMessage: async (messageData) => {
    try {
      const response = await axios.post(`${API_URL}/messages`, messageData);
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create message.');
    }
  },

  fetchAllMessages: async () => {
    try {
      const response = await axios.get(`${API_URL}/messages`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch messages.');
    }
  },

  markMessageAsRead: async (messageId) => {
    try {
      const response = await axios.put(`${API_URL}/messages/${messageId}/status`, { status: 'read' }, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to mark message as read.');
    }
  },

  replyToMessage: async (messageId, formData) => {
    try {
      const response = await axios.post(`${API_URL}/messages/${messageId}/reply`, formData, { 
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
      const response = await axios.get(`${API_URL}/users/employees`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to fetch employees.');
    }
  },

  createEmployee: async (employeeData) => {
    try {
      const response = await axios.post(`${API_URL}/users/employees`, employeeData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to create employee.');
    }
  },

  updateEmployee: async (id, employeeData) => {
    try {
      const response = await axios.put(`${API_URL}/users/employees/${id}`, employeeData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to update employee.');
    }
  },

  deleteEmployee: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/users/employees/${id}`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, 'Failed to delete employee.');
    }
  },

  // --- Analytics ---
  fetchDashboardAnalytics: async () => {
    try {
      const response = await axios.get(`${API_URL}/analytics/dashboard`, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  // --- Content Management ---
  fetchContent: async (type) => {
    try {
      const response = await axios.get(`${API_URL}/content/${type}`);
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to fetch '${type}' content.`);
    }
  },

  updateContent: async (type, contentData) => {
    try {
      const response = await axios.put(`${API_URL}/content/${type}`, contentData, { headers: getAuthHeader() });
      return response.data;
    } catch (error) {
      return handleError(error, `Failed to update '${type}' content.`);
    }
  },
};

export default DataService;