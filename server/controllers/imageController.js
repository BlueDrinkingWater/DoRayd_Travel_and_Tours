import { v2 as cloudinary } from 'cloudinary';

export const getSecureImageUrl = async (req, res) => {
  try {
    const { public_id } = req.params;
    if (!public_id) {
      return res.status(400).json({ success: false, message: 'Image ID is required.' });
    }

    const decodedPublicId = decodeURIComponent(public_id);

    // Verify the resource exists
    let resource;
    try {
      resource = await cloudinary.api.resource(decodedPublicId, { 
        resource_type: 'image',
        type: 'upload'
      });
    } catch (error) {
      console.error('Resource lookup error:', error);
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Image not found on Cloudinary.',
      });
    }

    console.log('Found resource:', decodedPublicId);

    // Check if this is a sensitive image
    const sensitiveCategories = ['payment_proofs', 'profiles', 'attachments'];
    const isSensitive = sensitiveCategories.some(cat => decodedPublicId.includes(`dorayd/${cat}`));
    
    let url;
    
    if (isSensitive) {
      // ✅ Generate signed URL with 1-hour expiration for sensitive images
      const timestamp = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
      
      url = cloudinary.url(decodedPublicId, {
        type: 'upload',
        resource_type: 'image',
        secure: true,
        sign_url: true,
        expires_at: timestamp,
      });
      
      console.log('Generated signed URL with expiration:', new Date(timestamp * 1000).toISOString());
    } else {
      // Regular public URL for non-sensitive images (feedback, etc.)
      url = resource.secure_url;
      console.log('Generated public URL');
    }

    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Secure Image Retrieval Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to securely retrieve image.' });
  }
};