import { v2 as cloudinary } from 'cloudinary';

// Generate a temporary URL for a Cloudinary image (authenticated or public).
export const getSecureImageUrl = async (req, res) => {
  try {
    const { public_id } = req.params;
    if (!public_id) {
      return res.status(400).json({ success: false, message: 'Image ID is required.' });
    }

    const decodedPublicId = decodeURIComponent(public_id);

    // Private roots in your app
    const privateRoots = ['dorayd/payment_proofs', 'dorayd/profiles', 'dorayd/attachments'];
    const isPrivateRoot = privateRoots.some((p) => decodedPublicId.startsWith(p));

    // Helper: try to find the resource under a given Cloudinary delivery type
    const getResource = async (type) => {
      return cloudinary.api.resource(decodedPublicId, { type, resource_type: 'image' });
    };

    let resource = null;
    let detectedType = null; // 'authenticated' | 'upload'

    // For private folders, prefer authenticated. Fall back to upload only if truly public (older data).
    if (isPrivateRoot) {
      try {
        resource = await getResource('authenticated');
        detectedType = 'authenticated';
      } catch {
        try {
          resource = await getResource('upload');
          detectedType = 'upload';
        } catch {
          resource = null;
        }
      }
    } else {
      // For non-private folders, prefer upload; if not, try authenticated
      try {
        resource = await getResource('upload');
        detectedType = 'upload';
      } catch {
        try {
          resource = await getResource('authenticated');
          detectedType = 'authenticated';
        } catch {
          resource = null;
        }
      }
    }

    if (!resource) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Image not found on Cloudinary. The file may have been deleted or the public_id is incorrect.',
      });
    }

    const version = resource.version;          // IMPORTANT: include version to avoid /v1/ 404s
    const accessMode = resource.access_mode;   // 'authenticated' or 'public'

    // Force authenticated delivery for private roots, even if the asset happens to be public,
    // so we never accidentally expose sensitive media.
    const deliveryType =
      isPrivateRoot ? 'authenticated' : accessMode === 'authenticated' ? 'authenticated' : 'upload';

    const urlOptions = {
      type: deliveryType,
      resource_type: 'image',
      secure: true,
      version, // ensures correct /v<version> path
    };

    if (deliveryType === 'authenticated') {
      urlOptions.sign_url = true;
      // Optional time-bound expiry:
      // urlOptions.expires_at = Math.round((Date.now() + 3600_000) / 1000);
    }

    const url = cloudinary.url(decodedPublicId, urlOptions);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Secure Image Retrieval Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to securely retrieve image.' });
  }
};