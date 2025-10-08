// ✅ server.js (API-Only for Render)

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

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

// --- Middleware Imports ---
import { errorHandler, notFound } from './middleware/errorHandler.js';

// --- Initial Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Allow localhost and all Vercel domains
      if (origin.includes('localhost') || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
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
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and all Vercel domains
    if (origin.includes('localhost') || origin.endsWith('.vercel.app') || origin === 'https://accounts.google.com') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.set('io', io);

// --- ROOT ENDPOINT ---
app.get('/', (req, res) => {
  res.send('DoRayd Travel and Tours API is running...');
});

// --- API ROUTES ---
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

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// --- STATIC UPLOADS ---
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket');
  socket.on('join', (role) => {
    socket.join(role);
    console.log(`User joined ${role} room`);
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