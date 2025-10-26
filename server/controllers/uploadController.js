import { v2 as cloudinary } from 'cloudinary';

// Cloudinary is configured in the middleware, so we can just use it here.

export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // The 'multer-storage-cloudinary' middleware provides:
    // req.file.filename: The public_id WITHOUT extension (e.g., 'dorayd/payment_proofs/xyz')
    // req.file.path: The full URL (e.g., 'https://.../xyz.jpg')
    const publicId = req.file.filename;
    const url = req.file.path;

    // --- FIX: Get the extension from the URL and create the full public_id ---
    const extension = url.split('.').pop();
    const fullPublicId = `${publicId}.${extension}`;

    // Check if this is a sensitive upload that needs authenticated access
    // const sensitiveCategories = ['payment_proofs', 'profiles', 'attachments'];
    // const category = req.body.category || 'general';
    // const isSensitive = sensitiveCategories.includes(category);

    
    res.json({ 
      success: true, 
      message: 'Image uploaded successfully to Cloudinary', 
      data: { 
        url: url,
        id: fullPublicId, // --- FIX: Send the full ID (with extension) to the client
      } 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id) {
        return res.status(400).json({ success: false, message: 'Image ID is required.' });
    }
    
    // The public_id from the client will be URL encoded, especially if it contains slashes.
    // We decode it here to pass the correct path to Cloudinary.
    const decodedPublicId = decodeURIComponent(public_id);

    const result = await cloudinary.uploader.destroy(decodedPublicId);

    if (result.result === 'ok') {
        console.log('File deleted successfully from Cloudinary:', decodedPublicId);
        res.json({ success: true, message: 'Image deleted successfully from Cloudinary' });
    } else {
        // This can happen if the file doesn't exist. We'll treat it as a success on the client-side.
        console.warn('File not found on Cloudinary or could not be deleted:', decodedPublicId, result);
        res.status(200).json({ success: true, message: 'Image not found on server or already deleted.' });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ success: false, message: 'Server Error during image deletion.' });
  }
};