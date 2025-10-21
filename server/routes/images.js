import express from 'express';
import { auth } from '../middleware/auth.js';
import { getSecureImageUrl } from '../controllers/imageController.js';

const router = express.Router();

// Route for securely getting the URL of private images (payment proofs, profiles, attachments)
// Authorization: Requires ANY logged-in user (auth middleware handles checking the token)
router.get('/secure/:public_id(*)', auth, getSecureImageUrl);

export default router;
