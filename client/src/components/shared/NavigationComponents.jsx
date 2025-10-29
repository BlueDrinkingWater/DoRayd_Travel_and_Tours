// client/src/components/shared/NavigationComponents.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Shield, UserCheck, Phone, Mail, MapPin, Clock, LayoutDashboard, Settings, Bus } from 'lucide-react'; // <-- Imported Bus
import { useAuth } from '../Login';
import logo from '../../assets/logo.svg';
import { useSocket } from '../../hooks/useSocket';
import NotificationBell from './NotificationBell.jsx';
// REMOVE: import { getImageUrl } from '../services/DataService.jsx'; // Import getImageUrl
import { useSecureImage } from '../../hooks/useSecureImage.jsx'; // <-- ADD: Import useSecureImage

export const Navbar = ({ onCustomerLogin, onStaffLogin, onRegister }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { notifications, markOneAsRead, markAllAsRead } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  const { secureUrl: profilePicUrl, loading: profilePicLoading } = useSecureImage(user?.profilePicture);

  const navigation = [
    // ... existing navigation items ...
    { name: 'Home', href: '/' },
    { name: 'Cars', href: '/cars' },
    { name: 'Tours', href: '/tours' },
    { name: 'Transport', href: '/transport' }, // <-- ADDED
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Feedback', href: '/feedback' },
  ];

  // ... existing useEffect and handlers ...

  useEffect(() => {
    // ... existing handleClickOutside logic ...
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

   const handleDashboardAccess = () => {
    let path = '/';
    if(user?.role === 'admin') path = '/owner/dashboard';
    if(user?.role === 'employee') path = '/employee/dashboard';
    if(user?.role === 'customer') path = '/my-bookings';
    navigate(path);
    setUserMenuOpen(false);
  };

  const handleAccountSettings = () => {
    let path = '/account-settings';
    if (user?.role === 'admin') path = '/owner/account-settings';
    if (user?.role === 'employee') path = '/employee/account-settings';
    navigate(path);
    setUserMenuOpen(false);
  };


  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center relative">

          {/* LEFT: Logo/Name - Force to Left Edge */}
          {/* ... */}
           <div className="flex items-center flex-shrink-0 z-10">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <img src={logo} alt="Do Rayd Travel and Tours Logo" className="h-12 w-auto transition-transform group-hover:scale-105" />
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Do Rayd Travel and Tours
              </span>
            </Link>
          </div>

          {/* CENTER: Desktop Navigation Links - Centered using absolute positioning */}
          {/* ... */}
           <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 items-center space-x-1 h-full z-0">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                    location.pathname === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                  {location.pathname === item.href && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>
          </div>


          {/* RIGHT: User Actions/Profile - Force to Right Edge */}
          <div className="flex items-center space-x-2 flex-shrink-0 z-10">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">

                <NotificationBell
                  notifications={notifications}
                  markOneAsRead={markOneAsRead}
                  markAllAsRead={markAllAsRead}
                />

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-50 transition-all duration-300"
                  >
                     {/* --- MODIFIED: Profile Picture Display --- */}
                    <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                       {profilePicLoading ? (
                           <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                       ) : profilePicUrl ? (
                           <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                           <span className="text-white text-sm font-semibold">
                               {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                           </span>
                       )}
                    </div>
                     {/* --- END MODIFICATION --- */}
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                  </button>

                  {/* DESIGN UPDATE: User Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white/80 backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                             {/* --- MODIFIED: Profile Picture Display (Dropdown) --- */}
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                               {profilePicLoading ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                               ) : profilePicUrl ? (
                                   <img src={profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                               ) : (
                                   <span className="text-white font-semibold">
                                       {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                   </span>
                               )}
                            </div>
                             {/* --- END MODIFICATION --- */}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mt-1 capitalize">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        {/* ... dropdown menu items ... */}
                        <button
                          onClick={handleDashboardAccess}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-3 text-blue-500" />
                          Dashboard
                        </button>

                        <button
                          onClick={handleAccountSettings}
                          className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-3 text-gray-500" />
                          Account Settings
                        </button>

                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ... Sign In / Get Started buttons ...
               <div className="flex items-center space-x-2">
                <button
                  onClick={onCustomerLogin}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-full transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onRegister}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {/* ... */}
         {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Footer component remains unchanged
export const Footer = () => {
   // ... existing footer code ...
    return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img src={logo} alt="Logo" className="h-10 w-auto" />
              <span className="ml-3 text-xl font-bold">Do Rayd Travel and Tours</span>
            </div>
            <p className="text-gray-300 mb-4">
              Your trusted partner for memorable travel experiences. Discover the Philippines with our premium car rentals and curated tours.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center text-gray-300">
                <Phone className="h-4 w-4 mr-2" />
                <span>+63 123 456 7890</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="h-4 w-4 mr-2" />
                <span>info@dorayd.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/cars" className="text-gray-300 hover:text-white transition-colors">Cars</Link></li>
              <li><Link to="/tours" className="text-gray-300 hover:text-white transition-colors">Tours</Link></li>
              <li><Link to="/transport" className="text-gray-300 hover:text-white transition-colors">Transport</Link></li> {/* <-- ADDED */}
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-start text-gray-300">
                <MapPin className="h-5 w-5 mr-2 mt-0.5" />
                <span>123 Tourism Street, Manila, Philippines</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Clock className="h-4 w-4 mr-2" />
                <span>24/7 Customer Support</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-300">
          <p>&copy; {new Date().getFullYear()} Do Rayd Travel and Tours. All rights reserved.</p> {/* Updated Year Dynamically */}
        </div>
      </div>
    </footer>
  );
};
