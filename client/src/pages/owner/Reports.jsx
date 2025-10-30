import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Car, 
  MapPin,
  // RefreshCw and Printer icons are no longer needed
} from 'lucide-react';
import DataService from '../../components/services/DataService';
import { useReactToPrint } from 'react-to-print';

const Reports = () => {
  const [chartPeriod, setChartPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef, // Use contentRef to avoid timing errors
    documentTitle: 'DoRayd - Reports & Analytics',
  });

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await DataService.fetchDashboardAnalytics();
      
      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setError(response.message || 'Failed to load analytics data');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating reports from database...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="text-center p-10 text-red-500">
        <p className="text-lg font-semibold mb-2">Could not load report data from the server.</p>
        {error && <p className="text-sm text-gray-600 mb-4">{error}</p>}
        <button 
          onClick={fetchReportData} 
          className="bg-red-100 text-red-700 px-6 py-2 rounded-lg hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const summary = reportData.summary || {};
  const popular = reportData.popular || { cars: [], tours: [] };
  const revenueTrend = reportData.revenueTrend || {};
  const chartData = revenueTrend[chartPeriod] || [];

  return (
    <div className="space-y-6 p-6" ref={componentRef}> 
        <div className="flex items-center justify-between mb-6 text-white print-hide">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-white">Real-time performance from your database</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchReportData} 
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          
          <button 
            onClick={handlePrint} 
            className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₱${parseFloat(summary.totalRevenue || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          growth={summary.revenueGrowth} 
          icon={DollarSign} // Prop is still passed but component won't render it
          color="green" 
        />
        <StatCard 
          title="Completed Bookings" 
          value={(summary.totalBookings || 0).toLocaleString()} 
          icon={Calendar} // Prop is still passed but component won't render it
          color="blue" 
        />
        <StatCard 
          title="Avg. Revenue/Booking" 
          value={`₱${parseFloat(summary.avgRevenuePerBooking || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          icon={TrendingUp} // Prop is still passed but component won't render it
          color="purple" 
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${parseFloat(summary.conversionRate || 0).toFixed(1)}%`} 
          icon={Users} // Prop is still passed but component won't render it
          color="orange" 
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend (Completed Bookings)</h3>
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg print-hide">
            {['daily', 'monthly', 'quarterly', 'yearly'].map(period => (
              <button 
                key={period} 
                onClick={() => setChartPeriod(period)} 
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                  chartPeriod === period 
                    ? 'bg-white text-blue-600 shadow' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                fontSize={12}
                angle={chartPeriod === 'daily' ? -45 : 0}
                textAnchor={chartPeriod === 'daily' ? 'end' : 'middle'}
                height={chartPeriod === 'daily' ? 80 : 30}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12} 
                tickFormatter={(value) => {
                  if (value >= 1000000) return `₱${(value/1000000).toFixed(1)}M`;
                  if (value >= 1000) return `₱${(value/1000).toFixed(0)}k`;
                  return `₱${value}`;
                }}
              />
              <Tooltip
                cursor={{fill: 'rgba(239, 246, 255, 0.5)'}}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '0.5rem',
                  padding: '8px 12px'
                }}
                formatter={(value) => [`₱${parseFloat(value).toLocaleString('en-US', {minimumFractionDigits: 2})}`, 'Revenue']}
              />
              <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}} />
              <Bar 
                dataKey="Revenue" 
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]}
                name="Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">No revenue data available for {chartPeriod} view</p>
            <p className="text-sm mt-2">Complete some bookings to see revenue trends</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PopularList title="Most Booked Cars" items={popular.cars || []} icon={Car} type="car" />
        <PopularList title="Most Booked Tours" items={popular.tours || []} icon={MapPin} type="tour" />
      </div>
    </div>
  );
};

// Helper Components
// --- StatCard: Icon rendering removed ---
const StatCard = ({ title, value, growth, subtitle, icon: Icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {/* Icon div removed */}
      </div>
      {growth !== undefined && growth !== null && (
        <p className={`text-sm mt-3 font-medium flex items-center gap-1 ${
          parseFloat(growth) >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{parseFloat(growth) >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(parseFloat(growth)).toFixed(1)}% from last month</span>
        </p>
      )}
    </div>
  );
};

// --- PopularList: Icon rendering removed ---
const PopularList = ({ title, items, icon: Icon, type }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">
      {/* Icon removed from title */}
      {title}
    </h3>
    <div className="space-y-3">
      {items && items.length > 0 ? (
        items.map((item, index) => (
          <div key={item._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{index + 1}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {type === 'car' 
                    ? `${item.brand || ''} ${item.model || ''}`.trim() || 'Unknown Car'
                    : item.title || 'Untitled Tour'
                  }
                </p>
                <p className="text-sm text-gray-600">
                  {item.bookingCount || 0} booking{item.bookingCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          {/* Icon div removed from placeholder */}
          <p className="text-gray-500 font-medium">No booking data yet</p>
          <p className="text-sm text-gray-400 mt-1">Complete bookings to see popularity rankings</p>
        </div>
      )}
    </div>
  </div>
);

export default Reports;