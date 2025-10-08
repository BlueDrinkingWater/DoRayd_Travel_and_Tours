import express from 'express';
import { 
    register, 
    login, 
    getMe, 
    forgotPassword, 
    resetPassword, 
    changePassword,
    googleLogin,
    facebookLogin
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);

// Social Login Routes
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

// Routes for password reset
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Route for changing password
router.put('/change-password', auth, changePassword);

export default router;
