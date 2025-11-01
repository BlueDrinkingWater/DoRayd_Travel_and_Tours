import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';
import RefundRequest from '../models/RefundRequest.js';
import ActivityLog from '../models/ActivityLog.js';
import Content from '../models/Content.js';
import FAQ from '../models/FAQ.js';
import Feedback from '../models/Feedback.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import Promotion from '../models/Promotion.js';
import Reviews from '../models/Reviews.js';
import TransportService from '../models/TransportService.js';

dotenv.config({ path: './.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for Seeding...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Car.deleteMany();
    await Tour.deleteMany();
    await Booking.deleteMany();
    await RefundRequest.deleteMany();
    await ActivityLog.deleteMany();
    await Content.deleteMany();
    await FAQ.deleteMany();
    await Feedback.deleteMany();
    await Message.deleteMany();
    await Notification.deleteMany();
    await Promotion.deleteMany();
    await Reviews.deleteMany();
    await TransportService.deleteMany();
    
    console.log('All Data Cleared...');

    // process.exit(); // <-- This line is now REMOVED/COMMENTED OUT so the script can continue.

    // Create Users
    const users = await User.create([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@dorayd.com',
        password: 'adminpassword',
        role: 'admin',
        isActive: true,
      },
      {
        firstName: 'John',
        lastName: 'Employee',
        email: 'employee@dorayd.com',
        password: 'employeepassword',
        role: 'employee',
        position: 'Booking Manager',
        isActive: true,
        permissions: { canManageBookings: true, canViewMessages: true }
      },
      {
        firstName: 'Jane',
        lastName: 'Customer',
        email: 'customer@dorayd.com',
        password: 'customerpassword',
        role: 'customer',
        isActive: true,
      },
    ]);
    
    console.log('Users Created...');

    // Create Cars
    await Car.create([
      {
        brand: 'Toyota', model: 'Vios', year: 2023, category: 'sedan', pricePerDay: 1500, seats: 5, location: 'Manila',
        description: 'A reliable and fuel-efficient sedan for city driving.', 
        images: ['https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456789/dorayd/cars/vios.jpg']
      },
      {
        brand: 'Mitsubishi', model: 'Montero Sport', year: 2024, category: 'suv', pricePerDay: 3000, seats: 7, location: 'Cebu',
        description: 'A rugged and spacious SUV for family adventures.', 
        images: ['https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456789/dorayd/cars/montero.jpg']
      },
    ]);
    
    console.log('Cars Created...');

    // Create Tours
    await Tour.create([
        {
            title: 'El Nido Island Hopping', destination: 'Palawan', price: 2500, duration: '1 Day', maxGroupSize: 12,
            description: 'Discover the pristine beaches and lagoons of El Nido.', 
            images: ['https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456789/dorayd/tours/elnido.jpg']
        },
        {
            title: 'Bohol Countryside Tour', destination: 'Bohol', price: 1800, duration: '1 Day', maxGroupSize: 10,
            description: 'See the Chocolate Hills and the cute Tarsiers.', 
            images: ['https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v123456789/dorayd/tours/bohol.jpg']
        },
    ]);

    console.log('Tours Created...');

    console.log('Database Seeded Successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1); // Exit with error code if seeding fails
  }
};

seedDatabase();