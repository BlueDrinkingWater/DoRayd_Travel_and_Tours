import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Generate authentication signature for Cloudinary uploads
export const generateUploadSignature = (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = req.body.folder || 'general';
    
    // Determine if this folder contains sensitive images
    const sensitiveCategories = ['payment_proofs', 'profiles', 'attachments'];
    const isSensitive = sensitiveCategories.includes(folder);
    
    // Parameters to sign
    const paramsToSign = {
      timestamp: timestamp,
      folder: `dorayd/${folder}`,
    };
    
    // ✅ DON'T set access_mode to authenticated - use public with signed URLs instead
    // This allows images to be viewable in browsers while still being secure

    // Create the string to sign (sorted by key)
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');

    // Generate signature using SHA-1
    const signature = crypto
      .createHash('sha1')
      .update(sortedParams + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');

    console.log('Generated signature for folder:', folder, 'isSensitive:', isSensitive);

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: `dorayd/${folder}`,
        // Don't send access_mode
      }
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload signature.' });
  }
};