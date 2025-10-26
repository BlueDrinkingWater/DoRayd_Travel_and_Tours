export const getSecureImageUrl = async (req, res) => {
  try {
    const { public_id } = req.params;
    if (!public_id) {
      return res.status(400).json({ success: false, message: 'Image ID is required.' });
    }

    const decodedPublicId = decodeURIComponent(public_id);

    // Verify the resource exists
    try {
      await cloudinary.api.resource(decodedPublicId, { resource_type: 'image' });
    } catch {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Image not found on Cloudinary.',
      });
    }

    // Return the authenticated delivery URL
    // Since images were uploaded with access_mode: authenticated,
    // Cloudinary will require authentication headers to access them
    const url = cloudinary.url(decodedPublicId, {
      type: 'authenticated',
      resource_type: 'image',
      secure: true,
    });

    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Secure Image Retrieval Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to securely retrieve image.' });
  }
};