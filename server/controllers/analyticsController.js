// controllers/analyticsController.js

import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';

export const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));

    // --- 1. General Counts ---
    const [
      totalCars,
      totalTours,
      totalBookings,
      pendingBookings,
      completedBookings,
      newMessages,
      totalMessages,
      recentBookings,
      recentMessages
    ] = await Promise.all([
      Car.countDocuments({ archived: false }),
      Tour.countDocuments({ archived: false }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),
      Message.countDocuments({ status: 'new' }),
      Message.countDocuments(),
      Booking.find().sort({ createdAt: -1 }).limit(5).populate('user', 'firstName lastName'),
      Message.find().sort({ createdAt: -1 }).limit(5)
    ]);

    // --- 2. Revenue Calculations ---
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

    // --- 3. Revenue Trends ---
    // DAILY (Last 30 days)
    const dailyRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          Revenue: '$total'
        }
      }
    ]);

    // MONTHLY (Last 12 months)
    const monthlyRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: oneYearAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          name: {
            $concat: [
              { 
                $arrayElemAt: [
                  ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                  '$_id.month'
                ]
              },
              ' ',
              { $substr: [{ $toString: '$_id.year' }, 2, 2] }
            ]
          },
          Revenue: '$total'
        }
      }
    ]);

    // QUARTERLY
    const quarterlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } }
          },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.quarter': 1 } },
      {
        $project: {
          _id: 0,
          name: {
            $concat: [
              'Q',
              { $toString: '$_id.quarter' },
              ' ',
              { $toString: '$_id.year' }
            ]
          },
          Revenue: '$total'
        }
      }
    ]);

    // YEARLY
    const yearlyRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: { $year: '$createdAt' },
          total: { $sum: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          name: { $toString: '$_id' },
          Revenue: '$total'
        }
      }
    ]);

    // --- 4. Most Booked Items ---
    const getPopularItems = async (itemModel, collectionName) => {
      return Booking.aggregate([
        { 
          $match: { 
            itemModel: itemModel, 
            status: { $in: ['completed', 'confirmed'] } 
          } 
        },
        { 
          $group: { 
            _id: '$itemId', 
            bookingCount: { $sum: 1 } 
          } 
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: collectionName,
            localField: '_id',
            foreignField: '_id',
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
            bookingCount: '$bookingCount'
          }
        }
      ]);
    };

    const [popularCars, popularTours] = await Promise.all([
      getPopularItems('Car', 'cars'),
      getPopularItems('Tour', 'tours')
    ]);

    // --- 5. Prepare Response ---
    const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const avgRevenuePerBooking = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue,
          revenueGrowth: revenueGrowth.toFixed(2),
          totalBookings: completedBookings,
          avgRevenuePerBooking: avgRevenuePerBooking.toFixed(2),
          conversionRate: conversionRate.toFixed(2),
          totalCars,
          totalTours,
          pendingBookings,
          newMessages,
          totalMessages
        },
        revenueTrend: {
          daily: dailyRevenue,
          monthly: monthlyRevenue,
          quarterly: quarterlyRevenue,
          yearly: yearlyRevenue
        },
        popular: {
          cars: popularCars,
          tours: popularTours
        },
        recentBookings,
        recentMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};