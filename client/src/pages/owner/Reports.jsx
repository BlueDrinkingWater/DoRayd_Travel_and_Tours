import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Car, 
  MapPin,
  Bus,
  TrendingDown, 
  Scale,
  XCircle,
  Ban
} from 'lucide-react';
import DataService from '../../components/services/DataService';
import { useReactToPrint } from 'react-to-print';
import { useSocket } from '../../hooks/useSocket'; 

const Reports = () => {
  const [chartPeriod, setChartPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const { socket } = useSocket(); 

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef, 
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

  useEffect(() => {
    if (socket) {
      const handleStatsUpdate = () => {
        console.log('Stats update received from server. Refetching analytics...');
        fetchReportData();
      };
      socket.on('stats_updated', handleStatsUpdate);
      return () => {
        socket.off('stats_updated', handleStatsUpdate);
      };
    }
  }, [socket]); 

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
  const popular = reportData.popular || { cars: [], tours: [], transport: [] };
  const revenueTrend = reportData.revenueTrend || {};
  const chartData = revenueTrend[chartPeriod] || [];
  
  const formatAsPeso = (value) => `₱${parseFloat(value || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const SectionHeader = ({ title }) => (
    <h3 className="text-lg font-semibold text-white pt-4 mt-4 border-t border-gray-200/10 print:text-black print:border-gray-300">
      {title}
    </h3>
  );

  return (
    <div className="space-y-6 p-6" ref={componentRef}> 
        {/* --- 1. NEW PRINT-ONLY HEADER --- */}
        <div className="print-header hidden">
          <h1 className="text-3xl font-bold">DoRayd Travel & Tours - Analytics Report</h1>
          <p className="text-lg">Generated on: {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
        </div>

        {/* --- 2. SCREEN-ONLY HEADER (now has print-hide) --- */}
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

        {/* --- 3. Top-Line KPI Row (Added print-grid-stack) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print-grid-stack">
          <StatCard 
            title="Gross Revenue (Lifetime)" 
            value={formatAsPeso(summary.totalRevenue)} 
            growth={summary.revenueGrowth} 
            icon={DollarSign} 
            color="green" 
          />
          <StatCard 
            title="Net Revenue (Lifetime)" 
            value={formatAsPeso(summary.netRevenue)} 
            subtitle="Gross Revenue - Total Refunds"
            icon={Scale}
            color="blue" 
          />
          <StatCard 
            title="Total Refunds (Lifetime)" 
            value={formatAsPeso(summary.totalRefundsAmount)}
            subtitle={`${(summary.totalRefunds || 0).toLocaleString()} approved requests`}
            icon={TrendingDown} 
            color="red" 
          />
          <StatCard 
            title="Completed Bookings" 
            value={(summary.totalBookings || 0).toLocaleString()} 
            icon={Calendar} 
            color="purple" 
          />
        </div>

        {/* --- 4. Main 2-Column Layout (Added print-stack-vertical) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-stack-vertical">

          {/* --- Main Column (Charts & Popular Lists) --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Chart */}
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
                      formatter={(value, name) => [formatAsPeso(value), name]}
                    />
                    <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}} />
                    <Bar 
                      dataKey="Revenue" 
                      fill="#4f46e5" // Blue
                      radius={[4, 4, 0, 0]}
                      name="Gross Revenue"
                    />
                    <Bar 
                      dataKey="Net" 
                      fill="#16a34a" // Green
                      radius={[4, 4, 0, 0]}
                      name="Net Revenue"
                    />
                    <Bar 
                      dataKey="Refunds" 
                      fill="#dc2626" // Red
                      radius={[4, 4, 0, 0]}
                      name="Refunds"
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

            {/* Booking Types (Added print-grid-stack) */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Types (All-Time)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-grid-stack">
                <StatCard 
                  title="Car Bookings" 
                  value={((summary.allBookings || 0) - (summary.totalTourBookings || 0) - (summary.totalTransportBookings || 0)).toLocaleString()} 
                  subtitle="Total car-related bookings"
                  color="blue"
                />
                <StatCard 
                  title="Tour Bookings" 
                  value={(summary.totalTourBookings || 0).toLocaleString()} 
                  subtitle="Total tour-related bookings"
                  color="green"
                />
                <StatCard 
                  title="Transport Bookings" 
                  value={(summary.totalTransportBookings || 0).toLocaleString()} 
                  subtitle="Total transport-related bookings"
                  color="purple"
                />
              </div>
            </div>


            {/* Popular Lists (Added print-grid-stack) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-grid-stack">
              <PopularList title="Most Booked Cars" items={popular.cars || []} icon={Car} type="car" />
              <PopularList title="Most Booked Tours" items={popular.tours || []} icon={MapPin} type="tour" />
              <PopularList title="Most Booked Transport" items={popular.transport || []} icon={Bus} type="transport" />
            </div>
          </div>

          {/* --- Right Sidebar (Secondary Metrics) --- */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold text-white print:text-black">At-a-Glance Metrics</h2>

            {/* (Added print-grid-stack) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 print-grid-stack">

              <div className="space-y-6">
                <SectionHeader title="Booking Funnel" />
                <StatCard 
                  title="All Bookings (Total)" 
                  value={(summary.allBookings || 0).toLocaleString()} 
                  color="gray"
                />
                <StatCard 
                  title="Conversion Rate" 
                  value={`${parseFloat(summary.conversionRate || 0).toFixed(1)}%`} 
                  icon={Users} 
                  color="orange" 
                />
                <StatCard 
                  title="Avg. Revenue/Booking" 
                  value={formatAsPeso(summary.avgRevenuePerBooking)} 
                  icon={TrendingUp} 
                  color="purple" 
                />
              </div>
              
              <div className="space-y-6">
                <SectionHeader title="Lost Revenue" />
                <StatCard 
                  title="Cancelled Bookings (Lost)" 
                  value={formatAsPeso(summary.totalCancelledAmount)}
                  subtitle={`${(summary.totalCancelled || 0).toLocaleString()} bookings`}
                  icon={XCircle}
                  color="red"
                />
                <StatCard 
                  title="Rejected Bookings (Lost)" 
                  value={formatAsPeso(summary.totalRejectedAmount)}
                  subtitle={`${(summary.totalRejected || 0).toLocaleString()} bookings`}
                  icon={Ban}
                  color="orange"
                />
              </div>

            </div>
          </div>

        </div>

        {/* --- 5. NEW: Print Stylesheet --- */}
        <style>
          {`
            @media print {
              /* Hide all elements with this class */
              .print-hide {
                display: none !important;
              }
              
              /* Hide the main app navigation and sidebar */
              nav, aside, .main-sidebar, .main-header {
                display: none !important;
              }

              /* Reset body and root for printing */
              body, #root {
                background-color: #fff !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              
              /* Force main content area to full width */
              main, .content-wrapper, .main-content {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }

              /* Force all text to black, remove shadows */
              * {
                color: #000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                border-color: #aaa !important; /* Make borders visible */
              }

              /* Show the print-only header */
              .print-header {
                display: block !important;
                text-align: center;
                margin-bottom: 2rem;
                border-bottom: 2px solid #000;
                padding-bottom: 1rem;
              }
              
              /* Force all our grids to stack vertically */
              .print-stack-vertical, .print-grid-stack {
                grid-template-columns: 1fr !important;
                display: block !important; /* Block is a stronger override */
              }
              
              .print-stack-vertical > div, .print-grid-stack > div {
                 width: 100% !important;
                 page-break-inside: avoid; /* Try to keep sections together */
                 margin-bottom: 1.5rem; /* Add spacing for print */
              }
              
              /* Specific overrides for stat cards */
              .bg-white.p-6.rounded-lg {
                page-break-inside: avoid;
                border: 1px solid #ccc !important;
              }

              /* Ensure charts are visible */
              .recharts-responsive-container {
                page-break-inside: avoid;
                width: 100% !important; /* Ensure full width */
              }
              .recharts-surface {
                overflow: visible !important;
              }
            }
          `}
        </style>
    </div>
  );
};

// Helper Components (Unchanged)
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
        } print-hide`}> {/* Hide growth % from print */}
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
                    : type === 'tour'
                      ? item.title || 'Untitled Tour'
                      : item.serviceName || 'Unknown Transport' 
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