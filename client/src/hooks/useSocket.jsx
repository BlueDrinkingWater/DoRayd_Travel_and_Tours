import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../components/Login';
import DataService, { SERVER_URL } from '../components/services/DataService';

const socket = io(SERVER_URL, {
    autoConnect: false,
    transports: ['websocket'],
});

export const useSocket = () => {
  const { user, refreshUser } = useAuth();
  const [connected, setConnected] = useState(socket.connected);
  const [allNotifications, setAllNotifications] = useState([]);
  const [toastNotifications, setToastNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user) {
        const response = await DataService.fetchMyNotifications();
        if (response.success) {
          setAllNotifications(response.data);
        }
      }
    };

    fetchNotifications();

    if (user) {
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => {
          setConnected(true);
          socket.emit('join', user.role);
          if (user.role === 'customer' || user.role === 'employee') {
              socket.emit('join', user._id);
          }
        };

        const onDisconnect = () => {
          setConnected(false);
        };

        const onNotification = (data) => {
          const newNotif = { ...data, id: data._id || Date.now(), timestamp: new Date() };
          setAllNotifications((prev) => [newNotif, ...prev]);
          setToastNotifications((prev) => [newNotif, ...prev]);
        };
        
        const onPermissionsUpdated = () => {
            if (refreshUser) {
                refreshUser();
            }
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        
        // Listen for a single, generic 'notification' event for all real-time updates
        socket.on('notification', onNotification);
        socket.on('booking-update', onNotification);
        socket.on('permissions-updated', onPermissionsUpdated);

        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          socket.off('notification', onNotification);
          socket.off('booking-update', onNotification);
          socket.off('permissions-updated', onPermissionsUpdated);
        };
    } else {
        if (socket.connected) {
            socket.disconnect();
        }
    }
  }, [user, refreshUser]);

  const markOneAsRead = useCallback(async (id) => {
    try {
      await DataService.markNotificationAsRead(id);
      setAllNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch (error) {
      // Handle error silently in production
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await DataService.markAllNotificationsAsRead();
      setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      // Handle error silently in production
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    socket,
    connected,
    notifications: allNotifications,
    toastNotifications,
    markOneAsRead,
    markAllAsRead,
    removeToast,
  };
};