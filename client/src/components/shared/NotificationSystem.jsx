import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useSocket } from "../../hooks/useSocket.jsx";

const NotificationSystem = () => {
  const { toastNotifications, removeToast, markOneAsRead } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (toastNotifications.length > 0) {
      const latestToast = toastNotifications[0];
      const timer = setTimeout(() => {
        removeToast(latestToast.id);
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [toastNotifications, removeToast]);
  
  const handleToastClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markOneAsRead(notification._id);
    }
    // Navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
    }
    // Remove the toast from view
    removeToast(notification.id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getNotificationStyles = (type) => {
    const baseStyles = "border-l-4 rounded-lg shadow-lg p-4 mb-3 transition-all duration-300 transform cursor-pointer";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-800`;
      default:
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800`;
    }
  };

  if (toastNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-sm space-y-2">
      {toastNotifications.map((notification) => (
        <div
          key={notification.id || notification._id}
          className={getNotificationStyles(notification.type)}
          onClick={() => handleToastClick(notification)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent navigation when closing
                removeToast(notification.id);
              }}
              className="flex-shrink-0 ml-2 text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;