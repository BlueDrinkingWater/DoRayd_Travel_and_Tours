import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Generate authentication signature for Cloudinary uploads
export const generateUploadSignature = (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = req.body.folder || 'general';
    
    // Parameters to sign
    const paramsToSign = {
      timestamp: timestamp,
      folder: `dorayd/${folder}`,
    };

    // Create the string to sign (sorted by key)
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');

    // Generate signature using API secret
    const signature = crypto
      .createHmac('sha256', process.env.CLOUDINARY_API_SECRET)
      .update(sortedParams)
      .digest('hex');

    res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder: `dorayd/${folder}`,
      }
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload signature.' });
  }
};