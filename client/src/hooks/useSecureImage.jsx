import { useState, useEffect } from 'react';
import DataService from '../components/services/DataService.jsx';

/**
 * Hook to fetch a secure, authenticated URL for a private image path.
 * @param {string} serverPath - The Cloudinary URL/path stored in the database (public_id or full URL).
 * @returns {{secureUrl: string | null, loading: boolean, error: string | null}}
 */
export const useSecureImage = (serverPath) => {
  const [secureUrl, setSecureUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const privateIndicators = [
    'dorayd/payment_proofs',
    'dorayd/profiles',
    'dorayd/attachments',
  ];

  useEffect(() => {
    if (!serverPath || serverPath.length < 5) {
      setSecureUrl(null);
      setError(null);
      return;
    }

    const isUrl = serverPath.startsWith('http://') || serverPath.startsWith('https://');
    const isPrivate = privateIndicators.some(indicator => serverPath.includes(indicator));

    // Public CDN or other plain URL: use as-is
    if (isUrl && !isPrivate) {
      setSecureUrl(serverPath);
      setError(null);
      return;
    }

    const fetchSecureUrl = async () => {
      setLoading(true);
      setError(null);

      // Extract Cloudinary public_id from either a full URL or a stored path
      let publicId = null;

      for (const indicator of privateIndicators) {
        const idx = serverPath.indexOf(indicator);
        if (idx !== -1) {
          publicId = serverPath.substring(idx);
          break;
        }
      }
      if (!publicId && isPrivate) {
        const dIdx = serverPath.indexOf('dorayd');
        if (dIdx !== -1) publicId = serverPath.substring(dIdx);
      }

      // --- START OF FIX ---
      // DO NOT remove the file extension. The server's imageController
      // needs the full public_id (e.g., ".../image.jpg") to find the resource
      // and generate a correct URL.
      /* if (publicId) {
        publicId = publicId.replace(/\.(jpg|jpeg|png|webp|gif|pdf)$/i, '');
      }
      */
      // --- END OF FIX ---

      // Debug
      console.log('useSecureImage - serverPath:', serverPath);
      console.log('useSecureImage - extracted publicId:', publicId);

      if (!publicId || publicId.length < 5) {
        setError('Invalid image path');
        setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Invalid+Path');
        setLoading(false);
        return;
      }

      try {
        const response = await DataService.getSecureImageUrl(publicId);
        console.log('useSecureImage - API response:', response);

        if (response.success && response.data?.url) {
          
          // Check if the path is an attachment (PDF/raw file).
          // We use publicId as it's the clean path.
          const isAttachment = publicId.startsWith('dorayd/attachments');

          if (isAttachment) {
            // It's a PDF/raw file. Skip the Image() preload check, as it will fail.
            // Trust the URL and set it directly for use in <a href> etc.
            setSecureUrl(response.data.url);
            setError(null);
            setLoading(false);
          } else {
            // It's an image. Proactively test the URL to avoid broken <img>
            const testImage = new Image();
            testImage.onload = () => {
              setSecureUrl(response.data.url);
              setError(null);
              setLoading(false);
            };
            testImage.onerror = () => {
              console.error('useSecureImage - Image does not exist on Cloudinary:', response.data.url);
              setError('Image not found on server');
              setSecureUrl('https://placehold.co/400x300/fecaca/991b1b?text=Image+Not+Found');
              setLoading(false);
            };
            testImage.src = response.data.url;
          }

        } else {
          setError(response.message || 'Authentication failed');
          setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Auth+Error');
          setLoading(false);
        }
      } catch (err) {
        console.error('useSecureImage - API call failed:', err);
        setError('Server error');
        setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Server+Error');
        setLoading(false);
      }
    };

    fetchSecureUrl();
  }, [serverPath]);

  return { secureUrl, loading, error };
};