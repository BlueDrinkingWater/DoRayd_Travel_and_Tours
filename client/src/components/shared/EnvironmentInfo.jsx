import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, Server, Clock } from 'lucide-react';
import DataService from '../services/DataService.jsx';

const EnvironmentInfo = () => {
  const [systemStatus, setSystemStatus] = useState({
    backend: 'checking',
    database: 'checking',
    lastCheck: null
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check system status on mount and every 30 seconds
    const checkSystemStatus = async () => {
      try {
        const healthData = await DataService.checkHealth();
        setSystemStatus({
          backend: 'online',
          database: healthData.database === 'connected' ? 'online' : 'offline',
          lastCheck: new Date()
        });
      } catch (error) {
        console.warn('Health check failed:', error);
        setSystemStatus({
          backend: 'offline',
          database: 'offline',
          lastCheck: new Date()
        });
      }
    };

    checkSystemStatus();
    const statusInterval = setInterval(checkSystemStatus, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(statusInterval);
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const StatusIndicator = ({ status, label, icon: Icon }) => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        status === 'online' ? 'bg-green-500' : 
        status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
      }`}></div>
      <Icon className="w-4 h-4 text-gray-600" />
      <span className="text-xs text-gray-600">{label}: {status}</span>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-1 px-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">DEV MODE</span>
          </div>
          
          <StatusIndicator 
            status={systemStatus.backend} 
            label="API" 
            icon={Server}
          />
          
          <StatusIndicator 
            status={systemStatus.database} 
            label="MongoDB" 
            icon={Database}
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{currentTime.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>User: BlueDrinkingWater</span>
          </div>

          {systemStatus.lastCheck && (
            <div className="flex items-center gap-2">
              <span>Last Check: {systemStatus.lastCheck.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentInfo;