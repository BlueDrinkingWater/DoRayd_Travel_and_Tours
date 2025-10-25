import { useState, useEffect } from 'react';
import DataService from '../components/services/DataService.jsx';

/**
 * Hook to fetch a secure, authenticated URL for a private image path.
 * This is required for images stored with access_mode: 'authenticated'.
 * @param {string} serverPath - The Cloudinary URL/path stored in the database.
 * @returns {{secureUrl: string | null, loading: boolean}}
 */
export const useSecureImage = (serverPath) => {
  const [secureUrl, setSecureUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Define the paths that are known to be private.
  // These MUST match the folders in your server's imageController.js
  const privateIndicators = [
    'dorayd/payment_proofs', 
    'dorayd/profiles', 
    'dorayd/attachments'
  ];

  useEffect(() => {
    if (!serverPath || serverPath.length < 5) {
      setSecureUrl(null);
      return;
    }

    // Check if the path (even if it's a full URL) contains a private folder indicator.
    const isPrivate = privateIndicators.some(indicator => serverPath.includes(indicator));

    // If it's a full URL AND it's NOT private, then it's a public car/tour image. Use it directly.
    if ( (serverPath.startsWith('http://') || serverPath.startsWith('https://')) && !isPrivate ) {
      setSecureUrl(serverPath);
      return;
    }
    
    // If it IS private (e.g., a payment proof) OR it's a relative path, 
    // we must fetch a secure, signed URL from our backend.
    const fetchSecureUrl = async () => {
      setLoading(true);
      
      let publicId = null;

      // --- START: Robust public_id extractor ---
      // It finds the *first* matching private folder path and takes everything from there.
      for (const indicator of privateIndicators) {
          const index = serverPath.indexOf(indicator);
          if (index !== -1) {
              // Found it. The public_id is this string.
              publicId = serverPath.substring(index);
              break;
          }
      }
      
      // Fallback for paths that might not have the full prefix (e.g., old data)
      // but are still private. This is less reliable but better than failing.
      if (!publicId && isPrivate) {
         const doraydIndex = serverPath.indexOf('dorayd');
         if (doraydIndex !== -1) {
            publicId = serverPath.substring(doraydIndex);
         }
      }
      // --- END: Robust public_id extractor ---

      if (!publicId || publicId.length < 5) {
          // If we couldn't extract a valid publicId, show an error.
          setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Invalid+Path');
          setLoading(false);
          return;
      }

      try {
        // This DataService call will now send the raw publicId
        const response = await DataService.getSecureImageUrl(publicId);
        if (response.success && response.data.url) {
          setSecureUrl(response.data.url);
        } else {
          // The server failed to sign the URL (e.g., Auth error, 403)
          setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Auth+Error');
        }
      } catch (error) {
        // The API call itself failed (e.g., 500 error, network error)
        setSecureUrl('https://placehold.co/100x100/fecaca/991b1b?text=Server+Error');
      } finally {
        setLoading(false);
      }
    };

    fetchSecureUrl();
  }, [serverPath]); // Re-run effect if serverPath changes

  // We return the same object structure.
  return { secureUrl, loading };
};