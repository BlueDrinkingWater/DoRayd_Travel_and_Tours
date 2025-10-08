import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../components/Login';
import DataService from '../components/services/DataService';

const socket = io({
    autoConnect: false,
    transports: ['websocket'], // Force WebSocket transport, bypassing HTTP polling
});

export const useSocket = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(socket.connected);
  const [allNotifications, setAllNotifications] = useState([]);
  const [toastNotifications, setToastNotifications] = useState([]);

  useEffect(() => {
    // Fetch all historical notifications for the bell on login
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
          console.log('✅ Socket connected successfully via WebSocket');
          setConnected(true);
          socket.emit('join', user.role);
          if (user.role === 'customer') {
              socket.emit('join', user._id);
          }
        };

        const onDisconnect = () => {
          console.log('🔌 Socket disconnected');
          setConnected(false);
        };

        // This handler is for NEW, incoming notifications
        const onNotification = (data) => {
          // FIX: Use the unique _id from the database as the primary key. Fallback to Date.now() just in case.
          const newNotif = { ...data, id: data._id || Date.now(), timestamp: new Date() };
          // Add to the main list for the bell
          setAllNotifications((prev) => [newNotif, ...prev]);
          // Add to the toast list to make it pop up
          setToastNotifications((prev) => [newNotif, ...prev]);
        };
        
        const handleNewBooking = (data) => onNotification(data);
        const handleNewMessage = (data) => onNotification(data);
        const handleNewReview = (data) => onNotification(data);
        const handleNewUser = (data) => onNotification(data);
        const handleBookingUpdate = (data) => onNotification(data);
        const handleNewCar = (data) => onNotification(data);
        const handleNewTour = (data) => onNotification(data);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        if (user.role === 'admin' || user.role === 'employee') {
            socket.on('new-booking', handleNewBooking);
            socket.on('new-message', handleNewMessage);
            socket.on('new-review', handleNewReview);
            socket.on('new-user', handleNewUser);
        }
        
        if (user.role === 'customer') {
            socket.on('booking-update', handleBookingUpdate);
            socket.on('new-car', handleNewCar);
            socket.on('new-tour', handleNewTour);
        }

        return () => {
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
          socket.off('new-booking', handleNewBooking);
          socket.off('new-message', handleNewMessage);
          socket.off('new-review', handleNewReview);
          socket.off('new-user', handleNewUser);
          socket.off('booking-update', handleBookingUpdate);
          socket.off('new-car', handleNewCar);
          socket.off('new-tour', handleNewTour);
        };
    } else {
        if (socket.connected) {
            socket.disconnect();
        }
    }
  }, [user]);

  const markOneAsRead = useCallback(async (id) => {
    try {
      await DataService.markNotificationAsRead(id);
      setAllNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await DataService.markAllNotificationsAsRead();
      setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    socket,
    connected,
    notifications: allNotifications, // Keep this name for the bell
    toastNotifications,
    markOneAsRead,
    markAllAsRead,
    removeToast,
  };
};