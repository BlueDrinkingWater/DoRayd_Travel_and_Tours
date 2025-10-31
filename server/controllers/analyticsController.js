import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import Message from '../models/Message.js';
import TransportService from '../models/TransportService.js'; 
import RefundRequest from '../models/RefundRequest.js'; 
import mongoose from 'mongoose';

const mergeChartData = (revenueData, refundData) => {
  const dataMap = new Map();

  revenueData.forEach(item => {
    dataMap.set(item.name, {
      ...item,
      Refunds: 0,
      Net: item.Revenue
    });
  });

  refundData.forEach(item => {
    const existing = dataMap.get(item.name);
    if (existing) {
      existing.Refunds = item.Refunds;
      existing.Net = existing.Revenue - item.Refunds;
    } else {
      dataMap.set(item.name, {
        name: item.name,
        Revenue: 0,
        Refunds: item.Refunds,
        Net: -item.Refunds
      });
    }
  });

  return Array.from(dataMap.values()).sort((a, b) => {
      if (a.name.includes('-') && b.name.includes('-')) {
        return new Date(a.name) - new Date(b.name);
      }
      
      if (a.name.length === 6 && a.name.includes(' ') && b.name.length === 6 && b.name.includes(' ')) {
        const aDate = new Date(a.name.replace(' ', ' 1, 20'));
        const bDate = new Date(b.name.replace(' ', ' 1, 20'));
        if (aDate.toString() !== 'Invalid Date' && bDate.toString() !== 'Invalid Date') {
          return aDate - bDate;
        }
      }
      
      return a.name.localeCompare(b.name);
  });
};


