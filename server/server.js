import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Security Middleware
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

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

// --- THIS IS THE CORRECTED LINE ---
// Error Handler - Changed to a named import
import { errorHandler } from './middleware/errorHandler.js';
import Booking from './models/Booking.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
      const whitelist = [
        'http://localhost:3000',
        process.env.CLIENT_URL,
      ].filter(Boolean);
      
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
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
}));

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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

// Error Handling Middleware
app.use(errorHandler);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      
      console.log('⏰ Starting background job to cancel expired bookings...');
      setInterval(async () => {
        try {
          const result = await Booking.updateMany(
            { 
              status: 'pending', 
              expiresAt: { $lt: new Date() } 
            },
            { 
              $set: { 
                status: 'cancelled', 
                adminNotes: 'Booking automatically cancelled due to expiration.' 
              } 
            }
          );
          if (result.modifiedCount > 0) {
            console.log(`🧹 Cancelled ${result.modifiedCount} expired bookings.`);
            io.to('admin').to('employee').emit('bookings-updated-by-system');
          }
        } catch (error) {
          console.error('❌ Error in expired bookings job:', error);
        }
      }, 60 * 1000);
    });
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

export default app;