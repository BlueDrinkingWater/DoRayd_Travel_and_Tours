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
import { strictLimiter } from '../middleware/rateLimiter.js'; 

const router = express.Router();

router.post('/register',
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').trim().escape()
      .notEmpty().withMessage('First Name: number is not allowed.')
      .matches(/^[^0-9]*$/).withMessage('First Name: number is not allowed'),
    body('lastName').trim().escape()
      .notEmpty().withMessage('Last Name: number is not allowed.')
      .matches(/^[^0-9]*$/).withMessage('Last Name: number is not allowed'),
    register
);

router.post('/login', strictLimiter,
    body('email').isEmail().normalizeEmail(),
    body('password').not().isEmpty(),
    login
);

router.get('/logout', logout);

router.get('/me', auth, getMe);

router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

router.post('/forgot-password', strictLimiter, forgotPassword);
router.post('/reset-password/:token', strictLimiter, resetPassword);
router.put('/change-password', auth, changePassword);

export default router;