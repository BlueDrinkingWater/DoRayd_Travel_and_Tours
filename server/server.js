import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Security Middleware
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { defaultLimiter } from './middleware/rateLimiter.js'; // Import the default limiter

// Routes
import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import tourRoutes from './routes/tours.js';
import bookingRoutes from './routes/bookings.js';
import userRoutes from './routes/users.js';
import contentRoutes from './routes/content.js';
import uploadRoutes from './routes/upload.js';
import promotionRoutes from './routes/promotions.js';
import reviewRoutes from './routes/reviews.js';
import faqRoutes from './routes/faq.js';
import messageRoutes from './routes/messages.js';
import feedbackRoutes from './routes/feedback.js';
import notificationRoutes from './routes/notification.js';
import analyticsRoutes from './routes/analytics.js';
import activityLogRoutes from './routes/activityLog.js';
import imageRoutes from './routes/images.js';
import transportRoutes from './routes/transportRoutes.js'; // <-- IMPORT NEW ROUTES
import uploadSignatureRoutes from './routes/uploadSignatures.js';

// Error Handler
import { errorHandler } from './middleware/errorHandler.js';
import Booking from './models/Booking.js';
// *** ADDED: Import createNotification to be used in background job ***
import { createNotification } from './controllers/notificationController.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
      const whitelist = [
        'http://localhost:3000',
        'https://doraydtravelandtours.online',
        'https://www.doraydtravelandtours.online',
        process.env.CLIENT_URL,
      ].filter(Boolean);

      // Allow Vercel preview deployments
      if (origin && (/\.vercel\.app$/).test(origin)) {
        return callback(null, true);
      }

      if (whitelist.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
};

app.use(cors(corsOptions));

// Standard Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// Apply the default rate limiter to all requests
app.use(defaultLimiter);

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:3000"].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const isDbConnected = dbStatus === 1;

  res.status(200).json({
    success: true,
    server: 'running',
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/transport', transportRoutes); // <-- REGISTER NEW ROUTES
app.use('/api/upload-signatures', uploadSignatureRoutes);

// Error Handling Middleware
app.use(errorHandler);

// MongoDB Connection and Server Start
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // *** MODIFIED: Background job for expired bookings ***
      console.log('⏰ Starting background job to handle expired bookings...');
      setInterval(async () => {
        const now = new Date();
        try {
          // *** MODIFIED: Find pending bookings past expiration, confirmed downpayments past due, OR pending transport past admin confirmation ***
          const expiredBookings = await Booking.find({
            $or: [
              { status: 'pending', itemType: { $in: ['car', 'tour'] }, pendingExpiresAt: { $lt: now } },
              { status: 'confirmed', paymentOption: 'downpayment', paymentDueDate: { $lt: now } },
              { status: 'pending', itemType: 'transport', adminConfirmationDueDate: { $lt: now } }
            ]
          });

          if (expiredBookings.length > 0) {
            const idsToCancel = expiredBookings.map(b => b._id);
            const result = await Booking.updateMany(
              { _id: { $in: idsToCancel } },
              {
                $set: {
                  status: 'cancelled',
                  notes: {
                    note: 'Booking automatically cancelled due to expiration or missed payment deadline.',
                    author: null, // Indicates system action
                    date: new Date()
                  },
                  pendingExpiresAt: undefined, // Clear timers
                  paymentDueDate: undefined,
                  adminConfirmationDueDate: undefined // *** ADDED: Clear this timer too ***
                }
              }
            );

            if (result.modifiedCount > 0) {
              console.log(`🧹 Cancelled ${result.modifiedCount} expired/overdue bookings.`);
              // Notify admins/employees about the cancellation
              io.to('admin').to('employee').emit('bookings-updated-by-system', { cancelledCount: result.modifiedCount });

              for (const booking of expiredBookings) {
                 if (booking.user) {
                     // Determine the correct message for the user
                     let customerMessage = `Your booking ${booking.bookingReference} was automatically cancelled.`;
                     if (booking.adminConfirmationDueDate && booking.itemType === 'transport') {
                         customerMessage = `Your booking ${booking.bookingReference} was cancelled as it was not confirmed by an admin within the 24-hour window.`;
                     } else if (booking.paymentDueDate) {
                         customerMessage = `Your booking ${booking.bookingReference} was automatically cancelled due to a missed payment deadline.`;
                     } else if (booking.pendingExpiresAt) {
                         customerMessage = `Your booking ${booking.bookingReference} was automatically cancelled because the initial payment was not completed in time.`;
                     }
                     
                     // Use the createNotification function
                     try {
                         await createNotification(
                            io,
                            { user: booking.user },
                            customerMessage,
                            '/my-bookings'
                         );
                     } catch (notificationError) {
                         console.error('Failed to create auto-cancellation notification:', notificationError);
                     }
                     
                     // Optionally send email
                     // EmailService.sendBookingCancellation(booking, 'automatic cancellation').catch(console.error);
                 }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error in expired/overdue bookings job:', error);
        }
      }, 60 * 1000); // Run every minute
    });
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

export default app;