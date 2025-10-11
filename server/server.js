// ✅ server.js

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';

// --- Route Imports ---
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import carRoutes from './routes/cars.js';
import contentRoutes from './routes/content.js';
import messageRoutes from './routes/messages.js';
import tourRoutes from './routes/tours.js';
import uploadRoutes from './routes/upload.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import feedbackRoutes from './routes/feedback.js';
import notificationRoutes from './routes/notification.js';
import activityLogRoutes from './routes/activityLog.js';
import faqRoutes from './routes/faq.js';
import promotionRoutes from './routes/promotions.js';

// --- Middleware Imports ---
import { errorHandler, notFound } from './middleware/errorHandler.js';

// --- Initial Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// --- Whitelist your frontend origins ---
const allowedOrigins = [
    'http://localhost:3000',       // Vite's default local host (HTTP)
    'https://localhost:3000',      // Vite's default local host (HTTPS)
    process.env.CLIENT_URL,        // Your Vercel URL from .env
    'https://accounts.google.com'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        console.warn(`⚠️ Socket CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// --- CORS CONFIG ---
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
        console.warn(`⚠️ Express CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true, // This is essential for cookies
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// --- Security Middleware ---
app.use(helmet());
app.use(cors(corsOptions)); // Apply CORS here
app.use(express.json());
app.use(cookieParser());
app.use(mongoSanitize());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

app.set('io', io);

// --- API ROUTES ---
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/promotions', promotionRoutes);

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket');
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User joined ${room} room`);
  });
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected');
  });
});

// --- ERROR HANDLING ---
app.use(notFound);
app.use(errorHandler);

// --- MONGODB CONNECTION ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

export default app;