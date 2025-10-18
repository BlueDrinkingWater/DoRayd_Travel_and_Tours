import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, UnifiedLoginPortal } from './components/Login.jsx';

// Shared Components
import { Navbar, Footer } from './components/shared/NavigationComponents.jsx';
import NotificationSystem from './components/shared/NotificationSystem.jsx';
import FAQChatbot from './components/FAQChatbot.jsx';
import EnvironmentInfo from './components/shared/EnvironmentInfo.jsx';
import ServerStatus from './components/shared/ServerStatus.jsx';

// Public Pages
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Cars from './pages/Cars.jsx';
import CarDetails from './pages/CarDetails.jsx';
import Tours from './pages/Tours.jsx';
import TourDetails from './pages/TourDetails.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import PublicFeedback from '@/pages/PublicFeedback.jsx'; // Corrected path using alias

// Shared Authed Pages
import AccountSettings from './pages/shared/AccountSettings.jsx';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard.jsx';

// Admin/Owner Pages
import AdminDashboard from './pages/owner/AdminDashboard.jsx';
import ManageCars from './pages/owner/ManageCars.jsx';
import ManageTours from './pages/owner/ManageTours.jsx';
import ManageBookings from './pages/owner/ManageBookings.jsx';
import EmployeeManagement from './pages/owner/EmployeeManagement.jsx';
import Reports from './pages/owner/Reports.jsx';
import Messages from './pages/owner/Messages.jsx';
import ContentManagement from './pages/owner/ContentManagement.jsx';
import ManageReviews from './pages/owner/ManageReviews.jsx';
import ManageFeedback from './pages/owner/ManageFeedback.jsx';
import CustomerManagement from './pages/owner/CustomerManagement.jsx';
import ManageFaqs from './pages/owner/ManageFaqs.jsx';
import ManagePromotions from './pages/owner/ManagePromotions.jsx';
import ManageQRCode from './pages/owner/ManageQRCode.jsx'; 

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard.jsx';

import DataService from './components/services/DataService.jsx';

function App() {
  const [systemReady, setSystemReady] = useState(false);
  const [systemError, setSystemError] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const healthData = await DataService.checkHealth();
        if (healthData.success && healthData.database === 'connected') {
          setSystemReady(true);
        } else {
          throw new Error('Backend check passed but database connection failed.');
        }
      } catch (error) {
        setSystemError(error.message);
        setSystemReady(false);
      }
    };
    checkSystemHealth();
  }, []);

  const handleShowLogin = () => {
    setShowRegistration(false);
    setShowLogin(true);
  }

  const handleShowRegistration = () => {
    setShowLogin(true);
    setShowRegistration(true);
  }

  if (!systemReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto"></div>
          <h2 className="text-2xl font-semibold mt-4">Connecting to Server...</h2>
          {systemError && <p className="text-red-500 mt-2">{systemError}</p>}
        </div>
      </div>
    );
  }

return (
    <div className="flex flex-col min-h-screen">
      {process.env.NODE_ENV === 'development' && <EnvironmentInfo />}
      <Navbar
        onCustomerLogin={handleShowLogin}
        onStaffLogin={handleShowLogin}
        onRegister={handleShowRegistration}
      />
      <main className="flex-grow">
        <NotificationSystem />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/tours/:id" element={<TourDetails />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedback" element={<PublicFeedback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          <Route
            path="/my-bookings"
            element={<ProtectedRoute requiredRole="customer"><CustomerDashboard /></ProtectedRoute>}
          />

          {/* Admin Protected Routes - SIMPLIFIED */}
          <Route path="/owner" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>}>
            <Route index element={null} /> {/* The parent AdminDashboard component will render the overview */}
            <Route path="dashboard" element={null} /> {/* This path also renders the overview via the parent */}
            <Route path="manage-cars" element={<ManageCars />} />
            <Route path="manage-tours" element={<ManageTours />} />
            <Route path="manage-bookings" element={<ManageBookings />} />
            <Route path="employee-management" element={<EmployeeManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="messages" element={<Messages />} />
            <Route path="content-management" element={<ContentManagement />} />
            <Route path="manage-reviews" element={<ManageReviews />} />
            <Route path="manage-feedback" element={<ManageFeedback />} />
            <Route path="manage-faqs" element={<ManageFaqs />} />
            <Route path="manage-promotions" element={<ManagePromotions />} />
            <Route path="manage-qr-code" element={<ManageQRCode />} />
            <Route path="customer-management" element={<CustomerManagement />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          {/* Employee Protected Routes - SIMPLIFIED */}
          <Route path="/employee" element={<ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>}>
             <Route index element={null} /> {/* The parent EmployeeDashboard component will render its overview */}
             <Route path="dashboard" element={null} /> {/* This path also renders the overview via the parent */}
             <Route path="manage-bookings" element={<ManageBookings />} />
             <Route path="messages" element={<Messages />} />
             <Route path="manage-cars" element={<ManageCars />} />
             <Route path="manage-tours" element={<ManageTours />} />
             <Route path="reports" element={<Reports />} />
             <Route path="content-management" element={<ContentManagement />} />
             <Route path="manage-reviews" element={<ManageReviews />} />
             <Route path="manage-feedback" element={<ManageFeedback />} />
             <Route path="manage-faqs" element={<ManageFaqs />} />
             <Route path="manage-promotions" element={<ManagePromotions />} />
             <Route path="manage-qr-code" element={<ManageQRCode />} />
             <Route path="customer-management" element={<CustomerManagement />} />
             <Route path="account-settings" element={<AccountSettings />} />
          </Route>

          <Route path="/unauthorized" element={<div>Access Denied</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <FAQChatbot />
      {process.env.NODE_ENV === 'development' && <ServerStatus />}
      <UnifiedLoginPortal isOpen={showLogin} onClose={() => setShowLogin(false)} showRegistration={showRegistration} />
    </div>
  );
}

export default App;