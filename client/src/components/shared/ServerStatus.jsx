import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

const ServerStatus = () => {
  const [status, setStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setStatus('online');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('offline');
    }
    setLastCheck(new Date().toLocaleTimeString());
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm ${
        status === 'online' ? 'bg-green-100 text-green-800' :
        status === 'error' ? 'bg-yellow-100 text-yellow-800' :
        status === 'offline' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {status === 'online' ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Server Online</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Server Error</span>
          </>
        ) : status === 'offline' ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Server Offline</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Checking...</span>
          </>
        )}
        {lastCheck && (
          <span className="text-xs opacity-70">({lastCheck})</span>
        )}
      </div>
    </div>
  );
};

export default ServerStatus;