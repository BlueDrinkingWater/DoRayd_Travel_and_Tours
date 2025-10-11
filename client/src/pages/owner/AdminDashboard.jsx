import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, FileText, Settings, MessageSquare, Users,
    Car, MapPin, LogOut, Menu, X, Bell, User, ChevronDown, Globe,
    Clock, CheckCircle, AlertTriangle, Eye, Plus, BarChart3, Activity, RefreshCw, RotateCcw, Edit, Archive, Star, HelpCircle, Tag, QrCode
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';
import DataService from '../../components/services/DataService.jsx';
import BookingCalendar from './BookingCalendar';
import { useSocket } from '../../hooks/useSocket.jsx';
import { useApi } from '../../hooks/useApi.jsx';

// Re-usable helper components
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatCurrency = (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { socket } = useSocket();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const isDashboardPage = location.pathname === '/owner' || location.pathname === '/owner/dashboard';

    const { data: dashboardData, loading, error, refetch: fetchDashboardData } = useApi(() => DataService.fetchDashboardAnalytics(), [], { immediate: isDashboardPage });
    const { data: activityLogData, loading: activityLogLoading, refetch: fetchActivityLogs } = useApi(() => DataService.fetchActivityLogs(), [], { immediate: isDashboardPage });

    const navigation = [
        { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
        { name: 'Manage Cars', href: '/owner/manage-cars', icon: Car },
        { name: 'Manage Tours', href: '/owner/manage-tours', icon: MapPin },
        { name: 'Manage Bookings', href: '/owner/manage-bookings', icon: Calendar },
        { name: 'Manage Reviews', href: '/owner/manage-reviews', icon: Star },
        { name: 'Manage Feedback', href: '/owner/manage-feedback', icon: MessageSquare },
        { name: 'Manage FAQs', href: '/owner/manage-faqs', icon: HelpCircle },
        { name: 'Manage Promotions', href: '/owner/manage-promotions', icon: Tag },
        { name: 'Manage QR Code', href: '/owner/manage-qr-code', icon: QrCode },
        { name: 'Reports', href: '/owner/reports', icon: FileText },
        { name: 'Content Management', href: '/owner/content-management', icon: Settings },
        { name: 'Messages', href: '/owner/messages', icon: MessageSquare },
        { name: 'Employee Management', href: '/owner/employee-management', icon: Users },
        { name: 'Customer Management', href: '/owner/customer-management', icon: Users },
        { name: 'Account Settings', href: '/owner/account-settings', icon: Settings },
    ];
    
    useEffect(() => {
        if (isDashboardPage) {
            const handleRealtimeUpdate = () => {
                fetchDashboardData();
                fetchActivityLogs();
            };

            socket.on('new-booking', handleRealtimeUpdate);
            socket.on('activity-log-update', handleRealtimeUpdate);

            return () => {
                socket.off('new-booking', handleRealtimeUpdate);
                socket.off('activity-log-update', handleRealtimeUpdate);
            };
        }
    }, [isDashboardPage, socket, fetchDashboardData, fetchActivityLogs]);


    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const renderDashboardView = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p>Welcome back, {user?.firstName}! Here's a real-time overview of your business.</p>
            </div>
            
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error.message}</div>}
            
            {loading ? <p>Loading statistics...</p> : dashboardData && dashboardData.data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard title="Total Cars" value={dashboardData.data.summary.totalCars || 0} icon={Car} />
                    <StatCard title="Total Tours" value={dashboardData.data.summary.totalTours || 0} icon={MapPin} />
                    <StatCard title="Total Bookings" value={dashboardData.data.summary.totalBookings || 0} icon={Calendar} />
                    <StatCard title="Pending Bookings" value={dashboardData.data.summary.pendingBookings || 0} icon={Clock} />
                    <StatCard title="Total Messages" value={dashboardData.data.summary.totalMessages || 0} icon={MessageSquare} />
                    <StatCard title="New Messages" value={dashboardData.data.summary.newMessages || 0} icon={Bell} />
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Booking Calendar</h2>
                    <BookingCalendar />
                </div>
                <div>
                     <ActivityLogTracker logs={activityLogData?.data || []} loading={activityLogLoading} />
                </div>
            </div>
            
            {dashboardData && dashboardData.data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RecentActivityList title="Recent Bookings" items={dashboardData.data.recentBookings} type="booking" />
                    <RecentActivityList title="Recent Messages" items={dashboardData.data.recentMessages} type="message" />
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <span className="text-white font-semibold text-lg">DoRayd Admin</span>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white"><X /></button>
                </div>
                <nav className="mt-2 px-3 flex-1 overflow-y-auto">
                    {navigation.map((item) => (
                        <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl my-1 ${location.pathname.startsWith(item.href) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                            <item.icon className={`mr-3 h-5 w-5 ${location.pathname.startsWith(item.href) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t absolute bottom-0 w-full">
                    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <button onClick={handleLogout} className="w-full mt-2 text-left flex items-center text-sm text-red-600 hover:bg-red-50 p-2 rounded-lg">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col">
                <header className="sticky top-0 z-40 bg-white shadow-sm border-b">
                    <div className="flex items-center justify-between h-16 px-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500"><Menu /></button>
                        <h1 className="text-xl font-bold text-slate-800">{navigation.find(nav => location.pathname.startsWith(nav.href))?.name || 'Dashboard'}</h1>
                    </div>
                </header>
                <main className="flex-1 p-6 overflow-y-auto">
                    {isDashboardPage ? renderDashboardView() : <Outlet />}
                </main>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border">
      <Icon className="w-8 h-8 text-indigo-500 mb-2" />
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </div>
);
  
const RecentActivityList = ({ title, items, type }) => (
      <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b"><h3 className="text-lg font-semibold">{title}</h3></div>
          <div className="p-4 space-y-3">
              {items && items.length > 0 ? items.map(item => (
                  <div key={item._id} className="flex justify-between items-center text-sm">
                      <div>
                          <p className="font-medium">{type === 'booking' ? item.bookingReference : item.subject}</p>
                          <p className="text-slate-500">{type === 'booking' ? `${item.user?.firstName} ${item.user?.lastName}` : item.name}</p>
                      </div>
                      <div className="text-right">
                          {type === 'booking' && <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>}
                          <p className="text-slate-500">{formatDate(item.createdAt)}</p>
                      </div>
                  </div>
              )) : <p className="text-center text-slate-500 py-4">No recent activity.</p>}
          </div>
      </div>
);
  
const ActivityLogTracker = ({ logs, loading }) => (
      <div className="bg-white rounded-xl shadow-sm border h-full">
          <div className="p-4 border-b"><h3 className="text-lg font-semibold flex items-center gap-2"><Activity /> Employee Activity</h3></div>
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-65px)]">
              {loading ? <p className="text-center text-slate-500 py-4">Loading activities...</p> : 
               logs.length > 0 ? logs.map(log => (
                  <Link to={log.link || '#'} key={log._id} className="block hover:bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-start gap-3 text-sm">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-gray-500" />
                          </div>
                          <div>
                              <p className="font-medium text-gray-800">
                                  {log.employee.firstName} {log.employee.lastName}
                                  <span className="text-gray-500 font-normal"> {log.action.replace(/_/g, ' ').toLowerCase()}</span>
                              </p>
                              <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                      </div>
                  </Link>
              )) : <p className="text-center text-slate-500 py-4">No employee activity yet.</p>}
          </div>
      </div>
);

export default AdminDashboard;