export const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    const [
      totalCars,
      totalTours,
      totalTransportServices,
      allBookings, 
      totalCancelled, 
      totalRejected, 
      totalApprovedRefundsCount, 
      totalTourBookings,
      totalTransportBookings,
      pendingBookings,
      completedBookings, 
      newMessages,
      totalMessages,
      recentBookings,
      recentMessages,
      totalRefundsAmountResult, 
      totalCancelledAmountResult,
      totalRejectedAmountResult
    ] = await Promise.all([

      Car.countDocuments({ archived: false }),
      Tour.countDocuments({ archived: false }),
      TransportService.countDocuments({ archived: false }), 

      Booking.countDocuments(), 
      Booking.countDocuments({ status: 'cancelled' }), 
      Booking.countDocuments({ status: 'rejected' }), 
      RefundRequest.countDocuments({ status: 'approved' }), 
      Booking.countDocuments({ itemType: 'tour' }), 
      Booking.countDocuments({ itemType: 'transport' }), 
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),

      Message.countDocuments({ status: 'new' }),
      Message.countDocuments(),

      Booking.find().sort({ createdAt: -1 }).limit(5).populate('user', 'firstName lastName'),
      Message.find().sort({ createdAt: -1 }).limit(5),

      RefundRequest.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$calculatedRefundAmount' } } } // <-- CORRECTED
      ]),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Booking.aggregate([
        { $match: { status: 'rejected' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ])
    ]);

    const totalRefundsAmount = totalRefundsAmountResult[0]?.total || 0;
    const totalCancelledAmount = totalCancelledAmountResult[0]?.total || 0;
    const totalRejectedAmount = totalRejectedAmountResult[0]?.total || 0;

    const completedBookingsData = await Booking.find({ status: 'completed' });
    
    let totalRevenue = 0; 
    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;

    completedBookingsData.forEach(booking => {
      const price = parseFloat(booking.totalPrice) || 0;
      totalRevenue += price;
      
      if (booking.createdAt >= firstDayOfCurrentMonth) {
        currentMonthRevenue += price;
      }
      
      if (booking.createdAt >= firstDayOfLastMonth && booking.createdAt < firstDayOfCurrentMonth) {
        lastMonthRevenue += price;
      }
    });

    const revenueGrowth = lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : currentMonthRevenue > 0 ? 100 : 0;
    
    const netRevenue = totalRevenue - totalRefundsAmount;

    const dailyRevenue = await Booking.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalPrice' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id', Revenue: '$total' } }
    ]);

    const monthlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: oneYearAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, total: { $sum: '$totalPrice' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, name: { $concat: [ { $arrayElemAt: [['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] }, ' ', { $substr: [{ $toString: '$_id.year' }, 2, 2] } ] }, Revenue: '$total' } }
    ]);

    const quarterlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { year: { $year: '$createdAt' }, quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } } }, total: { $sum: '$totalPrice' } } },
      { $sort: { '_id.year': 1, '_id.quarter': 1 } },
      { $project: { _id: 0, name: { $concat: [ 'Q', { $toString: '$_id.quarter' }, ' ', { $toString: '$_id.year' } ] }, Revenue: '$total' } }
    ]);

    const yearlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { $year: '$createdAt' }, total: { $sum: '$totalPrice' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: { $toString: '$_id' }, Revenue: '$total' } }
    ]);

    const dailyRefunds = await RefundRequest.aggregate([
      { $match: { status: 'approved', updatedAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, total: { $sum: '$calculatedRefundAmount' } } }, // <-- CORRECTED
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id', Refunds: '$total' } }
    ]);

    const monthlyRefunds = await RefundRequest.aggregate([
      { $match: { status: 'approved', updatedAt: { $gte: oneYearAgo } } },
      { $group: { _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } }, total: { $sum: '$calculatedRefundAmount' } } }, // <-- CORRECTED
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $project: { _id: 0, name: { $concat: [ { $arrayElemAt: [['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], '$_id.month'] }, ' ', { $substr: [{ $toString: '$_id.year' }, 2, 2] } ] }, Refunds: '$total' } }
    ]);

    const quarterlyRefunds = await RefundRequest.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { year: { $year: '$updatedAt' }, quarter: { $ceil: { $divide: [{ $month: '$updatedAt' }, 3] } } }, total: { $sum: '$calculatedRefundAmount' } } }, // <-- CORRECTED
      { $sort: { '_id.year': 1, '_id.quarter': 1 } },
      { $project: { _id: 0, name: { $concat: ['Q', { $toString: '$_id.quarter' }, ' ', { $toString: '$_id.year' }] }, Refunds: '$total' } }
    ]);

    const yearlyRefunds = await RefundRequest.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { $year: '$updatedAt' }, total: { $sum: '$calculatedRefundAmount' } } }, // <-- CORRECTED
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: { $toString: '$_id' }, Refunds: '$total' } }
    ]);

    const mergedDaily = mergeChartData(dailyRevenue, dailyRefunds);
    const mergedMonthly = mergeChartData(monthlyRevenue, monthlyRefunds);
    const mergedQuarterly = mergeChartData(quarterlyRevenue, quarterlyRefunds);
    const mergedYearly = mergeChartData(yearlyRevenue, yearlyRefunds);

    const getPopularItems = async (itemModel, collectionName) => {
      return Booking.aggregate([
        { $match: { itemModel: itemModel, status: { $in: ['completed', 'confirmed'] } } },
        { $group: { _id: '$itemId', bookingCount: { $sum: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: collectionName,
            localField: '_id',
            foreignField: '_id',
            pipeline: [ { $match: { archived: false } } ],
            as: 'itemDetails'
          }
        },
        { $unwind: '$itemDetails' },
        {
          $project: {
            _id: '$itemDetails._id',
            brand: '$itemDetails.brand', 
            model: '$itemDetails.model', 
            title: '$itemDetails.title', 
            serviceName: '$itemDetails.serviceName', 
            bookingCount: '$bookingCount'
          }
        }
      ]);
    };

    const [popularCars, popularTours, popularTransport] = await Promise.all([
      getPopularItems('Car', 'cars'),
      getPopularItems('Tour', 'tours'),
      getPopularItems('TransportService', 'transportservices') 
    ]);

    // --- 7. Prepare Response ---
    const conversionRate = allBookings > 0 ? (completedBookings / allBookings) * 100 : 0;
    const avgRevenuePerBooking = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue, 
          netRevenue: netRevenue, 
          totalRefundsAmount: totalRefundsAmount, 
          revenueGrowth: revenueGrowth.toFixed(2),
          totalBookings: completedBookings,
          avgRevenuePerBooking: avgRevenuePerBooking.toFixed(2),
          conversionRate: conversionRate.toFixed(2),
          totalCars,
          totalTours,
          pendingBookings,
          newMessages,
          totalMessages,
          totalTransportServices,
          allBookings,
          totalCancelled: totalCancelled, 
          totalRejected: totalRejected, 
          totalRefunds: totalApprovedRefundsCount, 
          totalCancelledAmount: totalCancelledAmount, 
          totalRejectedAmount: totalRejectedAmount, 
          totalTourBookings,
          totalTransportBookings
        },
        revenueTrend: {
          daily: mergedDaily,
          monthly: mergedMonthly,
          quarterly: mergedQuarterly,
          yearly: mergedYearly
        },
        popular: {
          cars: popularCars,
          tours: popularTours, 
          transport: popularTransport 
        },
        recentBookings,
        recentMessages
      }
    });
  } catch (error) {
    console.error('Error in getDashboardAnalytics:', error); 
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};