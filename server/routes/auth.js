import express from 'express';
import { 
    register, 
    login, 
    logout,
    getMe, 
    forgotPassword, 
    resetPassword, 
    changePassword,
    googleLogin,
    facebookLogin
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { body } from 'express-validator';

const router = express.Router();

router.post('/register',
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().escape(),
    body('lastName').trim().escape(),
    register
);

router.post('/login',
    body('email').isEmail().normalizeEmail(),
    body('password').not().isEmpty(),
    login
);

router.get('/logout', logout);

router.get('/me', auth, getMe);

// Social Login Routes
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

// Routes for password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Route for changing password
router.put('/change-password', auth, changePassword);

export default router;