import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Car, MapPin, Calendar, MessageSquare, LogOut, Menu, X, FileText, Settings, Star, Users, HelpCircle, Tag, Award, Heart, Clock, Bell
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import DataService from '../../components/services/DataService.jsx';
import { useApi } from '../../hooks/useApi.jsx';
import BookingCalendar from '../owner/BookingCalendar';
import adBG from '../../assets/adBG.jpg';

// Helper function to format currency
const formatCurrency = (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

// StatCard component copied from AdminDashboard
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colorMap = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        yellow: 'from-yellow-500 to-orange-500',
        pink: 'from-pink-500 to-rose-500',
        red: 'from-red-500 to-red-600'
    };
    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="text-white" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
        </div>
    );
};


const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDashboardPage = location.pathname === '/employee' || location.pathname === '/employee/dashboard';

  // Fetch analytics data
  const { data: dashboardData, loading, error } = useApi(() => DataService.fetchDashboardAnalytics(), [], { immediate: isDashboardPage });


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const allNavItems = [
    { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Manage Cars', href: '/employee/manage-cars', icon: Car, permission: 'cars' },
    { name: 'Manage Tours', href: '/employee/manage-tours', icon: MapPin, permission: 'tours' },
    { name: 'Manage Bookings', href: '/employee/manage-bookings', icon: Calendar, permission: 'bookings' },
    { name: 'Manage Reviews', href: '/employee/manage-reviews', icon: Star, permission: 'reviews' },
    { name: 'Manage Feedback', href: '/employee/manage-feedback', icon: Heart, permission: 'feedback' },
    { name: 'Manage FAQs', href: '/employee/manage-faqs', icon: HelpCircle, permission: 'faqs' },
    { name: 'Manage Promotions', href: '/employee/manage-promotions', icon: Tag, permission: 'promotions' },
    { name: 'Reports', href: '/employee/reports', icon: FileText, permission: 'reports' },
    { name: 'Content Management', href: '/employee/content-management', icon: Settings, permission: 'content' },
    { name: 'Messages', href: '/employee/messages', icon: MessageSquare, permission: 'messages' },
    { name: 'Customer Management', href: '/employee/customer-management', icon: Users, permission: 'customers' },
    { name: 'Account Settings', href: '/employee/account-settings', icon: Settings, permission: 'dashboard' }, // Added
  ];

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    if (permission === 'dashboard') return true;
    return user.permissions.some(p => p.module === permission);
  };

  const navigation = allNavItems.filter(item => hasPermission(item.permission));

  const currentNavItem = navigation.find(item => location.pathname.startsWith(item.href));

  const renderDashboardView = () => (
    <div className="space-y-8">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
            <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.firstName}! Here's a real-time overview of business operations.</p>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error.message}</div>}

        {loading ? <p className="text-center py-8 text-gray-500">Loading statistics...</p> : dashboardData && dashboardData.data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard title="Total Cars" value={dashboardData.data.summary.totalCars || 0} icon={Car} color="blue" />
                <StatCard title="Total Tours" value={dashboardData.data.summary.totalTours || 0} icon={MapPin} color="purple" />
                <StatCard title="Total Bookings" value={dashboardData.data.summary.totalBookings || 0} icon={Calendar} color="green" />
                <StatCard title="Pending Bookings" value={dashboardData.data.summary.pendingBookings || 0} icon={Clock} color="yellow" />
                <StatCard title="Total Messages" value={dashboardData.data.summary.totalMessages || 0} icon={MessageSquare} color="pink" />
                <StatCard title="New Messages" value={dashboardData.data.summary.newMessages || 0} icon={Bell} color="red" />
            </div>
        )}

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-blue-600" /> Booking Calendar
            </h2>
            <BookingCalendar />
        </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-gray-100" style={{ backgroundImage: `url(${adBG})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>
        <div className="relative flex h-full min-h-screen">
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-black/30 backdrop-blur-lg text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}>
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        {sidebarOpen && (
                            <div>
                                <h2 className="text-xl font-bold">DoRayd</h2>
                                <p className="text-white/70 text-xs">Employee Portal</p>
                            </div>
                        )}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto py-4">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link key={item.name} to={item.href} className={`flex items-center gap-3 px-6 py-3 transition-all ${isActive ? 'bg-white/90 text-blue-600' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                                <Icon size={20} className={!sidebarOpen ? 'mx-auto' : ''} />
                                {sidebarOpen && <span className="font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-white/10">
                    {sidebarOpen && (
                        <>
                            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-gray-300">{user?.position}</p>
                        </>
                    )}
                    <button onClick={handleLogout} className="w-full mt-2 text-left flex items-center text-sm text-red-400 hover:bg-red-500/20 p-2 rounded-lg">
                        <LogOut className="w-4 h-4 mr-2" /> {sidebarOpen && 'Sign Out'}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white/10 backdrop-blur-lg border-b border-white/20 text-white z-10">
                    <div className="flex items-center">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-4"><Menu size={24} /></button>
                        <h1 className="text-xl font-semibold">{currentNavItem?.name || 'Dashboard'}</h1>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-6">
                   {isDashboardPage ? renderDashboardView() : <Outlet />}
                </main>
            </div>
        </div>
    </div>
  );
};

export default EmployeeDashboard;