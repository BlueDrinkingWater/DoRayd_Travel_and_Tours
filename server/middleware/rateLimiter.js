import rateLimit from 'express-rate-limit';

// Stricter limiter for authentication routes
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per window
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// More lenient limiter for authenticated admin/employee actions
export const lenientLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1500, // Generous limit for high-traffic admin pages
    message: 'Too many requests, please try again shortly.'
});

// Default limiter for general API routes
export const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // High limit for general traffic
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});