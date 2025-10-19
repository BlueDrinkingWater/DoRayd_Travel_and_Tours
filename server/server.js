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
import activityLogRoutes from './routes/activityLog.js';

// Error Handler
import { errorHandler } from './middleware/errorHandler.js';
import Booking from './models/Booking.js';

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

// --- ROBUST RATE LIMITING ---
// Apply to all requests to prevent abuse, but with a high limit.
// Specific routes can have stricter limits.
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // High limit for general traffic
    message: 'Too many requests from this IP, please try again after 15 minutes.'
}));

// Stricter limiter for authentication routes
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// More lenient limiter for authenticated admin/employee actions
export const lenientLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1500, // Generous limit for high-traffic admin pages
    message: 'Too many requests, please try again shortly.'
});
// --- END OF UPDATE ---

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

// API Routes - Pass the appropriate limiters to the route handlers
app.use('/api/auth', authRoutes); // We'll apply the strict limiter inside auth.js
app.use('/api/cars', carRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/bookings', bookingRoutes); // We'll apply the lenient limiter inside bookings.js
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
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'cancelled', adminNotes: 'Booking automatically cancelled due to expiration.' } }
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