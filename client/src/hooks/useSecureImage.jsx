import { useState, useEffect } from 'react';
import DataService from '../components/services/DataService.jsx';

/**
 * Hook to fetch a secure, authenticated URL for a private image path.
 * This is required for images stored with access_mode: 'authenticated'.
 * @param {string} serverPath - The Cloudinary URL/path stored in the database (e.g., dorayd/profiles/xyz).
 * @returns {{secureUrl: string | null, loading: boolean}}
 */
export const useSecureImage = (serverPath) => {
  const [secureUrl, setSecureUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serverPath || serverPath.length < 5) {
      setSecureUrl(null);
      return;
    }

    // Check if the path is already a full public URL (e.g., car/tour images, or external)
    if (serverPath.startsWith('http://') || serverPath.startsWith('https://')) {
      // If it looks like a full URL, we assume it's publicly accessible and just use it.
      // This is necessary because public car/tour images use direct Cloudinary URLs.
      setSecureUrl(serverPath);
      return;
    }
    
    // If it is NOT a full URL, it must be the public_id of a potentially private image
    const fetchSecureUrl = async () => {
      setLoading(true);
      
      // The public_id is everything after 'v' or the folder name.
      // We assume the stored path is the public_id, e.g., 'dorayd/profiles/xyz-123'
      const publicId = serverPath.split('/').slice(serverPath.split('/').indexOf('dorayd')).join('/');

      if (!publicId || publicId.length < 5) {
          setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Invalid');
          setLoading(false);
          return;
      }

      try {
        const response = await DataService.getSecureImageUrl(publicId);
        if (response.success && response.data.url) {
          setSecureUrl(response.data.url);
        } else {
          // Fallback to a clear placeholder on authentication/authorization failure
          setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Auth+Error');
        }
      } catch (error) {
        setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Auth+Error');
      } finally {
        setLoading(false);
      }
    };

    fetchSecureUrl();
  }, [serverPath]);

  return { secureUrl, loading };
};
