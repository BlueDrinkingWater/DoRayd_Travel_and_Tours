import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, MapPin, Calendar, MessageSquare, LogOut, Menu, X, FileText, Settings
} from 'lucide-react';
import { useAuth } from '../../components/Login.jsx';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const allNavItems = [
    { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Manage Cars', href: '/employee/manage-cars', icon: Car, permission: 'cars' },
    { name: 'Manage Tours', href: '/employee/manage-tours', icon: MapPin, permission: 'tours' },
    { name: 'Manage Bookings', href: '/employee/manage-bookings', icon: Calendar, permission: 'bookings' },
    { name: 'Messages', href: '/employee/messages', icon: MessageSquare, permission: 'messages' },
    { name: 'Reports', href: '/employee/reports', icon: FileText, permission: 'reports' },
    { name: 'Content', href: '/employee/content-management', icon: Settings, permission: 'content' },
  ];
  
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    if (permission === 'dashboard') return true;
    return user.permissions.some(p => p.module === permission);
  };

  const navigation = allNavItems.filter(item => hasPermission(item.permission));
  
  const currentNavItem = navigation.find(item => location.pathname.startsWith(item.href));
  
  const renderDashboardView = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold">Employee Dashboard</h2>
      <p className="mt-2 text-gray-600">Welcome, {user?.firstName}! Select a task from the sidebar to get started.</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-200 ease-in-out bg-white w-64 z-30 shadow-lg`}>
        <div className="flex items-center justify-center h-16 border-b">
            <h1 className="text-xl font-bold text-green-600">Employee Panel</h1>
        </div>
        <nav className="mt-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-2 mx-2 my-1 rounded-lg transition-colors ${location.pathname.startsWith(item.href) ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t absolute bottom-0 w-full">
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{user?.position}</p>
            <button onClick={handleLogout} className="w-full mt-2 text-left flex items-center text-sm text-red-600 hover:bg-red-50 p-2 rounded-lg">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white border-b">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden mr-4 text-gray-600"><Menu size={24} /></button>
                <h1 className="text-xl font-semibold">{currentNavItem?.name || 'Dashboard'}</h1>
            </div>
            {/* The global notification bell is in the main Navbar, so no need for another one here */}
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
           {location.pathname === '/employee' || location.pathname === '/employee/dashboard' ? renderDashboardView() : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
