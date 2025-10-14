import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataService from '../services/DataService';

const NotificationBell = ({ notifications, markOneAsRead, markAllAsRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markOneAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const handleClearAll = () => {
    markAllAsRead();
  };

  // --- MODIFIED: This function now shows the full date and time ---
  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-full hover:bg-gray-100">
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] bg-white rounded-xl shadow-2xl border z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">You have {unreadCount} unread messages.</p>
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0 cursor-pointer group"
                >
                  <div className="flex items-center justify-center h-full">
                    {!notif.read && (
                      <span className="flex h-2 w-2 rounded-full bg-sky-500" />
                    )}
                  </div>
                  <div className="space-y-1 group-hover:bg-gray-50 p-2 rounded-md">
                    <p className="text-sm font-medium leading-none text-gray-800">
                      {notif.message}
                    </p>
                    {/* --- MODIFIED: Use the new date formatting function --- */}
                    <p className="text-sm text-gray-500">
                      {formatNotificationDate(notif.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">No new notifications</p>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={handleClearAll} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;